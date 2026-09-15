import { z } from 'zod';

/**
 * National Provider Identifier rules, shared by the onboarding screen and the
 * server.
 *
 * Shared on purpose. The screen uses them to catch a mistyped NPI before a round
 * trip; the server applies the identical rules because it is the only side that
 * cannot be bypassed. Written twice, they would drift -- and a drift here shows
 * up as "the form accepted my NPI and then the server refused it".
 */

export const NPI_PATTERN = /^\d{10}$/;

/**
 * The CMS check digit: Luhn over the NPI prefixed with 80840, the health
 * industry's issuer code. It catches single-digit typos and most transposed
 * digits without asking the registry, which is rate limited and has no SLA.
 */
export function isValidNpi(value: string): boolean {
  if (!NPI_PATTERN.test(value)) return false;

  const digits = `80840${value}`;
  let sum = 0;
  for (let index = 0; index < digits.length; index += 1) {
    let digit = Number(digits[digits.length - 1 - index]);
    if (index % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

export const npiField = z
  .string()
  .trim()
  .regex(NPI_PATTERN, 'An NPI is 10 digits.')
  .refine(isValidNpi, 'That is not a valid NPI. Check the number for a typo.');

export type ProviderTypeKey = 'physician' | 'dentist' | 'therapist' | 'nurse_practitioner' | 'other';

/**
 * The provider type a registry taxonomy code belongs to, by NUCC code family.
 *
 * Family level only -- "a physician of some kind", not "a cardiologist" --
 * because that is the granularity of the role question it is checked against.
 */
export function providerTypeForTaxonomy(code: string): ProviderTypeKey {
  if (/^20[78]/.test(code)) return 'physician'; // allopathic and osteopathic physicians
  if (/^1223/.test(code)) return 'dentist';
  if (/^363L/.test(code)) return 'nurse_practitioner';
  if (/^10[1-6]/.test(code)) return 'therapist'; // behavioural health and social service
  return 'other';
}

/** The registry record as onboarding stores and shows it. Snake_case: it is wire data. */
export interface NpiProfile {
  npi: string;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  credential: string | null;
  /** Earlier names on the record -- most often a maiden name. */
  former_names: Array<{ first_name: string | null; last_name: string | null }>;
  enumeration_date: string | null;
  primary_taxonomy: { code: string; desc: string; state: string | null; license: string | null } | null;
  practice_location: {
    line1: string;
    line2: string | null;
    city: string;
    state: string;
    postal_code: string;
    phone: string | null;
  } | null;
}

/** What the `npi_lookup` step stores. `profile` is null when the registry could not be reached. */
export interface NpiLookupAnswer {
  npi: string;
  profile: NpiProfile | null;
  registry_unavailable: boolean;
  looked_up_at: string;
}

export type ProfileFlag = 'name_mismatch' | 'role_mismatch' | 'registry_unavailable';

/**
 * What a reviewer should look at twice. None of these stop the applicant.
 *
 * Name differences are common and usually innocent -- a married name, a
 * nickname -- so the account is compared against the record's former names as
 * well as its current one, and loosely: a first name that begins with the other
 * ("Alex", "Alexandra") counts as the same.
 *
 * A role of `other` never mismatches, because it exists for roles the list does
 * not name. Any named role that disagrees with the registry does -- including a
 * physician assistant who picked Doctor Physician.
 */
export function profileFlags(input: {
  lookup: NpiLookupAnswer;
  account: { first_name: string | null; last_name: string | null };
  providerType: ProviderTypeKey | null;
}): ProfileFlag[] {
  const { profile } = input.lookup;
  if (!profile) return ['registry_unavailable'];

  const flags: ProfileFlag[] = [];

  const names = [{ first_name: profile.first_name, last_name: profile.last_name }, ...profile.former_names];
  if (!names.some((name) => sameName(name, input.account))) flags.push('name_mismatch');

  const registryType = profile.primary_taxonomy
    ? providerTypeForTaxonomy(profile.primary_taxonomy.code)
    : 'other';
  if (input.providerType && input.providerType !== 'other' && registryType !== input.providerType) {
    flags.push('role_mismatch');
  }

  return flags;
}

function sameName(
  a: { first_name: string | null; last_name: string | null },
  b: { first_name: string | null; last_name: string | null },
): boolean {
  const lastA = letters(a.last_name);
  if (!lastA || lastA !== letters(b.last_name)) return false;

  const firstA = letters(a.first_name);
  const firstB = letters(b.first_name);
  if (!firstA || !firstB) return false;
  return firstA === firstB || firstA.startsWith(firstB) || firstB.startsWith(firstA);
}

/** Case, accents, hyphens and apostrophes are not what makes two names different. */
function letters(value: string | null): string {
  return (value ?? '').normalize('NFD').toLowerCase().replace(/[^a-z]/g, '');
}
