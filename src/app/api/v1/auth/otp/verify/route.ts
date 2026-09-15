/**
 * POST /api/v1/auth/otp/verify
 *
 * Checks a code and returns a short-lived verification token for the step that
 * follows. For purpose `login` the code is the credential, so a session is
 * issued too -- this is what the Mobile Number tab on the login screen uses.
 */
import { signedIn } from '@/server/auth/session';
import { defineRoute } from '@/server/http/handler';
import { ok } from '@/server/http/response';
import { verifyOtpSchema } from '@/server/modules/auth/auth.schemas';
import { authService } from '@/server/modules/auth/auth.service';

export const POST = defineRoute({
  access: 'optional',
  body: verifyOtpSchema,
  handler: async ({ tx, ctx, body }) => {
    const result = await authService.verifyOtp(tx, ctx, body);
    if (!result.session) return ok(result.body);
    return signedIn((payload) => ok(payload), result.body, result.session);
  },
});
