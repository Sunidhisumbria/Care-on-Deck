/**
 * settings/staff/[id]
 *
 * Generated shape: validate, delegate, respond. All behaviour lives in the
 * module service so it can be unit-tested without an HTTP layer.
 */
import { defineRoute } from '@/server/http/handler';
import { ok } from '@/server/http/response';
import { settingsService } from '@/server/modules/settings/settings.service';

export const PATCH = defineRoute<{ id: string }>({
  access: 'user',
  permissions: ['staff.manage'],
  handler: async ({ tx, ctx, body, params }) =>
    ok(await settingsService.updateStaff(tx, ctx, params.id, body)),
});

export const DELETE = defineRoute<{ id: string }>({
  access: 'user',
  permissions: ['staff.manage'],
  handler: async ({ tx, ctx, params }) =>
    ok(await settingsService.removeStaff(tx, ctx, params.id)),
});
