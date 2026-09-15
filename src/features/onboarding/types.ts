/**
 * The onboarding wire types. Snake_case, matching the API.
 *
 * Step keys mirror `PROVIDER_STEPS` on the server. They are also what a
 * reviewer's requested changes point at, so they are not free to rename.
 */
import type { ProfileFlag } from '@/lib/npi';

export type { NpiLookupAnswer, NpiProfile, ProfileFlag } from '@/lib/npi';

export type OnboardingStatus =
  | 'in_progress'
  | 'submitted'
  | 'needs_changes'
  | 'approved'
  | 'rejected'
  | 'abandoned';

export type ProviderStep =
  | 'create_account'
  | 'select_role'
  | 'npi_lookup'
  | 'confirm_profile'
  | 'license_verification'
  | 'practice_setup'
  | 'schedule_setup'
  | 'insurance_setup'
  | 'photo_uploads'
  | 'submit_for_review';

export type ProviderType = 'physician' | 'dentist' | 'therapist' | 'nurse_practitioner' | 'other';

/** What `confirm_profile` stores. The flags are worked out by the server when it is saved. */
export interface ConfirmProfileAnswer {
  confirmed: true;
  confirmed_at: string;
  flags: ProfileFlag[];
}

/** One entry in the insurance directory. */
export interface InsuranceCarrier {
  id: string;
  name: string;
  slug: string;
}

export interface OnboardingSession {
  id: string;
  kind: 'provider' | 'office';
  status: OnboardingStatus;
  current_step: ProviderStep;
  completed_steps: ProviderStep[];
  /** Each saved step's answers, keyed by step. */
  draft: Partial<Record<ProviderStep, Record<string, unknown>>>;
  reviewer_note: string | null;
  submitted_at: string | null;
  last_active_at: string;
}
