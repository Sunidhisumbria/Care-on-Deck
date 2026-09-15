/**
 * The bit of state that sits between "we sent you a code" and the screen after.
 *
 * Two rules keep the code-entry screen simple:
 *
 *  1. Whoever navigates to /verify has already sent the code. The verify
 *     screen only ever resends, so a code is never sent twice on arrival.
 *  2. The proof that comes back from /auth/otp/verify goes in sessionStorage,
 *     not the URL. It is a bearer credential for the next step -- a query
 *     string would put it in history, in the referrer, and in any log that
 *     records URLs.
 */

import type { Route } from 'next';

import type { Channel, InterfaceRole, OtpPurpose } from '../types';

/**
 * Reads the `?role=` a screen was opened with.
 *
 * The header says `doctor` because that is the word on the button; the API
 * says `provider` because that is what the account is called. This is the one
 * place the two meet, so neither side has to know about the other. Anything
 * unrecognised means patient, which is the safe default -- a provider account
 * signing in as a patient is refused by the server, not let through.
 */
export function readRole(raw: string | null | undefined): InterfaceRole {
  return raw === 'provider' || raw === 'doctor' ? 'provider' : 'patient';
}

export interface VerifyParams {
  channel: Channel;
  destination: string;
  purpose: OtpPurpose;
  /** Which interface is being signed into. */
  role?: InterfaceRole;
  /** Where to land once the code checks out. Defaults per purpose. */
  next?: string;
}

export function verifyPath({ channel, destination, purpose, role, next }: VerifyParams): Route {
  const query = new URLSearchParams({ channel, destination, purpose });
  if (role) query.set('role', role);
  if (next) query.set('next', next);
  // typedRoutes cannot see through the template; /verify itself is a real page.
  return `/verify?${query}` as Route;
}

const PROOF_KEY = 'careondeck.verification';

export interface Proof {
  token: string;
  purpose: OtpPurpose;
  destination: string;
}

export function stashProof(proof: Proof): void {
  try {
    sessionStorage.setItem(PROOF_KEY, JSON.stringify(proof));
  } catch {
    // Private browsing, or storage disabled. The next screen will notice the
    // proof is missing and send the user back to the start.
  }
}

/**
 * Reads the proof without consuming it.
 *
 * Deliberately not destructive. React Strict Mode mounts a component, tears
 * the effect down, and mounts it again -- so a read-and-delete would hand the
 * proof to the first run and nothing to the second, and the screen would
 * declare a perfectly good link expired. Only in development, which is
 * precisely where it is hardest to notice.
 *
 * Leaving it in place until it is spent costs nothing: the server marks the
 * underlying code completed on first use, so a second attempt with the same
 * token is refused there regardless of what this returns.
 */
export function readProof(): Proof | null {
  try {
    const raw = sessionStorage.getItem(PROOF_KEY);
    return raw ? (JSON.parse(raw) as Proof) : null;
  } catch {
    return null;
  }
}

/** Drops the proof once it has actually been used. */
export function clearProof(): void {
  try {
    sessionStorage.removeItem(PROOF_KEY);
  } catch {
    // Storage unavailable. The token is single-use server-side anyway.
  }
}
