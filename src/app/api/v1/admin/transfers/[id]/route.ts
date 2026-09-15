/**
 * admin/transfers/[id]
 *
 * Generated shape: validate, delegate, respond. All behaviour lives in the
 * module service so it can be unit-tested without an HTTP layer.
 */
import { defineRoute } from '@/server/http/handler';
import { ok } from '@/server/http/response';
import { adminService } from '@/server/modules/admin/admin.service';

/** IA: 14. Provider Transfer > Early Release, Waiting Period, Complete Transfer */
export const PATCH = defineRoute<{ id: string }>({
  access: 'internal',
  handler: async ({ tx, ctx, body, params }) =>
    ok(await adminService.updateTransfer(tx, ctx, params.id, body)),
});
