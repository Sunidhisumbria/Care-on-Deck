import { createHash, randomBytes } from 'node:crypto';

import { and, eq, gt, isNull, sql } from 'drizzle-orm';
import { cookies } from 'next/headers';
import type { NextResponse } from 'next/server';

import { isProduction } from '@/server/config/env';
import { db } from '@/server/db/client';
import { sessions, users } from '@/server/db/schema';
import type { Tx } from '@/server/db/tenant';
import { ApiError } from '@/server/http/errors';

import { ACCESS_TOKEN_TTL_SECONDS, issueAccessToken, readAccessToken } from './tokens';

export const SESSION_COOKIE = 'cod_session';

/**
 * Thirty days for everyone to begin with. Organization security settings
 * carry a `sessionTimeoutMinutes` that will shorten this for staff once the
 * settings module enforces it.
 */
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

/**
 * Sessions are opaque random tokens; only the SHA-256 is stored. A leaked
 * database therefore does not hand an attacker a set of live logins.
 *
 * Firebase Auth verifies the credential; this table owns the resulting server
 * session, which is what lets Control Center revoke one instantly -- a
 * stateless JWT cannot be recalled before it expires.
 */
export function issueToken() {
  const token = randomBytes(32).toString('base64url');
  return { token, tokenHash: hashToken(token) };
}

export function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export interface ResolvedSession {
  sessionId: string;
  userId: string;
  userType: 'patient' | 'staff' | 'provider' | 'internal';
  activeOrganizationId: string | null;
  activeFacilityId: string | null;
}

/**
 * Reads the session cookie (or bearer token) and resolves it, or returns null
 * for anonymous traffic. Runs outside `withActor` on purpose: the session
 * lookup is what decides which tenant the rest of the request runs in, so it
 * cannot itself be tenant-scoped. The `sessions_owner` policy still applies,
 * but with no user id set it matches nothing -- hence the raw `db` handle.
 */
export async function resolveSession(request: Request): Promise<ResolvedSession | null> {
  const token = await readSessionToken(request);
  if (!token) return null;

  /*
   * A bearer value is either a short-lived access token or a refresh token.
   * Access tokens carry the session id, so we look up by id; anything else is
   * matched on its hash. Either way the session row is re-read, so revoking a
   * session takes effect immediately on both paths.
   */
  const claims = readAccessToken(token);
  const match = claims
    ? eq(sessions.id, claims.sid)
    : eq(sessions.tokenHash, hashToken(token));

  const [row] = await withSessionLookup((tx) =>
    tx
      .select({
        sessionId: sessions.id,
        userId: sessions.userId,
        userType: users.type,
        userStatus: users.status,
        activeOrganizationId: sessions.activeOrganizationId,
        activeFacilityId: sessions.activeFacilityId,
      })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(
        and(
          match,
          isNull(sessions.revokedAt),
          gt(sessions.expiresAt, new Date()),
          isNull(users.deletedAt),
        ),
      )
      .limit(1),
  );

  if (!row) return null;
  if (row.userStatus !== 'active') {
    throw ApiError.forbidden('This account is not active.');
  }

  return {
    sessionId: row.sessionId,
    userId: row.userId,
    userType: row.userType,
    activeOrganizationId: row.activeOrganizationId,
    activeFacilityId: row.activeFacilityId,
  };
}

/**
 * The session lookup has to read `sessions` and `users` before any identity is
 * known, and both are policy-guarded. It runs as the system actor in its own
 * short transaction; the token hash in the WHERE clause is the credential.
 */
async function withSessionLookup<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.actor_kind', 'system', true)`);
    return fn(tx as Tx);
  });
}

export interface IssuedSession {
  /** Short-lived, sent as `Authorization: Bearer`. */
  accessToken: string;
  accessTokenExpiresIn: number;
  /** Long-lived. Also the value written to the cookie for browser clients. */
  refreshToken: string;
  sessionId: string;
  expiresAt: Date;
}

/**
 * Creates a session and returns both tokens. The plaintext refresh token
 * exists only here -- the row stores its hash.
 */
export async function issueSession(
  tx: Tx,
  input: {
    userId: string;
    ipAddress: string | null;
    userAgent: string | null;
    activeOrganizationId?: string | null;
    activeFacilityId?: string | null;
    deviceToken?: string | null;
    deviceType?: string | null;
  },
): Promise<IssuedSession> {
  const { token, tokenHash } = issueToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);

  const [row] = await tx
    .insert(sessions)
    .values({
      userId: input.userId,
      tokenHash,
      activeOrganizationId: input.activeOrganizationId ?? null,
      activeFacilityId: input.activeFacilityId ?? null,
      deviceToken: input.deviceToken ?? null,
      deviceType: input.deviceType ?? null,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      expiresAt,
    })
    .returning({ id: sessions.id });

  if (!row) throw ApiError.internal('Could not create a session.');

  return {
    accessToken: issueAccessToken({ userId: input.userId, sessionId: row.id }),
    accessTokenExpiresIn: ACCESS_TOKEN_TTL_SECONDS,
    refreshToken: token,
    sessionId: row.id,
    expiresAt,
  };
}

/**
 * Trades a refresh token for a new access token.
 *
 * The session row is re-read every time, so a revoked or expired session stops
 * working here even though its last access token may still be within its
 * fifteen minutes.
 */
export async function refreshAccessToken(
  refreshToken: string,
): Promise<{ accessToken: string; accessTokenExpiresIn: number } | null> {
  const [row] = await withSessionLookup((tx) =>
    tx
      .select({ id: sessions.id, userId: sessions.userId, status: users.status })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(
        and(
          eq(sessions.tokenHash, hashToken(refreshToken)),
          isNull(sessions.revokedAt),
          gt(sessions.expiresAt, new Date()),
          isNull(users.deletedAt),
        ),
      )
      .limit(1),
  );

  if (!row || row.status !== 'active') return null;

  return {
    accessToken: issueAccessToken({ userId: row.userId, sessionId: row.id }),
    accessTokenExpiresIn: ACCESS_TOKEN_TTL_SECONDS,
  };
}

/**
 * The one place a successful sign-in is turned into a response.
 *
 * Browsers get the httpOnly cookie and ignore the token pair; mobile clients
 * read the token pair and ignore the cookie. Every sign-in route uses this, so
 * the shape cannot drift between them.
 */
export function signedIn<T extends Record<string, unknown>>(
  make: (body: T & TokenPair) => NextResponse,
  body: T,
  session: IssuedSession,
): NextResponse {
  const response = make({
    ...body,
    access_token: session.accessToken,
    refresh_token: session.refreshToken,
    token_type: 'Bearer',
    expires_in: session.accessTokenExpiresIn,
  });
  return attachSessionCookie(response, session.refreshToken, session.expiresAt);
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: 'Bearer';
  expires_in: number;
}

/**
 * httpOnly so script cannot read it; `lax` so a link from an email still
 * carries the session but a cross-site POST does not; `secure` in production
 * only, because a secure cookie is silently dropped over plain http in dev.
 */
export function attachSessionCookie(response: NextResponse, token: string, expiresAt: Date) {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });
  return response;
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: '',
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}

/**
 * Whether the caller presented any credential at all.
 *
 * `resolveSession` answers null both for "nobody is signed in" and for "this
 * token is dead", which are very different things to a client holding one.
 * Endpoints that need to tell them apart ask this first.
 */
export async function hasSessionCredentials(request: Request): Promise<boolean> {
  return (await readSessionToken(request)) !== null;
}

async function readSessionToken(request: Request): Promise<string | null> {
  const header = request.headers.get('authorization');
  if (header?.startsWith('Bearer ')) return header.slice(7).trim() || null;

  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}
