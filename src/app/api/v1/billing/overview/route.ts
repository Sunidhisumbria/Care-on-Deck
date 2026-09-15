/**
 * billing/overview
 *
 * Generated shape: validate, delegate, respond. All behaviour lives in the
 * module service so it can be unit-tested without an HTTP layer.
 */
import { defineRoute } from '@/server/http/handler';
import { ok } from '@/server/http/response';
import { billingService } from '@/server/modules/billing/billing.service';

/** IA: 10. Billing > Billing Overview */
export const GET = defineRoute({
  access: 'user',
  permissions: ['billing.read'],
  handler: async ({ tx, ctx }) =>
    ok(await billingService.getOverview(tx, ctx)),
});
