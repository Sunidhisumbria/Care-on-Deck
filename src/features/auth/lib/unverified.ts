import { ApiError } from '@/lib/http/errors';

import type { Contacts } from '../types';

/**
 * The server's answer when the password was right but the account never proved
 * either of the contacts it signed up with.
 *
 * There is a way forward from here -- send a code and finish verifying -- so
 * this is worth telling apart from a wrong password.
 */
export function asUnverifiedAccount(error: unknown): Contacts | null {
  if (!(error instanceof ApiError) || error.code !== 'ACCOUNT_UNVERIFIED') return null;

  const details = error.details as { phone?: unknown; email?: unknown } | undefined;
  const phone = typeof details?.phone === 'string' ? details.phone : null;
  const email = typeof details?.email === 'string' ? details.email : null;

  return phone || email ? { phone, email } : null;
}
