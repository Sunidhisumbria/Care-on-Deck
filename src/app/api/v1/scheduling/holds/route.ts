/**
 * scheduling/holds
 *
 * Generated shape: validate, delegate, respond. All behaviour lives in the
 * module service so it can be unit-tested without an HTTP layer.
 */
import { defineRoute } from '@/server/http/handler';
import { ok } from '@/server/http/response';
import { schedulingService } from '@/server/modules/scheduling/scheduling.service';

export const GET = defineRoute({
  access: 'user',
  permissions: ['schedule.read'],
  handler: async ({ tx, ctx, query }) =>
    ok(await schedulingService.listHolds(tx, ctx, query)),
});

/** IA: 7. Booking Holds > Today / This Week / This Month / Custom */
export const POST = defineRoute({
  access: 'user',
  permissions: ['schedule.hold'],
  handler: async ({ tx, ctx, body }) =>
    ok(await schedulingService.createHold(tx, ctx, body)),
});
