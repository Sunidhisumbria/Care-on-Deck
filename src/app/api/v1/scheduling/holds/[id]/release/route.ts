/**
 * scheduling/holds/[id]/release
 *
 * Generated shape: validate, delegate, respond. All behaviour lives in the
 * module service so it can be unit-tested without an HTTP layer.
 */
import { defineRoute } from '@/server/http/handler';
import { ok } from '@/server/http/response';
import { schedulingService } from '@/server/modules/scheduling/scheduling.service';

/** IA: 7. Booking Holds > Resume Bookings */
export const POST = defineRoute<{ id: string }>({
  access: 'user',
  permissions: ['schedule.hold'],
  handler: async ({ tx, ctx, params }) =>
    ok(await schedulingService.releaseHold(tx, ctx, params.id)),
});
