/**
 * billing/credits
 *
 * Generated shape: validate, delegate, respond. All behaviour lives in the
 * module service so it can be unit-tested without an HTTP layer.
 */
import { defineRoute } from '@/server/http/handler';
import { ok } from '@/server/http/response';
import { billingService } from '@/server/modules/billing/billing.service';

/** IA: 10. Billing > Credits */
export const GET = defineRoute({
  access: 'user',
  permissions: ['billing.read'],
  handler: async ({ tx, ctx, query }) =>
    ok(await billingService.getCredits(tx, ctx, query)),
});
