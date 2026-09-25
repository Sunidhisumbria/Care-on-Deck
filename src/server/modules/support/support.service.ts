/**
 * Contact Us. The message is stored first, then forwarded to the support
 * inbox when one is configured. Forwarding is best effort: a mail outage must
 * not lose a message the person has already written, so a failed send is
 * logged and the stored copy stands.
 *
 * IA: 11. Notifications > Support Replies
 */
import type { ContactValues } from '@/lib/support';
import type { RequestContext } from '@/server/auth/context';
import { env } from '@/server/config/env';
import { supportRequests } from '@/server/db/schema/notifications';
import type { Tx } from '@/server/db/tenant';
import { ApiError } from '@/server/http/errors';
import { consumeRateLimit } from '@/server/http/ratelimit';
import { postmark } from '@/server/integrations';
import { recordAudit } from '@/server/observability/audit';
import { logger } from '@/server/observability/logger';

/** Enough for a real conversation, not enough to flood the inbox. */
const PER_HOUR = { limit: 5, windowSeconds: 60 * 60 };

export const supportService = {
  async contact(tx: Tx, ctx: RequestContext, input: ContactValues): Promise<{ id: string; forwarded: boolean }> {
    const userId = ctx.session?.userId;
    if (!userId) throw ApiError.unauthenticated();
    await consumeRateLimit(`support:contact:${userId}`, PER_HOUR, 'You have sent several messages recently. Please wait a while before sending another.');

    const [row] = await tx
      .insert(supportRequests)
      .values({
        userId,
        name: input.name.replace(/\s+/g, ' '),
        email: input.email.toLowerCase(),
        subject: input.subject,
        message: input.message,
      })
      .returning({ id: supportRequests.id });
    if (!row) throw ApiError.internal('Could not send your message.');

    await recordAudit(tx, ctx, { action: 'support.contacted', resourceType: 'support_request', resourceId: row.id });

    let forwarded = false;
    if (env.SUPPORT_EMAIL && postmark.isConfigured()) {
      try {
        await postmark.send({
          to: env.SUPPORT_EMAIL,
          replyTo: input.email,
          subject: `[Contact Us] ${input.subject}`,
          textBody: `From: ${input.name} <${input.email}>\nAccount: ${userId}\nReference: ${row.id}\n\n${input.message}`,
          tag: 'contact-us',
        });
        forwarded = true;
      } catch (error) {
        logger.warn({ err: error, supportRequestId: row.id }, 'contact message stored but not emailed');
      }
    }

    return { id: row.id, forwarded };
  },
};
