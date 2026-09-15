/**
 * admin/approvals
 *
 * Generated shape: validate, delegate, respond. All behaviour lives in the
 * module service so it can be unit-tested without an HTTP layer.
 */
import { defineRoute } from '@/server/http/handler';
import { ok } from '@/server/http/response';
import { adminService } from '@/server/modules/admin/admin.service';

export const GET = defineRoute({
  access: 'internal',
  handler: async ({ tx, ctx, query }) =>
    ok(await adminService.listApprovals(tx, ctx, query)),
});
