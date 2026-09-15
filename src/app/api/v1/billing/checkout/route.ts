/**
 * billing/checkout
 *
 * Generated shape: validate, delegate, respond. All behaviour lives in the
 * module service so it can be unit-tested without an HTTP layer.
 */
import { defineRoute } from '@/server/http/handler';
import { ok } from '@/server/http/response';
import { billingService } from '@/server/modules/billing/billing.service';

/** Returns a Stripe Checkout URL; the subscription lands via webhook. */
export const POST = defineRoute({
  access: 'user',
  permissions: ['billing.manage'],
  handler: async ({ tx, ctx, body }) =>
    ok(await billingService.startCheckout(tx, ctx, body)),
});
