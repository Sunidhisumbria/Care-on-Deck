import { z } from 'zod';

import { deviceFields, emailField, phoneField, roleField } from './shared';

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'Enter your password.').max(128),
 
  role: roleField.optional(),
  ...deviceFields,
});
export type LoginValues = z.infer<typeof loginSchema>;

/** The Mobile Number tab, which sends a code rather than checking a password. */
export const mobileLoginSchema = z.object({
  phone: phoneField,
});
export type MobileLoginValues = z.infer<typeof mobileLoginSchema>;
