import { z } from 'zod';

import {
  deviceFields,
  emailField,
  newPasswordField,
  phoneField,
  roleField,
  withMatchingPasswords,
} from './shared';

/** A date of birth in the past, and plausibly a person's. */
const dateOfBirthField = z
  .string()
  .min(1, 'Enter your date of birth.')
  .refine((value) => {
    const parsed = Date.parse(value);
    if (Number.isNaN(parsed)) return false;
    const years = (Date.now() - parsed) / (365.25 * 24 * 60 * 60 * 1000);
    return years >= 0 && years < 130;
  }, 'Enter a valid date of birth.');

const GENDERS = ['male', 'female', 'other'] as const;

/**
 * The sign-up screen, for both interfaces.
 *
 * One schema rather than one per role: a single form switches between them with
 * the Patient / Doctor tabs, and react-hook-form fixes its resolver when the
 * form mounts. So the patient-only fields are optional in shape and required by
 * `superRefine` when the role is patient -- the same rule the server applies
 * with a discriminated union.
 *
 * `location` is a plain string here and becomes `{ label }` on the way out --
 * see `toSignupPayload`. When the Google Places key lands, this is the field
 * that gains a place id and coordinates, and nothing else moves.
 */
export const signupSchema = withMatchingPasswords(
  z
    .object({
      role: roleField,
      first_name: z.string().trim().min(1, 'Enter your first name.').max(100),
      last_name: z.string().trim().min(1, 'Enter your last name.').max(100),
      date_of_birth: z.string().optional(),
      gender: z.string().optional(),
      phone: phoneField,
      email: emailField,
      location: z.string().trim().max(300).optional(),
      password: newPasswordField,
      confirm_password: z.string().min(1, 'Re-enter your password.'),
      ...deviceFields,
    })
    .superRefine((value, ctx) => {
      if (value.role !== 'patient') return;

      const dateOfBirth = dateOfBirthField.safeParse(value.date_of_birth ?? '');
      if (!dateOfBirth.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['date_of_birth'],
          message: dateOfBirth.error.issues[0]?.message ?? 'Enter a valid date of birth.',
        });
      }

      if (!GENDERS.includes(value.gender as (typeof GENDERS)[number])) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['gender'], message: 'Select a gender.' });
      }
    }),
);

export type SignupFormValues = z.infer<typeof signupSchema>;

/** The body the API wants: location as an object, and no patient fields for a provider. */
export type SignupValues = Omit<SignupFormValues, 'location'> & {
  location?: { label: string };
};

export function toSignupPayload(values: SignupFormValues): SignupValues {
  const { location, date_of_birth, gender, ...rest } = values;

  // A provider account has none of these. Anything typed on the patient tab
  // before switching would otherwise travel with the request.
  if (values.role === 'provider') return rest;

  return {
    ...rest,
    date_of_birth,
    gender,
    ...(location ? { location: { label: location } } : {}),
  };
}
