/**
 * POST /api/v1/auth/refresh
 *
 * Trades a refresh token for a new access token. Takes no body.
 *
 * The token comes from the `x-refresh-token` header, or from the session
 * cookie when a browser is calling -- a browser never holds the token in
 * JavaScript, which is the point of the cookie being httpOnly.
 *
 * The session row is re-read on every call, so revoking a session stops
 * refreshes immediately; the worst case is one already-issued access token
 * living out its remaining minutes.
 */
import { cookies } from 'next/headers';

import { SESSION_COOKIE, refreshAccessToken } from '@/server/auth/session';
import { ApiError } from '@/server/http/errors';
import { defineRoute } from '@/server/http/handler';
import { TOKEN_HEADERS, readTokenHeader } from '@/server/http/headers';
import { ok } from '@/server/http/response';

export const POST = defineRoute({
  access: 'public',
  handler: async ({ request }) => {
    const fromHeader = readTokenHeader(request, TOKEN_HEADERS.refresh);
    const token = fromHeader ?? (await cookies()).get(SESSION_COOKIE)?.value ?? null;

    if (!token) {
      throw ApiError.badRequest(
        `No refresh token. Send it in the ${TOKEN_HEADERS.refresh} header, or sign in again.`,
      );
    }

    const refreshed = await refreshAccessToken(token);
    if (!refreshed) throw ApiError.unauthenticated('Please sign in again.');

    return ok({
      access_token: refreshed.accessToken,
      token_type: 'Bearer',
      expires_in: refreshed.accessTokenExpiresIn,
    });
  },
});
