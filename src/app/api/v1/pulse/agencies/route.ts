/**
 * pulse/agencies
 *
 * Generated shape: validate, delegate, respond. All behaviour lives in the
 * module service so it can be unit-tested without an HTTP layer.
 */
import { defineRoute } from '@/server/http/handler';
import { ok } from '@/server/http/response';
import { addAgencySchema } from '@/lib/pulse';
import { pulseService } from '@/server/modules/pulse/pulse.service';

/** IA: 9. Agencies > Agency List */
export const GET = defineRoute({
  access: 'user',
  permissions: ['pulse.read'],
  handler: async ({ tx, ctx }) =>
    ok(await pulseService.listAgencies(tx, ctx)),
});

/** IA: 9. Agencies > Add Agency */
export const POST = defineRoute({
  access: 'user',
  permissions: ['pulse.agencies.manage'],
  body: addAgencySchema,
  handler: async ({ tx, ctx, body }) =>
    ok(await pulseService.addAgency(tx, ctx, body)),
});
