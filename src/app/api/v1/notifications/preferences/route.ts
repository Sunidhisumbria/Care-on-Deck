/**
 * notifications/preferences
 *
 * Generated shape: validate, delegate, respond. All behaviour lives in the
 * module service so it can be unit-tested without an HTTP layer.
 */
import { defineRoute } from '@/server/http/handler';
import { ok } from '@/server/http/response';
import { notificationService } from '@/server/modules/notifications/notification.service';

export const GET = defineRoute({
  access: 'optional',
  handler: async ({ tx, ctx }) =>
    ok(await notificationService.getPreferences(tx, ctx)),
});

export const PATCH = defineRoute({
  access: 'optional',
  handler: async ({ tx, ctx, body }) =>
    ok(await notificationService.updatePreferences(tx, ctx, body)),
});
