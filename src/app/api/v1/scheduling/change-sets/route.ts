/**
 * scheduling/change-sets
 *
 * Generated shape: validate, delegate, respond. All behaviour lives in the
 * module service so it can be unit-tested without an HTTP layer.
 */
import { defineRoute } from '@/server/http/handler';
import { ok } from '@/server/http/response';
import { schedulingService } from '@/server/modules/scheduling/scheduling.service';

/** IA: 7. Schedule Editing > Drag and Drop, Copy/Paste Day and Week */
export const POST = defineRoute({
  access: 'user',
  permissions: ['schedule.update'],
  handler: async ({ tx, ctx, body }) =>
    ok(await schedulingService.proposeChanges(tx, ctx, body)),
});
