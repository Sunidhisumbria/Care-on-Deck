/**
 * scheduling/calendar
 *
 * Generated shape: validate, delegate, respond. All behaviour lives in the
 * module service so it can be unit-tested without an HTTP layer.
 */
import { defineRoute } from '@/server/http/handler';
import { ok } from '@/server/http/response';
import { schedulingService } from '@/server/modules/scheduling/scheduling.service';

/** IA: 7. Calendar > Day / Week / Provider / Facility View */
export const GET = defineRoute({
  access: 'user',
  permissions: ['schedule.read'],
  handler: async ({ tx, ctx, query }) =>
    ok(await schedulingService.getCalendar(tx, ctx, query)),
});
