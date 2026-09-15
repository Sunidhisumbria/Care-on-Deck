/**
 * pulse/agencies/[id]
 *
 * Generated shape: validate, delegate, respond. All behaviour lives in the
 * module service so it can be unit-tested without an HTTP layer.
 */
import { defineRoute } from '@/server/http/handler';
import { ok } from '@/server/http/response';
import { pulseService } from '@/server/modules/pulse/pulse.service';

/** IA: 9. Agencies > Agency Detail, Engagement History */
export const GET = defineRoute<{ id: string }>({
  access: 'user',
  permissions: ['pulse.read'],
  handler: async ({ tx, ctx, params }) =>
    ok(await pulseService.getAgency(tx, ctx, params.id)),
});
