/**
 * Inbound webhooks from Stripe, Telnyx and Postmark.
 *
 * Three rules, and all three exist because a webhook endpoint is the one part
 * of the API an attacker can call directly and a vendor will retry forever:
 *
 *  1. Verify the signature over the RAW body before anything else. Parsing
 *     first and verifying after defeats the signature.
 *  2. Persist to `webhook_events` keyed on the vendor's own event id, then
 *     return 200. A duplicate delivery becomes a no-op rather than a second
 *     charge or a second confirmation SMS.
 *  3. Do the work out of band. A slow handler looks like a failure to the
 *     vendor, which retries, which makes it slower.
 *
 * IA: 15. External Services
 */
import { notImplemented } from '@/server/http/response';

export type WebhookVendor = 'stripe' | 'telnyx' | 'postmark';

export interface WebhookResult {
  accepted: boolean;
  status: number;
}

export const webhookService = {
  /**
   * Verifies, deduplicates and stores one delivery. Returns quickly; the event
   * is processed by `process`.
   */
  async receive(
    vendor: WebhookVendor,
    rawBody: string,
    headers: Headers,
  ): Promise<WebhookResult> {
    return notImplemented(`webhookService.receive(${vendor})`);
  },

  /**
   * Applies a stored event to our tables.
   *
   * Stripe   -- subscription and invoice state, payment failures, checkout
   *             completion. This is what actually writes `subscriptions`.
   * Telnyx   -- SMS delivery receipts, and STOP replies which add the number
   *             to the suppression list.
   * Postmark -- bounces and spam complaints, likewise suppression.
   */
  async process(webhookEventId: string): Promise<void> {
    return notImplemented('webhookService.process');
  },
};
