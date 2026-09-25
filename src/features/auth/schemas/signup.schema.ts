import { z } from 'zod';

import {
  deviceFields,
  emailField,
  newPasswordField,
  phoneField,
  roleField,
  withMatchingPasswords,
} from './shared';

/**
 * The sign-up screen, for both interfaces: the account and nothing else.
 *
 * A patient's date of birth, gender and address come next, on Create Profile
 * (skippable), or at their first booking. A provider's identity comes from the
 * NPI registry during onboarding. So both roles give the same fields here, and
 * the role only decides where verification leads.
 */
export const signupSchema = withMatchingPasswords(
  z.object({
    role: roleField,
    first_name: z.string().trim().min(1, 'Enter your first name.').max(100),
    last_name: z.string().trim().min(1, 'Enter your last name.').max(100),
    phone: phoneField,
    email: emailField,
    password: newPasswordField,
    confirm_password: z.string().min(1, 'Re-enter your password.'),
    ...deviceFields,
  }),
);

export type SignupFormValues = z.infer<typeof signupSchema>;

/** The body the API wants. */
export type SignupValues = SignupFormValues;
