import { env } from '@/server/config/env';
import { ApiError, IntegrationNotConfiguredError } from '@/server/http/errors';

import type { Adapter } from './types';

/**
 * IA: 15. External Services > Communications > Telnyx, and
 *     15. External Services > Verification > Telnyx Number Lookup.
 *
 * Two distinct jobs. Sending SMS covers reminders and OTP. Number lookup runs
 * at onboarding: a VoIP line presented as a practice mobile is a signal worth
 * putting in front of a reviewer, not a reason to auto-reject.
 */
export interface NumberLookupResult {
  phoneNumber: string;
  valid: boolean;
  /** mobile | landline | voip | toll_free | unknown */
  lineType: string;
  carrierName: string | null;
  countryCode: string | null;
  isPortable: boolean;
}

export interface TelnyxAdapter extends Adapter {
  sendSms(input: {
    to: string;
    body: string;
    /** Carried into the request so a retried send can be traced to one intent. */
    idempotencyKey: string;
  }): Promise<{ messageId: string }>;

  lookupNumber(phoneNumber: string): Promise<NumberLookupResult>;

  verifyWebhookSignature(input: {
    rawBody: string;
    signature: string;
    timestamp: string;
  }): boolean;
}

const API = 'https://api.telnyx.com/v2';

export const telnyx: TelnyxAdapter = {
  vendor: 'telnyx',
  meter: 'sms',

  isConfigured() {
    return Boolean(env.TELNYX_API_KEY && env.TELNYX_FROM_NUMBER);
  },

  async sendSms({ to, body, idempotencyKey }) {
    if (!this.isConfigured()) throw new IntegrationNotConfiguredError('Telnyx');

    const payload: Record<string, string> = {
      from: env.TELNYX_FROM_NUMBER!,
      to,
      text: body,
    };
    if (env.TELNYX_MESSAGING_PROFILE_ID) {
      payload.messaging_profile_id = env.TELNYX_MESSAGING_PROFILE_ID;
    }

    const response = await fetch(`${API}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.TELNYX_API_KEY}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new ApiError('INTEGRATION_UNAVAILABLE', 'The text message could not be sent.', {
        cause: `Telnyx ${response.status}: ${detail.slice(0, 300)}`,
      });
    }

    const json = (await response.json()) as { data?: { id?: string } };
    return { messageId: json.data?.id ?? '' };
  },

  async lookupNumber() {
    if (!this.isConfigured()) throw new IntegrationNotConfiguredError('Telnyx');
    throw new Error('telnyx.lookupNumber is not implemented yet.');
  },

  verifyWebhookSignature() {
    // Ed25519 over `${timestamp}|${rawBody}` using TELNYX_WEBHOOK_PUBLIC_KEY,
    // with a timestamp freshness window to stop replays.
    throw new Error('telnyx.verifyWebhookSignature is not implemented yet.');
  },
};
