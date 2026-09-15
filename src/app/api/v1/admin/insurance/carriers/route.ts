/**
 * admin/insurance/carriers
 *
 * Generated shape: validate, delegate, respond. All behaviour lives in the
 * module service so it can be unit-tested without an HTTP layer.
 */
import { defineRoute } from '@/server/http/handler';
import { ok } from '@/server/http/response';
import { adminService } from '@/server/modules/admin/admin.service';

/** IA: 14. Insurance Directory > Carriers */
export const GET = defineRoute({
  access: 'internal',
  handler: async ({ tx, ctx, query }) =>
    ok(await adminService.listCarriers(tx, ctx, query)),
});

export const POST = defineRoute({
  access: 'internal',
  handler: async ({ tx, ctx, body }) =>
    ok(await adminService.createCarrier(tx, ctx, body)),
});
