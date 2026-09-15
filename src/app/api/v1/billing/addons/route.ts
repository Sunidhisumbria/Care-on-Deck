/**
 * billing/addons
 *
 * Generated shape: validate, delegate, respond. All behaviour lives in the
 * module service so it can be unit-tested without an HTTP layer.
 */
import { defineRoute } from '@/server/http/handler';
import { ok } from '@/server/http/response';
import { billingService } from '@/server/modules/billing/billing.service';

/** IA: 10. Billing > Add-ons, Bundles */
export const GET = defineRoute({
  access: 'user',
  permissions: ['billing.read'],
  handler: async ({ tx, ctx }) =>
    ok(await billingService.listAddons(tx, ctx)),
});

/** IA: 10. Add-ons > Buy Once / Auto-Replenish */
export const POST = defineRoute({
  access: 'user',
  permissions: ['billing.manage'],
  handler: async ({ tx, ctx, body }) =>
    ok(await billingService.purchaseAddon(tx, ctx, body)),
});
