/**
 * admin/users/[id]/status
 *
 * Generated shape: validate, delegate, respond. All behaviour lives in the
 * module service so it can be unit-tested without an HTTP layer.
 */
import { defineRoute } from '@/server/http/handler';
import { ok } from '@/server/http/response';
import { adminService } from '@/server/modules/admin/admin.service';

/** IA: 14. Account Status > Active, Suspended, Deactivated, ... */
export const POST = defineRoute<{ id: string }>({
  access: 'internal',
  handler: async ({ tx, ctx, body, params }) =>
    ok(await adminService.setAccountStatus(tx, ctx, params.id, body)),
});
