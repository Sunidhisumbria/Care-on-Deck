
import { defineRoute } from '@/server/http/handler';
import { ok } from '@/server/http/response';
import { adminService } from '@/server/modules/admin/admin.service';

/** Approve, reject, or return with requested changes. */
export const POST = defineRoute<{ id: string }>({
  access: 'internal',
  handler: async ({ tx, ctx, body, params }) =>
    ok(await adminService.decideApproval(tx, ctx, params.id, body)),
});
