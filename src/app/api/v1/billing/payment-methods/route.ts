/**
 * billing/payment-methods
 *
 * Generated shape: validate, delegate, respond. All behaviour lives in the
 * module service so it can be unit-tested without an HTTP layer.
 */
import { defineRoute } from '@/server/http/handler';
import { ok } from '@/server/http/response';
import { billingService } from '@/server/modules/billing/billing.service';

/** IA: 10. Billing > Payment Method */
export const GET = defineRoute({
  access: 'user',
  permissions: ['billing.read'],
  handler: async ({ tx, ctx }) =>
    ok(await billingService.listPaymentMethods(tx, ctx)),
});

export const POST = defineRoute({
  access: 'user',
  permissions: ['billing.manage'],
  handler: async ({ tx, ctx }) =>
    ok(await billingService.startPortalSession(tx, ctx)),
});
