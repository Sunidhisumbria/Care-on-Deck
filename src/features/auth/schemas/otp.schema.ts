import { z } from 'zod';

import { deviceFields, otpCodeField, roleField } from './shared';

const purpose = z.enum(['verify_mobile', 'verify_email', 'signup', 'login', 'password_reset']);

export const sendOtpSchema = z.object({
  channel: z.enum(['sms', 'email']),
  destination: z.string().min(1),
  purpose,
});
export type SendOtpValues = z.infer<typeof sendOtpSchema>;

export const verifyOtpSchema = z.object({
  channel: z.enum(['sms', 'email']),
  destination: z.string().min(1),
  purpose,
  code: otpCodeField,
  role: roleField.optional(),
  ...deviceFields,
});
export type VerifyOtpValues = z.infer<typeof verifyOtpSchema>;

/** What the code-entry screen's form actually holds: just the six digits. */
export const otpFormSchema = z.object({ code: otpCodeField });
export type OtpFormValues = z.infer<typeof otpFormSchema>;
