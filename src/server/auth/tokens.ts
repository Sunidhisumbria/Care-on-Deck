import { createHmac, timingSafeEqual } from 'node:crypto';

import { env } from '@/server/config/env';

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;

export interface AccessTokenClaims {
  sid: string;
  sub: string;
  exp: number;
}

function secret(): string {
  if (!env.SESSION_SECRET) {
    throw new Error('SESSION_SECRET is not set; access tokens cannot be issued.');
  }
  return env.SESSION_SECRET;
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

export function issueAccessToken(input: { userId: string; sessionId: string }): string {
  const claims: AccessTokenClaims = {
    sid: input.sessionId,
    sub: input.userId,
    exp: Math.floor(Date.now() / 1000) + ACCESS_TOKEN_TTL_SECONDS,
  };
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
  return `${payload}.${sign(payload)}`;
}


export function readAccessToken(token: string): AccessTokenClaims | null {
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;

  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;

  let claims: AccessTokenClaims;
  try {
    claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as AccessTokenClaims;
  } catch {
    return null;
  }

  if (!claims.sid || !claims.sub || claims.exp * 1000 < Date.now()) return null;
  return claims;
}
