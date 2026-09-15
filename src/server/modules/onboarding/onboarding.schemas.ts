import { z } from 'zod';

import { acceptedInsuranceSchema } from '@/lib/accepted-insurance';
import { licenseSchema } from '@/lib/license';
import { npiField } from '@/lib/npi';
import { practiceSchema } from '@/lib/practice';
import { profileSchema } from '@/lib/profile';
import { scheduleSchema } from '@/lib/schedule';

/**
 * The provider application, step by step.
 *
 * These keys are a contract between three things that must agree: the
 * onboarding screens, what `onboarding_sessions.completed_steps` records, and
 * what a reviewer points at in `approval_requests.requested_changes` when they
 * send an application back. Renaming one is a data migration, not a refactor.
 *
 * `verify_mobile` from the IA is deliberately absent. Whether someone has
 * proved a contact is already recorded on `users` (`phone_verified_at`,
 * `email_verified_at`). Tracking it here as well would give two answers to one
 * question -- and the designs verify by email or text, not by mobile alone.
 */
export const PROVIDER_STEPS = [
  'create_account',
  'select_role',
  'npi_lookup',
  'confirm_profile',
  'license_verification',
  'practice_setup',
  'schedule_setup',
  'insurance_setup',
  'photo_uploads',
  'submit_for_review',
] as const;

export type ProviderStep = (typeof PROVIDER_STEPS)[number];

/** Recorded by sign-up itself, never saved through the step endpoint. */
export const AUTOMATIC_STEPS: readonly ProviderStep[] = ['create_account'];

/** The statuses in which an applicant may still change their answers. */
export const EDITABLE_STATUSES: readonly string[] = ['in_progress', 'needs_changes'];

/**
 * IA: 4. Provider Onboarding > Select Role.
 *
 * `other` stays until the client decides whether it needs an NPI, or whether
 * it should be replaced by named roles.
 */
export const providerTypeSchema = z.enum([
  'physician',
  'dentist',
  'therapist',
  'nurse_practitioner',
  'other',
]);
export type ProviderType = z.infer<typeof providerTypeSchema>;

/**
 * What each step accepts from the client.
 *
 * A step missing from this map has no screen yet, and saving it is refused
 * rather than storing whatever arrives. Each schema is `.strict()` for the same
 * reason: an unexpected field is a bug or a probe, never data worth keeping.
 *
 * These are the inputs only. For the NPI steps the stored answer is built by the
 * server from them -- see `buildAnswer` in the service.
 */
export const PROVIDER_STEP_DATA: Partial<Record<ProviderStep, z.ZodTypeAny>> = {
  select_role: z.object({ provider_type: providerTypeSchema }).strict(),
  /** The number only. The registry record is fetched by the server, never taken from the client. */
  npi_lookup: z.object({ npi: npiField }).strict(),
  /** An explicit yes. What it flags is worked out by the server when it is given. */
  confirm_profile: z
    .object({
      confirmed: z.literal(true, {
        errorMap: () => ({ message: 'Confirm this is your profile to continue.' }),
      }),
    })
    .strict(),
  /** State, number and expiry. Whether it agrees with the NPI record is worked out by the server. */
  license_verification: licenseSchema.strict(),
  practice_setup: practiceSchema.strict(),
  schedule_setup: scheduleSchema,
  /** Carrier ids only. Whether they exist, and their names, come from the directory. */
  insurance_setup: acceptedInsuranceSchema,
  /** Upload ids only. Whether they are the applicant's own files is checked by the server. */
  photo_uploads: profileSchema,
};

/** An explicit yes that the application is accurate, like Confirm Profile. */
export const submitApplicationSchema = z
  .object({
    attested: z.literal(true, {
      errorMap: () => ({ message: 'Confirm the information is accurate to submit.' }),
    }),
  })
  .strict();
export type SubmitApplicationInput = z.infer<typeof submitApplicationSchema>;

/**
 * What to discard when an earlier answer changes.
 *
 * Confirming a profile means "this registry record is me". If the NPI is then
 * changed, that confirmation -- and everything pre-filled from the old record --
 * describes a different person, and keeping it produces an application mixing
 * two doctors' details. Changing the role reopens confirmation too, because the
 * role is checked against the registry's taxonomy at that step.
 */
export const INVALIDATES: Partial<Record<ProviderStep, readonly ProviderStep[]>> = {
  select_role: ['confirm_profile'],
  npi_lookup: ['confirm_profile', 'license_verification', 'practice_setup'],
};

/**
 * Which part of a stored answer decides whether it "changed".
 *
 * An NPI lookup stores a timestamp and a freshly fetched record alongside the
 * number, so comparing whole answers would call every re-save a change and
 * throw away the applicant's later steps. It is the number that matters.
 */
export const STEP_IDENTITY: Partial<Record<ProviderStep, (answer: unknown) => unknown>> = {
  npi_lookup: (answer) => (answer as { npi?: unknown } | null)?.npi,
};

export const npiLookupQuerySchema = z.object({ npi: npiField });
export type NpiLookupQuery = z.infer<typeof npiLookupQuerySchema>;

export const startOnboardingSchema = z.object({
  kind: z.enum(['provider', 'office']).default('provider'),
});
export type StartOnboardingInput = z.infer<typeof startOnboardingSchema>;

export const saveStepSchema = z.object({
  step: z.enum(PROVIDER_STEPS),
  data: z.record(z.unknown()),
});
export type SaveStepInput = z.infer<typeof saveStepSchema>;
