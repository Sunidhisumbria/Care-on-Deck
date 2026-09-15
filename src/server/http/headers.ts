import { ApiError } from './errors';

/**
 * Credentials travel in headers, never in the request body.
 *
 * A body is the wrong place for a secret. It is what gets logged when someone
 * turns on request-body logging to debug a form, what a browser devtools panel
 * shows in full, and what ends up pasted into a bug report. Headers are not
 * magic -- they can be logged too -- but every logger and proxy in the chain
 * already treats them as the place secrets live and redacts them by default,
 * and bodies are treated as data.
 *
 * One header per kind of token, rather than reusing `Authorization`, so a
 * token can never be accepted somewhere it does not belong: an access token
 * presented where a refresh token is expected is simply absent, not a
 * near-miss that some code path might honour.
 */
export const TOKEN_HEADERS = {
  /** The short-lived proof from /auth/otp/verify. */
  verification: 'x-verification-token',
  /** The opaque session token traded for a new access token. */
  refresh: 'x-refresh-token',
  /** The Google or Apple ID token being exchanged for a session. */
  provider: 'x-provider-token',
} as const;

export function readTokenHeader(request: Request, header: string): string | null {
  const value = request.headers.get(header)?.trim();
  return value ? value : null;
}

/** The same, but the request has no meaning without it. */
export function requireTokenHeader(request: Request, header: string, what: string): string {
  const value = readTokenHeader(request, header);
  if (!value) {
    throw ApiError.badRequest(`${what} is missing. Send it in the ${header} header.`);
  }
  return value;
}
