import { env } from '@/server/config/env';
import { ApiError, IntegrationNotConfiguredError } from '@/server/http/errors';

import type { Adapter } from './types';

/**
 * IA: 15. External Services > Communications > Postmark.
 *
 * Postmark carries transactional mail -- booking confirmations, reminders, OTP
 * and password messages -- where deliverability matters more than volume
 * pricing. Bulk and fallback go to SES; see ./amazon-ses.
 */
export interface EmailMessage {
  to: string;
  subject: string;
  htmlBody?: string;
  textBody?: string;
  /** Prefer a template over inline HTML so copy changes need no deploy. */
  templateAlias?: string;
  templateModel?: Record<string, unknown>;
  replyTo?: string;
  /**
   * Postmark stream: booking, reminder, billing, security. Keeps the bounce
   * reputation of reminders from poisoning password resets.
   */
  messageStream?: string;
  tag?: string;
}

export interface PostmarkAdapter extends Adapter {
  send(message: EmailMessage): Promise<{ messageId: string }>;
  sendBatch(
    messages: EmailMessage[],
  ): Promise<Array<{ messageId: string | null; to: string; error?: string }>>;
  verifyWebhookSignature(input: { rawBody: string; signature: string }): boolean;
}

const API = 'https://api.postmarkapp.com';

export const postmark: PostmarkAdapter = {
  vendor: 'postmark',
  meter: 'email',

  isConfigured() {
    return Boolean(env.POSTMARK_SERVER_TOKEN && env.POSTMARK_FROM_EMAIL);
  },

  async send(message) {
    if (!this.isConfigured()) throw new IntegrationNotConfiguredError('Postmark');

    const useTemplate = Boolean(message.templateAlias);
    const payload: Record<string, unknown> = {
      From: env.POSTMARK_FROM_EMAIL,
      To: message.to,
      MessageStream: message.messageStream ?? 'outbound',
    };
    if (message.tag) payload.Tag = message.tag;
    if (message.replyTo) payload.ReplyTo = message.replyTo;

    if (useTemplate) {
      payload.TemplateAlias = message.templateAlias;
      payload.TemplateModel = message.templateModel ?? {};
    } else {
      payload.Subject = message.subject;
      if (message.htmlBody) payload.HtmlBody = message.htmlBody;
      if (message.textBody) payload.TextBody = message.textBody;
    }

    const response = await fetch(`${API}/${useTemplate ? 'email/withTemplate' : 'email'}`, {
      method: 'POST',
      headers: {
        'X-Postmark-Server-Token': env.POSTMARK_SERVER_TOKEN!,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new ApiError('INTEGRATION_UNAVAILABLE', 'The email could not be sent.', {
        cause: `Postmark ${response.status}: ${detail.slice(0, 300)}`,
      });
    }

    const json = (await response.json()) as { MessageID?: string };
    return { messageId: json.MessageID ?? '' };
  },

  async sendBatch(messages) {
    if (!this.isConfigured()) throw new IntegrationNotConfiguredError('Postmark');
    // Postmark has a true batch endpoint; sequential is fine until volume says otherwise.
    const results: Array<{ messageId: string | null; to: string; error?: string }> = [];
    for (const message of messages) {
      try {
        const { messageId } = await this.send(message);
        results.push({ messageId, to: message.to });
      } catch (error) {
        results.push({ messageId: null, to: message.to, error: (error as Error).message });
      }
    }
    return results;
  },

  verifyWebhookSignature() {
    throw new Error('postmark.verifyWebhookSignature is not implemented yet.');
  },
};
