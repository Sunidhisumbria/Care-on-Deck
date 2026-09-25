import { z } from 'zod';

import { insuranceCardFields, RELATIONSHIPS } from './patient-insurance';
import { isValidUsPhone, PHONE_RULE } from './phone';
import { US_STATE_CODES } from './us-states';

/**
 * The Edit Profile screen, as the form and the server both check it.
 *
 * Email and phone are deliberately absent. They are how the patient signs in,
 * and changing one without proving the new address or number is theirs would
 * let anyone holding an open session take the account. That is a verified
 * flow of its own, not a text box here.
 */

/**
 * Sex assigned at birth -- required, and what practices and payers ask for.
 * Stored in `patients.gender`. Separate from gender identity, per the client's
 * profile spec (Patient_Information_Fields).
 */
export const GENDERS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
] as const;

/**
 * Gender identity -- optional, in the patient's terms. The labels and stored
 * values are the client's Gender_database sheet, exactly.
 */
export const GENDER_IDENTITIES = [
  { value: 'woman', label: 'Woman' },
  { value: 'man', label: 'Man' },
  { value: 'transgender_woman', label: 'Transgender woman' },
  { value: 'transgender_man', label: 'Transgender man' },
  { value: 'nonbinary', label: 'Nonbinary' },
  { value: 'genderqueer', label: 'Genderqueer' },
  { value: 'questioning_unsure', label: 'Questioning / unsure' },
  { value: 'gender_not_listed', label: 'A gender not listed' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
] as const;

/** Mobile or Home, per the spec: whether texts can reach the number. */
export const PHONE_TYPES = [
  { value: 'mobile', label: 'Mobile' },
  { value: 'home', label: 'Home' },
] as const;

/** The languages US practices most often staff for. A patient picks their preferred one. */
export const LANGUAGES = [
  'English',
  'Spanish',
  'Chinese',
  'Vietnamese',
  'Tagalog',
  'Arabic',
  'French',
  'Korean',
  'Russian',
  'Hindi',
  'Portuguese',
] as const;

type Gender = (typeof GENDERS)[number]['value'];
type GenderIdentity = (typeof GENDER_IDENTITIES)[number]['value'];
type PhoneType = (typeof PHONE_TYPES)[number]['value'];
type Language = (typeof LANGUAGES)[number];

const GENDER_VALUES = GENDERS.map((entry) => entry.value) as [Gender, ...Gender[]];
const GENDER_IDENTITY_VALUES = GENDER_IDENTITIES.map((entry) => entry.value) as [GenderIdentity, ...GenderIdentity[]];
const PHONE_TYPE_VALUES = PHONE_TYPES.map((entry) => entry.value) as [PhoneType, ...PhoneType[]];
const LANGUAGE_VALUES = [...LANGUAGES] as [Language, ...Language[]];
type Relationship = (typeof RELATIONSHIPS)[number]['value'];
const RELATIONSHIP_VALUES = RELATIONSHIPS.map((entry) => entry.value) as [Relationship, ...Relationship[]];

/**
 * Any postal code, not only a US ZIP, so addresses outside the US can be used
 * while testing. 12 characters is the column's size: longer would fail in the
 * database instead of here.
 */
const POSTAL_CODE_MAX = 12;

/** A real calendar date, not in the future, not before 1900. */
export function isValidDateOfBirth(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value &&
    value >= '1900-01-01' &&
    value <= new Date().toISOString().slice(0, 10)
  );
}

const optionalText = (max: number, message: string) => z.string().trim().max(max, message).nullable();
const media = (message: string) => z.string().uuid(message).nullable();

export const profileAddressSchema = z
  .object({
    line1: z.string().trim().min(1, 'Enter your street address.').max(200, 'Keep the street under 200 characters.'),
    line2: optionalText(200, 'Keep the apartment under 200 characters.'),
    city: z.string().trim().min(1, 'Enter your city.').max(120, 'Keep the city under 120 characters.'),
    state: z.enum(US_STATE_CODES, { errorMap: () => ({ message: 'Select your state.' }) }),
    postal_code: z
      .string()
      .trim()
      .min(1, 'Enter a postal code.')
      .max(POSTAL_CODE_MAX, `Keep the postal code to ${POSTAL_CODE_MAX} characters.`),
  })
  .strict();

/** The primary card on file, edited in place. Its type and policyholder are kept as they are. */
export const profileInsuranceSchema = z
  .object({
    id: z.string().uuid(),
    carrier_id: z.string().uuid('Select your insurance carrier.').nullable(),
    ...insuranceCardFields,
    relationship: z.enum(RELATIONSHIP_VALUES, { errorMap: () => ({ message: 'Select your relationship to the policyholder.' }) }),
    card_media_id: media('That card photo was not recognised. Upload it again.'),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (!value.carrier_id && !value.carrier_name) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['carrier_id'], message: 'Select your insurance carrier.' });
    }
  });

/** What `PATCH /patients/profile` accepts. Blank optional fields arrive as null. */
export const profileUpdateSchema = z
  .object({
    preferred_name: optionalText(100, 'Keep your preferred name under 100 characters.'),
    date_of_birth: z.string().refine(isValidDateOfBirth, 'Enter a valid date of birth that is not in the future.'),
    gender: z.enum(GENDER_VALUES, { errorMap: () => ({ message: 'Select your sex assigned at birth.' }) }),
    gender_identity: z.enum(GENDER_IDENTITY_VALUES).nullable(),
    language: z.enum(LANGUAGE_VALUES, { errorMap: () => ({ message: 'Select a language.' }) }),
    phone_type: z.enum(PHONE_TYPE_VALUES, { errorMap: () => ({ message: 'Select a phone type.' }) }).nullable(),
    /** "+ Add secondary phone". A contact number only; it never signs anyone in. */
    secondary_phone: z.string().trim().refine(isValidUsPhone, PHONE_RULE).nullable(),
    secondary_phone_type: z.enum(PHONE_TYPE_VALUES, { errorMap: () => ({ message: 'Select a phone type.' }) }).nullable(),
    photo_media_id: media('That photo was not recognised. Upload it again.'),
    /** Null leaves the address on file as it is. */
    address: profileAddressSchema.nullable(),
    /** Absent when there is no card on file to edit. */
    insurance: profileInsuranceSchema.optional(),
  })
  .strict();

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
