/**
 * GET /api/v1/internal/jobs/verification-codes
 *
 * Deletes one-time codes that can no longer be used. Called daily by Vercel
 * Cron (see vercel.json), which sends `Authorization: Bearer <CRON_SECRET>`.
 * A caller without the secret is told the route does not exist.
 */
import { timingSafeEqual } from 'node:crypto';

import { env } from '@/server/config/env';
import { ApiError } from '@/server/http/errors';
import { defineRoute } from '@/server/http/handler';
import { ok } from '@/server/http/response';
import { sweepVerificationCodes } from '@/server/modules/auth/verification-cleanup';

export const GET = defineRoute({
  access: 'public',
  handler: async ({ tx, request }) => {
    if (!hasJobSecret(request.headers.get('authorization'))) {
      throw ApiError.notFound('Not found.');
    }
    return ok({ deleted: await sweepVerificationCodes(tx) });
  },
});

/** Constant-time, and false whenever no secret is configured at all. */
function hasJobSecret(header: string | null): boolean {
  const secret = env.CRON_SECRET ?? env.INTERNAL_JOB_SECRET;
  if (!secret || !header?.startsWith('Bearer ')) return false;

  const given = Buffer.from(header.slice('Bearer '.length));
  const expected = Buffer.from(secret);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
