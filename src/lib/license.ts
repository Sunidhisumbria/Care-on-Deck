import { z } from 'zod';

import { US_STATE_CODES } from './us-states';

/**
 * A provider's state license, as the onboarding screen and the server both
 * validate it.
 *
 * Shared for the same reason the NPI rules are: the screen explains a mistake
 * before a round trip, the server enforces it because it cannot be bypassed,
 * and the two must never disagree about what a valid license looks like.
 *
 * License number formats differ by state and board, so the number is checked
 * only for what is true everywhere -- not for any one state's pattern, which
 * would refuse real licenses from every state it did not anticipate.
 */

const MAX_YEARS_AHEAD = 10;

export const licenseSchema = z.object({
  state: z.enum(US_STATE_CODES, {
    errorMap: () => ({ message: 'Select the state that issued your license.' }),
  }),
  license_number: z
    .string()
    .trim()
    .min(3, 'Enter your license number.')
    .max(60, 'That is longer than any license number.')
    .regex(/^[A-Za-z0-9][A-Za-z0-9 .\-/]*$/, 'Use only letters, numbers, spaces, dots, hyphens and slashes.'),
  expires_on: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter the expiry date.')
    .refine(isRealDate, 'Enter a real date.')
    .refine(notExpired, 'That license has expired. Enter the expiry date of a current license.')
    .refine(notImplausible, `An expiry more than ${MAX_YEARS_AHEAD} years away is unlikely. Check the date.`),
  /**
   * The uploaded copy of the license, if there is one. Optional: uploading may
   * not be set up, and a reviewer can ask for it. The server checks the file
   * belongs to this applicant and is a license document.
   */
  document_media_id: z.string().uuid('That upload was not recognised. Upload the document again.').nullable().optional(),
});

export type LicenseValues = z.infer<typeof licenseSchema>;

/** For comparison only: case, spaces, dots, hyphens and slashes are formatting, not the number. */
export function normaliseLicenseNumber(value: string): string {
  return value.toUpperCase().replace(/[\s.\-/]/g, '');
}

/**
 * Whether a license agrees with the one on the provider's NPI record.
 *
 * Null when the record has no license to compare against -- that is "unknown",
 * not "different", and should not read as a discrepancy to a reviewer.
 */
export function licenseMatchesRegistry(
  license: { state: string; license_number: string },
  registry: { state: string | null; license: string | null } | null | undefined,
): boolean | null {
  if (!registry?.license || !registry.state) return null;
  return (
    registry.state.toUpperCase() === license.state.toUpperCase() &&
    normaliseLicenseNumber(registry.license) === normaliseLicenseNumber(license.license_number)
  );
}

/** "2027-02-30" passes a pattern check; it is not a date. */
function isRealDate(value: string): boolean {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return true; // the pattern check reports this one
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/**
 * Compared as calendar dates, with a day's grace: "today" in UTC can already be
 * tomorrow for someone in the evening in the United States, and a license that
 * expires today is still valid today.
 */
function notExpired(value: string): boolean {
  return value >= isoDay(-1);
}

function notImplausible(value: string): boolean {
  const limit = new Date();
  limit.setUTCFullYear(limit.getUTCFullYear() + MAX_YEARS_AHEAD);
  return value <= limit.toISOString().slice(0, 10);
}

function isoDay(offsetDays: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}
