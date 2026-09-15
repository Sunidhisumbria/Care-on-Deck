/**
 * pulse/overview
 *
 * Generated shape: validate, delegate, respond. All behaviour lives in the
 * module service so it can be unit-tested without an HTTP layer.
 */
import { defineRoute } from '@/server/http/handler';
import { ok } from '@/server/http/response';
import { pulseService } from '@/server/modules/pulse/pulse.service';

/** IA: 9. Pulse Overview > Spend, Clicks, Requests, Confirmed, Cost Metrics */
export const GET = defineRoute({
  access: 'user',
  permissions: ['pulse.read'],
  handler: async ({ tx, ctx, query }) =>
    ok(await pulseService.getOverview(tx, ctx, query)),
});
