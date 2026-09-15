import { createHash } from 'node:crypto';

import { sql } from 'drizzle-orm';

import { db } from '@/server/db/client';
import { rateLimitBuckets } from '@/server/db/schema';

import { ApiError } from './errors';

export interface RateLimitRule {
  limit: number;
  windowSeconds: number;
}

/**
 * The limits that guard the endpoints an attacker would actually hammer.
 * Per-destination stops one number being flooded; per-IP stops one machine
 * flooding many numbers. Both are needed.
 */
export const RATE_LIMITS = {
  otpSendPerDestination: { limit: 5, windowSeconds: 60 * 60 },
  otpSendPerIp: { limit: 20, windowSeconds: 60 * 60 },
  otpVerifyPerDestination: { limit: 15, windowSeconds: 60 * 60 },
  loginPerEmail: { limit: 10, windowSeconds: 15 * 60 },
  loginPerIp: { limit: 40, windowSeconds: 15 * 60 },
  signupPerIp: { limit: 10, windowSeconds: 60 * 60 },
  /*
   * Changing a password requires the current one, so this endpoint is a
   * password oracle for anyone holding a stolen session. The limit is what
   * stops it being a fast one.
   */
  passwordChangePerUser: { limit: 10, windowSeconds: 15 * 60 },
  /*
   * NPPES is free but rate limited and has no SLA, and every lookup also
   * answers "is this NPI already registered here?" -- so it is bounded per
   * applicant rather than left open.
   */
  npiLookupPerUser: { limit: 20, windowSeconds: 60 * 60 },
  /* Each upload permission is storage someone else pays for. */
  uploadsPerUser: { limit: 30, windowSeconds: 60 * 60 },
} as const satisfies Record<string, RateLimitRule>;

/**
 * Counts one hit against `key` and throws RATE_LIMITED once the window's
 * limit is exceeded. Fixed windows, stored in Postgres, so the count holds
 * across serverless instances without a Redis.
 *
 * This deliberately uses the raw `db` handle rather than the caller's
 * transaction -- the one exception to the "never import db in feature code"
 * rule, and for a reason: a security counter has to survive the rollback of
 * the request that tripped it. Inside the request transaction, a wrong OTP
 * would throw, roll back, and take its own attempt count with it. The
 * `rate_limit_buckets` policy is open precisely so this works with no actor
 * context set.
 */
export async function consumeRateLimit(
  key: string,
  rule: RateLimitRule,
  message = 'Too many attempts. Please wait a while and try again.',
): Promise<{ remaining: number }> {
  const keyHash = createHash('sha256').update(key).digest('hex');
  const windowMs = rule.windowSeconds * 1000;
  const windowStartMs = Math.floor(Date.now() / windowMs) * windowMs;
  const windowStart = new Date(windowStartMs);

  const [row] = await db
    .insert(rateLimitBuckets)
    .values({ keyHash, windowStart, count: 1 })
    .onConflictDoUpdate({
      target: [rateLimitBuckets.keyHash, rateLimitBuckets.windowStart],
      set: { count: sql`${rateLimitBuckets.count} + 1`, updatedAt: new Date() },
    })
    .returning({ count: rateLimitBuckets.count });

  // If the write somehow returned nothing, fail closed rather than open.
  const count = row?.count ?? rule.limit + 1;

  if (count > rule.limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((windowStartMs + windowMs - Date.now()) / 1000));
    throw new ApiError('RATE_LIMITED', message, { details: { retryAfterSeconds } });
  }

  return { remaining: rule.limit - count };
}
