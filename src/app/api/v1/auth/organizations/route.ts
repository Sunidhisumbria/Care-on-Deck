/**
 * GET  /api/v1/auth/organizations -- the organizations this user belongs to.
 * POST /api/v1/auth/organizations -- set the active one on the session.
 *
 * IA: 6. Unified Dashboard > Facility Switcher
 */
import { defineRoute } from '@/server/http/handler';
import { ok } from '@/server/http/response';
import { switchOrganizationSchema } from '@/server/modules/auth/auth.schemas';
import { authService } from '@/server/modules/auth/auth.service';

export const GET = defineRoute({
  access: 'optional',
  handler: async ({ tx, ctx }) => ok(await authService.listMemberships(tx, ctx)),
});

export const POST = defineRoute({
  access: 'optional',
  body: switchOrganizationSchema,
  handler: async ({ tx, ctx, body }) => ok(await authService.switchOrganization(tx, ctx, body)),
});
