/**
 * settings/roles
 *
 * Generated shape: validate, delegate, respond. All behaviour lives in the
 * module service so it can be unit-tested without an HTTP layer.
 */
import { defineRoute } from '@/server/http/handler';
import { ok } from '@/server/http/response';
import { settingsService } from '@/server/modules/settings/settings.service';

/** IA: 12. Settings > Roles */
export const GET = defineRoute({
  access: 'user',
  permissions: ['staff.read'],
  handler: async ({ tx, ctx }) =>
    ok(await settingsService.listRoles(tx, ctx)),
});

export const POST = defineRoute({
  access: 'user',
  permissions: ['roles.manage'],
  handler: async ({ tx, ctx, body }) =>
    ok(await settingsService.createRole(tx, ctx, body)),
});
