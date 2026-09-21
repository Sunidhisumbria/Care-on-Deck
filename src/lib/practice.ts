import { z } from 'zod';

import { isValidUsPhone, localPhoneDigits, PHONE_RULE } from './phone';
import { US_STATE_CODES } from './us-states';

/**
 * The practice a provider sets up during onboarding, as the screen and the
 * server both validate it.
 *
 * The address is not on the Your Practice design, and it is required here
 * anyway: the marketplace searches practice locations, so a practice without an
 * address can never appear when a patient searches near them. It is pre-filled
 * from the provider's NPI record.
 */

/** The `office_type` values, worded for a person. */
export const OFFICE_TYPES = [
  { value: 'medical', label: 'Medical practice' },
  { value: 'dental', label: 'Dental practice' },
  { value: 'specialist', label: 'Specialist practice' },
  { value: 'urgent_care', label: 'Urgent care' },
  { value: 'imaging_center', label: 'Imaging center' },
  { value: 'other', label: 'Other' },
] as const;

export type OfficeType = (typeof OFFICE_TYPES)[number]['value'];

const OFFICE_TYPE_VALUES = OFFICE_TYPES.map((type) => type.value) as [OfficeType, ...OfficeType[]];

export const practiceSchema = z.object({
  name: z.string().trim().min(2, 'Enter your practice name.').max(200),
  office_type: z.enum(OFFICE_TYPE_VALUES, { errorMap: () => ({ message: 'Select the type of practice.' }) }),
  phone: z.string().trim().refine(isValidUsPhone, PHONE_RULE),
  email: z.string().trim().min(1, 'Enter the practice email.').email('Enter a valid email address.').max(320),
  website: z
    .string()
    .trim()
    .max(300)
    .optional()
    .refine((value) => !value || normalizeWebsite(value) !== null, 'Enter a website address, like example.com.'),
  address_line1: z.string().trim().min(3, 'Enter the street address.').max(200),
  address_line2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(2, 'Enter the city.').max(120),
  state: z.enum(US_STATE_CODES, { errorMap: () => ({ message: 'Select the state.' }) }),
  postal_code: z.string().trim().regex(/^\d{5}(-\d{4})?$/, 'Enter a 5-digit ZIP code.'),
});

export type PracticeValues = z.infer<typeof practiceSchema>;

export function labelForOfficeType(value: string): string {
  return OFFICE_TYPES.find((type) => type.value === value)?.label ?? 'Practice';
}

/** "(888) 803-3370" -> "+18888033370". Stored in one form so it can be compared and dialled. */
export function normalizeUsPhone(value: string): string {
  return `+1${localPhoneDigits(value)}`;
}

/** "+18888033370" -> "(888) 803-3370". */
export function formatUsPhone(value: string): string {
  const digits = value.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
  return digits.length === 10 ? `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}` : value;
}

/**
 * "sunrise-clinic.com" -> "https://sunrise-clinic.com". Null when it is not a
 * web address at all. People rarely type the scheme, so its absence is not a
 * mistake worth refusing.
 */
export function normalizeWebsite(value: string | undefined | null): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    if (!url.hostname.includes('.') || url.hostname.endsWith('.')) return null;
    return `${url.protocol}//${url.host}${url.pathname === '/' ? '' : url.pathname}`;
  } catch {
    return null;
  }
}
