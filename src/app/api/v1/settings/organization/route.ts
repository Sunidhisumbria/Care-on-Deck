/**
 * settings/organization
 *
 * Generated shape: validate, delegate, respond. All behaviour lives in the
 * module service so it can be unit-tested without an HTTP layer.
 */
import { defineRoute } from '@/server/http/handler';
import { ok } from '@/server/http/response';
import { settingsService } from '@/server/modules/settings/settings.service';

/** IA: 12. Settings > Organization Settings */
export const GET = defineRoute({
  access: 'user',
  permissions: ['settings.read'],
  handler: async ({ tx, ctx }) =>
    ok(await settingsService.getOrganization(tx, ctx)),
});

export const PATCH = defineRoute({
  access: 'user',
  permissions: ['settings.manage'],
  handler: async ({ tx, ctx, body }) =>
    ok(await settingsService.updateOrganization(tx, ctx, body)),
});
