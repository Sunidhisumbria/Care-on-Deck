/**
 * Clearing away one-time codes nobody can use any more.
 *
 * Most codes are deleted the moment they are spent (see auth.service). What is
 * left is codes that were never entered, and codes that were verified but whose
 * follow-up step -- the password reset -- never happened. A code lasts 10
 * minutes and the proof of it 15 more, so anything that expired longer ago
 * than the proof window can no longer do anything, and is deleted.
 *
 * Nothing is lost by deleting them: every code sent is recorded in
 * `outbound_messages`, which is what usage and delivery questions are answered
 * from.
 */
import { lt } from 'drizzle-orm';

import { verificationCodes } from '@/server/db/schema';
import { withElevated, type Tx } from '@/server/db/tenant';

import { PROOF_TTL_SECONDS } from './otp';

export async function sweepVerificationCodes(tx: Tx, now: Date = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - PROOF_TTL_SECONDS * 1000);

  const deleted = await withElevated(tx, () =>
    tx
      .delete(verificationCodes)
      .where(lt(verificationCodes.expiresAt, cutoff))
      .returning({ id: verificationCodes.id }),
  );

  return deleted.length;
}
