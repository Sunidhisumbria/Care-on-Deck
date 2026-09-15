import { z } from 'zod';

import { emailField, newPasswordField, withMatchingPasswords } from './shared';

export const forgotPasswordSchema = z.object({ email: emailField });
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = withMatchingPasswords(
  z.object({
    password: newPasswordField,
    confirm_password: z.string().min(1, 'Re-enter your password.'),
  }),
);
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

/**
 * Changing a password while signed in. Same new-password rules as a reset --
 * they come from `newPasswordField`, so the two cannot drift -- plus the
 * current password, which proves it is really them rather than someone at an
 * unlocked laptop.
 */
export const changePasswordSchema = withMatchingPasswords(
  z.object({
    current_password: z.string().min(1, 'Enter your current password.'),
    password: newPasswordField,
    confirm_password: z.string().min(1, 'Re-enter your password.'),
  }),
);
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;
