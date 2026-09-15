/**
 * notifications
 *
 * Generated shape: validate, delegate, respond. All behaviour lives in the
 * module service so it can be unit-tested without an HTTP layer.
 */
import { defineRoute } from '@/server/http/handler';
import { ok } from '@/server/http/response';
import { notificationService } from '@/server/modules/notifications/notification.service';

/** IA: 11. Notifications > Notification List */
export const GET = defineRoute({
  access: 'optional',
  handler: async ({ tx, ctx, query }) =>
    ok(await notificationService.list(tx, ctx, query)),
});
