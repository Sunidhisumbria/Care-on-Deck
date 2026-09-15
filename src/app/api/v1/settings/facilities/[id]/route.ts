/**
 * settings/facilities/[id]
 *
 * Generated shape: validate, delegate, respond. All behaviour lives in the
 * module service so it can be unit-tested without an HTTP layer.
 */
import { defineRoute } from '@/server/http/handler';
import { ok } from '@/server/http/response';
import { settingsService } from '@/server/modules/settings/settings.service';

/** IA: 12. Settings > Facility Settings */
export const GET = defineRoute<{ id: string }>({
  access: 'user',
  permissions: ['settings.read'],
  handler: async ({ tx, ctx, params }) =>
    ok(await settingsService.getFacility(tx, ctx, params.id)),
});

export const PATCH = defineRoute<{ id: string }>({
  access: 'user',
  permissions: ['settings.manage'],
  handler: async ({ tx, ctx, body, params }) =>
    ok(await settingsService.updateFacility(tx, ctx, params.id, body)),
});
