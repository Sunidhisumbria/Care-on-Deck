/**
 * scheduling/availability
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
    ok(await schedulingService.listRules(tx, ctx, query)),
});

/** IA: 4/5. Onboarding > Schedule Setup */
export const PUT = defineRoute({
  access: 'user',
  permissions: ['schedule.update'],
  handler: async ({ tx, ctx, body }) =>
    ok(await schedulingService.replaceRules(tx, ctx, body)),
});
