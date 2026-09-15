/**
 * The current session, as a resource.
 *
 *   GET    -- who is signed in, which organizations they belong to, and what
 *             they may do in the active one.
 *   DELETE -- sign out. Revokes the server-side session and clears the cookie
 *             in the same response.
 *
 * There is no POST: signing in goes to whichever endpoint matches the method
 * used -- /auth/login for email and password, /auth/otp + /auth/otp/verify for
 * the mobile code, /auth/social for Google and Apple.
 *
 * GET has three answers, and the difference matters to the caller:
 *
 *   no credential   -> 200 with `user: null`. A visitor, not an error, so the
 *                      frontend can call this unconditionally on load.
 *   dead credential -> 401 UNAUTHENTICATED. The token was presented and no
 *                      longer resolves -- revoked, expired, or the account is
 *                      gone. Answering `user: null` here would leave the client
 *                      holding a token it believes is fine.
 *   live credential -> 200 with the user.
 */
import { clearSessionCookie, hasSessionCredentials } from '@/server/auth/session';
import { ApiError } from '@/server/http/errors';
import { defineRoute } from '@/server/http/handler';
import { ok } from '@/server/http/response';
import { authService } from '@/server/modules/auth/auth.service';

export const GET = defineRoute({
  access: 'optional',
  handler: async ({ tx, ctx, request }) => {
    if (!ctx.session && (await hasSessionCredentials(request))) {
      throw ApiError.unauthenticated('That session is no longer valid. Please sign in again.');
    }
    return ok(await authService.getCurrentUser(tx, ctx));
  },
});

export const DELETE = defineRoute({
  access: 'optional',
  handler: async ({ tx, ctx }) => {
    const result = await authService.revokeSession(tx, ctx);
    return clearSessionCookie(ok(result));
  },
});
