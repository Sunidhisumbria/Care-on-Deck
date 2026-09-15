/**
 * scheduling/templates
 *
 * Generated shape: validate, delegate, respond. All behaviour lives in the
 * module service so it can be unit-tested without an HTTP layer.
 */
import { defineRoute } from '@/server/http/handler';
import { ok } from '@/server/http/response';
import { schedulingService } from '@/server/modules/scheduling/scheduling.service';

/** IA: 7. Schedule Editing > Templates */
export const GET = defineRoute({
  access: 'user',
  permissions: ['schedule.read'],
  handler: async ({ tx, ctx }) =>
    ok(await schedulingService.listTemplates(tx, ctx)),
});

export const POST = defineRoute({
  access: 'user',
  permissions: ['schedule.update'],
  handler: async ({ tx, ctx, body }) =>
    ok(await schedulingService.createTemplate(tx, ctx, body)),
});
