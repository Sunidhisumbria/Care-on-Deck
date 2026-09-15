/**
 * POST /api/v1/auth/password/forgot
 *
 * Sends a reset code to the account's email. Answers identically whether or
 * not the address has an account -- the response cannot be used to probe.
 * The user then calls /auth/otp/verify with purpose `password_reset` and
 * hands the resulting token to /auth/password/reset.
 */
import { defineRoute } from '@/server/http/handler';
import { ok } from '@/server/http/response';
import { forgotPasswordSchema } from '@/server/modules/auth/auth.schemas';
import { authService } from '@/server/modules/auth/auth.service';

export const POST = defineRoute({
  access: 'public',
  body: forgotPasswordSchema,
  handler: async ({ tx, ctx, body }) => ok(await authService.forgotPassword(tx, ctx, body)),
});
