/**
 * POST /api/v1/auth/password/reset
 *
 * Sets a new password using the proof from /auth/otp/verify.
 *
 * The proof arrives in the `x-verification-token` header rather than the body:
 * it is a bearer credential, and credentials do not belong in a payload that
 * request logging, devtools and bug reports all treat as plain data.
 *
 * It is single-use -- the code row it points at is marked completed -- so the
 * same proof cannot reset a password twice.
 */
import { clearSessionCookie } from '@/server/auth/session';
import { defineRoute } from '@/server/http/handler';
import { TOKEN_HEADERS, requireTokenHeader } from '@/server/http/headers';
import { ok } from '@/server/http/response';
import { resetPasswordBodySchema } from '@/server/modules/auth/auth.schemas';
import { authService } from '@/server/modules/auth/auth.service';

export const POST = defineRoute({
  access: 'public',
  body: resetPasswordBodySchema,
  handler: async ({ tx, ctx, body, request }) => {
    const verificationToken = requireTokenHeader(
      request,
      TOKEN_HEADERS.verification,
      'The verification token',
    );

    const result = await authService.resetPassword(tx, ctx, {
      ...body,
      verification_token: verificationToken,
    });

    // Every session was revoked, including this browser's if it had one.
    // Clearing the cookie keeps the client from presenting a dead token.
    return clearSessionCookie(ok(result));
  },
});
