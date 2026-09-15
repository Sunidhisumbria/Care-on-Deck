import { z } from 'zod';

import { deviceFields, emailField, phoneField, roleField } from './shared';

/** Email + password. The Sign In button on the Email Address tab. */
export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'Enter your password.').max(128),
  /**
   * Which interface is being entered. Optional: the sign-in screen does not
   * ask, so it is only set when the link that got here said so. Without it the
   * server simply answers with `user_type` and the client routes on that.
   */
  role: roleField.optional(),
  ...deviceFields,
});
export type LoginValues = z.infer<typeof loginSchema>;

/** The Mobile Number tab, which sends a code rather than checking a password. */
export const mobileLoginSchema = z.object({
  phone: phoneField,
});
export type MobileLoginValues = z.infer<typeof mobileLoginSchema>;
