import { z } from 'zod';

/**
 * The pieces every auth form shares.
 *
 * These mirror the server's rules but exist separately on purpose: the server
 * decides what is *accepted* and cannot be bypassed, while these decide what
 * the user is told *before* a request goes out. Where they ever disagree, the
 * server wins and its message lands on the field -- so a drift shows up as a
 * corrected error, never as bad data.
 */

export const emailField = z
  .string()
  .trim()
  .min(1, 'Enter your email address.')
  .email('Enter a valid email address.')
  .max(320);

export const phoneField = z
  .string()
  .trim()
  .min(1, 'Enter your mobile number.')
  .refine((value) => value.replace(/\D/g, '').length >= 10, 'Enter a valid mobile number.');

/**
 * Mirrors the server's rules so the form can say what is wrong before a
 * request goes out. The server is still the one that decides -- if these ever
 * drift, its message lands on the field.
 */
export const newPasswordField = z
  .string()
  .min(8, 'Use at least 8 characters.')
  .max(128, 'Use at most 128 characters.')
  .regex(/[A-Z]/, 'Include at least one capital letter.')
  .regex(/[^A-Za-z0-9]/, 'Include at least one special character.');

export const otpCodeField = z
  .string()
  .trim()
  .regex(/^\d{6}$/, 'Enter the 6-digit code.');

export const roleField = z.enum(['patient', 'provider']);

export const deviceFields = {
  device_type: z.enum(['web', 'ios', 'android']).optional(),
  device_token: z.string().max(512).optional(),
};

/** Attaches a "both passwords must match" rule to a schema that has both. */
export function withMatchingPasswords<T extends z.ZodTypeAny>(schema: T) {
  return schema.refine(
    (value: { password: string; confirm_password: string }) =>
      value.password === value.confirm_password,
    { message: 'Both passwords must match.', path: ['confirm_password'] },
  );
}
