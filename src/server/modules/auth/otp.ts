import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';

import { env } from '@/server/config/env';
import { ApiError } from '@/server/http/errors';

import type { OtpPurpose } from './auth.schemas';

export const OTP_LENGTH = 6;
export const OTP_TTL_SECONDS = 10 * 60;
export const OTP_MAX_ATTEMPTS = 5;
/** A code cannot be re-sent to the same destination faster than this. */
export const OTP_RESEND_INTERVAL_SECONDS = 60;
/** How long the proof of a verified code stays usable by the follow-up step. */
export const PROOF_TTL_SECONDS = 15 * 60;

function secret(): string {
  if (!env.SESSION_SECRET) {
    throw new Error('SESSION_SECRET is not set; one-time codes cannot be issued.');
  }
  return env.SESSION_SECRET;
}

/** Cryptographically random, zero-padded so "004213" is as likely as "984213". */
export function generateCode(): string {
  return randomInt(0, 10 ** OTP_LENGTH)
    .toString()
    .padStart(OTP_LENGTH, '0');
}

/**
 * The stored hash binds the code to its destination and purpose. A code that
 * verified a phone number therefore cannot be replayed to reset a password,
 * even inside its ten-minute window -- and a leaked table of hashes is
 * useless without the server secret.
 */
export function hashCode(code: string, destination: string, purpose: OtpPurpose): string {
  return createHmac('sha256', secret())
    .update(`${purpose}\n${destination}\n${code}`)
    .digest('hex');
}

/** Constant-time, so a wrong first digit takes as long to reject as a wrong last one. */
export function codeMatches(
  candidate: string,
  destination: string,
  purpose: OtpPurpose,
  storedHash: string,
): boolean {
  const a = Buffer.from(hashCode(candidate, destination, purpose), 'hex');
  const b = Buffer.from(storedHash, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Proof that a code was verified, handed to the step that follows -- signup
 * completion, password reset. Signed rather than stored; single use is
 * enforced by `verification_codes.completed_at`, which the consuming step
 * sets, so the same proof cannot reset a password twice.
 */
export interface VerificationProof {
  codeId: string;
  purpose: OtpPurpose;
  channel: 'sms' | 'email';
  destination: string;
  exp: number;
}

export function signProof(claims: Omit<VerificationProof, 'exp'>): string {
  const payload: VerificationProof = {
    ...claims,
    exp: Math.floor(Date.now() / 1000) + PROOF_TTL_SECONDS,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = createHmac('sha256', secret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifyProof(token: string, expectedPurpose: OtpPurpose): VerificationProof {
  const [body, sig] = token.split('.');
  if (!body || !sig) throw ApiError.badRequest('The verification token is malformed.');

  const expected = createHmac('sha256', secret()).update(body).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw ApiError.forbidden('The verification token is not valid.');
  }

  let payload: VerificationProof;
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as VerificationProof;
  } catch {
    throw ApiError.badRequest('The verification token is malformed.');
  }

  if (payload.exp * 1000 < Date.now()) {
    throw ApiError.forbidden('Verification has expired. Request a new code.');
  }
  if (payload.purpose !== expectedPurpose) {
    throw ApiError.forbidden('This verification cannot be used for that action.');
  }
  return payload;
}

/** The message a code travels in. Kept plain: no links, nothing to tap. */
export function otpMessage(code: string, purpose: OtpPurpose): { subject: string; text: string } {
  const why: Record<OtpPurpose, string> = {
    verify_mobile: 'to confirm your mobile number',
    verify_email: 'to confirm your email address',
    signup: 'to finish creating your account',
    login: 'to sign in',
    password_reset: 'to reset your password',
  };
  return {
    subject: `${code} is your CareOndeck code`,
    text: `Your CareOndeck code ${why[purpose]} is ${code}. It expires in 10 minutes. If you did not request this, you can ignore it.`,
  };
}
