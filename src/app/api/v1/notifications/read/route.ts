/**
 * notifications/read
 *
 * Generated shape: validate, delegate, respond. All behaviour lives in the
 * module service so it can be unit-tested without an HTTP layer.
 */
import { defineRoute } from '@/server/http/handler';
import { markReadSchema } from '@/server/modules/notifications/notification.service';
import { ok } from '@/server/http/response';
import { notificationService } from '@/server/modules/notifications/notification.service';

export const POST = defineRoute({
  access: 'account',
  body: markReadSchema,
  handler: async ({ tx, ctx, body }) =>
    ok(await notificationService.markRead(tx, ctx, body)),
});
