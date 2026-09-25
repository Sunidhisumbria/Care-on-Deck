import { z } from 'zod';

import { isValidUsPhone, PHONE_RULE } from '@/lib/phone';


export function normalizePhone(raw: string): string {
  const trimmed = raw.trim();
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  if (hasPlus) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return `+${digits}`;
}

export const phoneSchema = z
  .string()
  .trim()
  .min(7, 'Enter a mobile number.')
  .transform(normalizePhone)
  .refine((v) => /^\+[1-9]\d{7,14}$/.test(v), 'Enter a valid mobile number.')
  // The app only takes +1 numbers, 8 to 14 digits after the code -- see lib/phone.
  .refine(isValidUsPhone, PHONE_RULE);

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Enter a valid email address.')
  .max(320);

/**
 * Password rules.
 *
 * The upper bound is not cosmetic: without it a multi-megabyte string would be
 * fed to scrypt, which is deliberately slow, and a handful of those in
 * parallel is a denial of service.
 *
 * Each rule carries its own message so the form can tell the person which one
 * they missed, rather than restating all of them and leaving them to guess.
 */
export const passwordSchema = z
  .string()
  .min(8, 'Use at least 8 characters.')
  .max(128, 'Use at most 128 characters.')
  .regex(/[A-Z]/, 'Include at least one capital letter.')
  .regex(/[^A-Za-z0-9]/, 'Include at least one special character.');

export const otpCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, 'Enter the 6-digit code.');

/**
 * Which side of the marketplace a request is for -- the Doctor / Patient
 * choice in the header, and the `?role=` the screens carry.
 *
 * At signup it decides what to create. At sign-in it is *checked*, never
 * trusted: the server compares it with `users.type` and refuses a mismatch,
 * so a patient signing in through the provider entrance gets told so instead
 * of landing in the wrong interface. A role in a request body can therefore
 * never grant anything -- it can only narrow what is allowed.
 */
export const interfaceRoleSchema = z.enum(['patient', 'provider']);
export type InterfaceRole = z.infer<typeof interfaceRoleSchema>;

/**
 * Where the session is being created from, so push notifications have a
 * target. Every sign-in path takes these -- password, one-time code and
 * social -- because a user who signs in on a second device must receive
 * appointment reminders on it too.
 *
 * Both are optional: the web app has no push token until the browser grants
 * permission, and a sign-in must never fail for want of one.
 */
export const deviceFields = {
  device_token: z.string().trim().max(512).optional(),
  device_type: z.enum(['web', 'ios', 'android']).optional(),
};

/**
 * What a code is for. The hash stored for a code is bound to its purpose, so a
 * code sent to verify a phone number cannot be replayed to reset a password.
 */
export const otpPurposeSchema = z.enum([
  'verify_mobile',
  'verify_email',
  'signup',
  'login',
  'password_reset',
]);
export type OtpPurpose = z.infer<typeof otpPurposeSchema>;

const otpTarget = z.discriminatedUnion('channel', [
  z.object({ channel: z.literal('sms'), destination: phoneSchema }),
  z.object({ channel: z.literal('email'), destination: emailSchema }),
  
]);

export const sendOtpSchema = z.intersection(otpTarget, z.object({ purpose: otpPurposeSchema }));

/** Change the email or phone you sign in with: where the code should go. */
export const changeContactSchema = otpTarget;
export type ChangeContactInput = z.infer<typeof changeContactSchema>;

/** ...and the code that arrived there. */
export const confirmContactChangeSchema = z.intersection(otpTarget, z.object({ code: otpCodeSchema }));
export type ConfirmContactChangeInput = z.infer<typeof confirmContactChangeSchema>;
export type SendOtpInput = z.infer<typeof sendOtpSchema>;

export const verifyOtpSchema = z.intersection(
  otpTarget,
  z.object({
    purpose: otpPurposeSchema,
    code: otpCodeSchema,
    role: interfaceRoleSchema.optional(),
    ...deviceFields,
  }),
);
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;

/** The Gender dropdown on the signup screen. */
export const genderSchema = z.enum(['male', 'female', 'other']);

/**
 * A date of birth in the past, and plausibly a person's.
 * Accepts YYYY-MM-DD, which is what a date input submits.
 */
export const dateOfBirthSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a date of birth.')
  .refine((value) => {
    const parsed = Date.parse(value);
    if (Number.isNaN(parsed)) return false;
    const age = (Date.now() - parsed) / (365.25 * 24 * 60 * 60 * 1000);
    return age >= 0 && age < 130;
  }, 'Enter a valid date of birth.');

/**
 * The Location field, as Google Places autocomplete returns it.
 *
 * The browser SDK already hands the client a place id, a label and
 * coordinates, so the server stores what it is given rather than making its
 * own Places call. `label` is the only part required -- until the Maps key
 * arrives the frontend can send just the text the user picked, and the rest
 * fills in later without an API change.
 */
export const locationSchema = z.object({
  place_id: z.string().trim().max(255).optional(),
  label: z.string().trim().min(1).max(300),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});
export type LocationInput = z.infer<typeof locationSchema>;

/**
 * Sign-up, for both interfaces -- the fields on the sign-up screen.
 *
 * A discriminated union on `role`, because the two kinds of account do not share
 * a field list. A patient's date of birth, gender and address come afterwards,
 * on Create Profile or at their first booking, so signup stays to the account
 * itself; they are still accepted here, optionally, for older clients. A
 * provider gives none of those: their identity is
 * established against the NPI registry during onboarding, and asking a doctor
 * for a birthday and a home town here would collect personal data with no use.
 *
 * `role` defaults to patient when it is omitted, as it always has.
 *
 * Either way the account is created unverified; proving a contact is what signs
 * someone in -- see `verifyOtp`.
 */
const signupShared = {
  first_name: z.string().trim().min(1, 'Enter your first name.').max(100),
  last_name: z.string().trim().min(1, 'Enter your last name.').max(100),
  phone: phoneSchema,
  email: emailSchema,
  password: passwordSchema,
  /**
   * Checked here as well as in the browser. The client should catch it first,
   * but the server is the only side that cannot be bypassed.
   */
  confirm_password: z.string(),
  ...deviceFields,
};

const patientSignupSchema = z.object({
  role: z.literal('patient'),
  ...signupShared,
  date_of_birth: dateOfBirthSchema.optional(),
  gender: genderSchema.optional(),
  location: locationSchema.optional(),
});

const providerSignupSchema = z.object({
  role: z.literal('provider'),
  ...signupShared,
});

export const signupSchema = z
  .preprocess(
    (value) =>
      value !== null && typeof value === 'object' && (value as { role?: unknown }).role === undefined
        ? { ...value, role: 'patient' }
        : value,
    z.discriminatedUnion('role', [patientSignupSchema, providerSignupSchema]),
  )
  .refine((value) => value.password === value.confirm_password, {
    message: 'Both passwords must match.',
    path: ['confirm_password'],
  });
export type SignupInput = z.infer<typeof signupSchema>;

/**
 * Email + password sign-in.
 *
 * The Mobile Number tab on the same screen is not a variant of this: it sends
 * a one-time code instead, through POST /auth/otp with purpose `login` and
 * then /auth/otp/verify. No password is involved on that path.
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password.').max(128),
  /** Which interface is being signed into. Checked against the account. */
  role: interfaceRoleSchema.optional(),
  ...deviceFields,
});
export type LoginInput = z.infer<typeof loginSchema>;

/** Starts a reset by sending a code to the account's email. */
export const forgotPasswordSchema = z.object({
  email: emailSchema,
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

/**
 * Changes the password of whoever is signed in.
 *
 * The current password is proof it is really them at the keyboard rather than
 * someone who walked up to an unlocked laptop, so it is required even though
 * the session already authenticates the request.
 */
export const changePasswordSchema = z.object({
  current_password: z.string().min(1, 'Enter your current password.'),
  password: passwordSchema,
});
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

/**
 * Completes a reset. The proof from /auth/otp/verify arrives in the
 * `x-verification-token` header, not here -- see server/http/headers.ts.
 */
export const resetPasswordBodySchema = z.object({
  password: passwordSchema,
});

/** What the service receives: the body plus the token the route read. */
export type ResetPasswordInput = z.infer<typeof resetPasswordBodySchema> & {
  verification_token: string;
};

/**
 * Google and Apple sign-in.
 *
 * The browser completes the provider handshake and hands us the resulting ID
 * token; the server verifies it and issues its own session. No password is
 * involved and none is stored -- a social-only account simply has no row in
 * `user_credentials`.
 *
 * `first_name` / `last_name` exist for Apple specifically: it returns the
 * person's name only on the very first authorisation and never again, so the
 * client must pass it through on that one occasion or the account is stuck
 * without one.
 */
export const socialProviderSchema = z.enum(['google', 'apple']);
export type SocialProvider = z.infer<typeof socialProviderSchema>;

export const socialSignInBodySchema = z.object({
  social_type: socialProviderSchema,
  /**
   * The account id the client believes it authenticated. Checked against the
   * token and rejected if they disagree -- a client-supplied id on its own
   * would let anyone claim any account.
   */
  social_id: z.string().trim().min(1),
  /** Likewise informational; the address used is the one inside the token. */
  email: emailSchema.optional(),
  /** Apple returns a name only on the first authorisation, so it comes here. */
  first_name: z.string().trim().max(100).optional(),
  last_name: z.string().trim().max(100).optional(),
  /** Which interface is being signed into. Checked against the account. */
  role: interfaceRoleSchema.optional(),
  ...deviceFields,
});
/**
 * What the service receives. The provider's ID token -- the only field that is
 * actually trusted -- arrives in the `x-provider-token` header.
 */
export type SocialSignInInput = z.infer<typeof socialSignInBodySchema> & { token: string };

/*
 * Refreshing takes no body at all: the token comes from the
 * `x-refresh-token` header, or from the session cookie for browsers.
 */

export const switchOrganizationSchema = z.object({
  organization_id: z.string().uuid(),
  facility_id: z.string().uuid().nullable().optional(),
});
export type SwitchOrganizationInput = z.infer<typeof switchOrganizationSchema>;
