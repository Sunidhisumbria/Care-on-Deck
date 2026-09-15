/**
 * scheduling/change-sets/[id]/confirm
 *
 * Generated shape: validate, delegate, respond. All behaviour lives in the
 * module service so it can be unit-tested without an HTTP layer.
 */
import { defineRoute } from '@/server/http/handler';
import { ok } from '@/server/http/response';
import { schedulingService } from '@/server/modules/scheduling/scheduling.service';

/** IA: 7. Schedule Editing > Confirm Changes */
export const POST = defineRoute<{ id: string }>({
  access: 'user',
  permissions: ['schedule.update'],
  handler: async ({ tx, ctx, params }) =>
    ok(await schedulingService.confirmChanges(tx, ctx, params.id)),
});
