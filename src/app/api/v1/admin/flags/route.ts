/**
 * admin/flags
 *
 * Generated shape: validate, delegate, respond. All behaviour lives in the
 * module service so it can be unit-tested without an HTTP layer.
 */
import { defineRoute } from '@/server/http/handler';
import { ok } from '@/server/http/response';
import { adminService } from '@/server/modules/admin/admin.service';

/** IA: 14. Feature Flags */
export const GET = defineRoute({
  access: 'internal',
  handler: async ({ tx, ctx }) =>
    ok(await adminService.listFeatureFlags(tx, ctx)),
});

export const POST = defineRoute({
  access: 'internal',
  handler: async ({ tx, ctx, body }) =>
    ok(await adminService.setFeatureFlag(tx, ctx, body)),
});
