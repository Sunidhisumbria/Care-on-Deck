/**
 * POST /api/v1/auth/password/change
 *
 * Changes the password of whoever is signed in. Requires the current one --
 * a live session proves the laptop is unlocked, not that the right person is
 * at it.
 *
 * `access: 'account'`, not 'patient' or 'user': providers change passwords on
 * this same endpoint with the same rules, and neither side needs an
 * organization to do it.
 */
import { defineRoute } from '@/server/http/handler';
import { ok } from '@/server/http/response';
import { changePasswordSchema } from '@/server/modules/auth/auth.schemas';
import { authService } from '@/server/modules/auth/auth.service';

export const POST = defineRoute({
  access: 'account',
  body: changePasswordSchema,
  handler: async ({ tx, ctx, body }) => ok(await authService.changePassword(tx, ctx, body)),
});
