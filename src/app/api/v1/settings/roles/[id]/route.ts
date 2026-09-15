/**
 * settings/roles/[id]
 *
 * Generated shape: validate, delegate, respond. All behaviour lives in the
 * module service so it can be unit-tested without an HTTP layer.
 */
import { defineRoute } from '@/server/http/handler';
import { ok } from '@/server/http/response';
import { settingsService } from '@/server/modules/settings/settings.service';

/** IA: 12. Settings > Permission Matrix */
export const PATCH = defineRoute<{ id: string }>({
  access: 'user',
  permissions: ['roles.manage'],
  handler: async ({ tx, ctx, body, params }) =>
    ok(await settingsService.updateRole(tx, ctx, params.id, body)),
});
