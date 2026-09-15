/**
 * billing/plans
 *
 * Generated shape: validate, delegate, respond. All behaviour lives in the
 * module service so it can be unit-tested without an HTTP layer.
 */
import { defineRoute } from '@/server/http/handler';
import { ok } from '@/server/http/response';
import { billingService } from '@/server/modules/billing/billing.service';

/** IA: 10. Billing > Plans, Monthly Annual Toggle */
export const GET = defineRoute({
  access: 'optional',
  handler: async ({ tx, query }) =>
    ok(await billingService.listPlans(tx, query)),
});
