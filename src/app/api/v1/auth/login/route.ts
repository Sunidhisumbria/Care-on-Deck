/**
 * POST /api/v1/auth/login
 *
 * Email and password sign-in, rate-limited per email and per IP.
 *
 * The Mobile Number tab on the same screen does not come here: it sends a
 * one-time code through POST /auth/otp with purpose `login`, then
 * /auth/otp/verify. No password is involved on that path.
 */
import { signedIn } from '@/server/auth/session';
import { defineRoute } from '@/server/http/handler';
import { ok } from '@/server/http/response';
import { loginSchema } from '@/server/modules/auth/auth.schemas';
import { authService } from '@/server/modules/auth/auth.service';

export const POST = defineRoute({
  access: 'public',
  body: loginSchema,
  handler: async ({ tx, ctx, body }) => {
    const result = await authService.login(tx, ctx, body);
    return signedIn((payload) => ok(payload), result.body, result.session);
  },
});
