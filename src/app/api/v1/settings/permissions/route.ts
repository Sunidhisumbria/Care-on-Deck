/**
 * settings/permissions
 *
 * Generated shape: validate, delegate, respond. All behaviour lives in the
 * module service so it can be unit-tested without an HTTP layer.
 */
import { defineRoute } from '@/server/http/handler';
import { ok } from '@/server/http/response';
import { settingsService } from '@/server/modules/settings/settings.service';

/** The permission catalogue behind the matrix UI. */
export const GET = defineRoute({
  access: 'user',
  permissions: ['staff.read'],
  handler: async ({ tx, ctx }) =>
    ok(await settingsService.listPermissions(tx, ctx)),
});
