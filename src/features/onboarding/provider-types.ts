import type { ProviderType } from './types';

/**
 * The provider types, as the Your Role screen words them.
 *
 * Kept apart from that screen because the NPI step needs the same words when it
 * tells an applicant "the registry lists you as a dentist, but you chose Doctor
 * Physician" -- two copies of these labels would eventually disagree.
 */
export const PROVIDER_TYPES: { value: ProviderType; title: string; caption: string }[] = [
  {
    value: 'physician',
    title: 'Doctor Physician',
    caption: 'Provide general medical care and treat a wide range of health conditions.',
  },
  {
    value: 'dentist',
    title: 'Dentist',
    caption: 'Prevent, diagnose, and treat dental and oral health conditions.',
  },
  {
    value: 'therapist',
    title: 'Therapist/Counselor',
    caption: 'Provide mental health support and counselling services.',
  },
  {
    value: 'nurse_practitioner',
    title: 'Nurse Practitioner',
    caption: 'Assess, diagnose, and manage common health conditions.',
  },
  {
    value: 'other',
    title: 'Other Provider',
    caption: 'Select this option if your role is not listed above.',
  },
];

export function providerTypeLabel(type: ProviderType | null | undefined): string {
  return PROVIDER_TYPES.find((entry) => entry.value === type)?.title ?? 'a provider type';
}
