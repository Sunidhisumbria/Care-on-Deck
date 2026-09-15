/**
 * admin/transfers
 *
 * Generated shape: validate, delegate, respond. All behaviour lives in the
 * module service so it can be unit-tested without an HTTP layer.
 */
import { defineRoute } from '@/server/http/handler';
import { ok } from '@/server/http/response';
import { adminService } from '@/server/modules/admin/admin.service';

/** IA: 14. Provider Transfer */
export const GET = defineRoute({
  access: 'internal',
  handler: async ({ tx, ctx, query }) =>
    ok(await adminService.listTransfers(tx, ctx, query)),
});

export const POST = defineRoute({
  access: 'internal',
  handler: async ({ tx, ctx, body }) =>
    ok(await adminService.createTransfer(tx, ctx, body)),
});
