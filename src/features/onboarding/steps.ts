import type { ProviderStep } from './types';

/**
 * The stepper as the designs draw it: seven items, starting at Your Role.
 *
 * Account creation happens on the sign-up screen before any of this, so it is
 * not an item here. `covers` maps each item to the server steps behind it --
 * NPI is one item on screen but two steps on the server, because confirming
 * "this registry record is me" is tracked separately from looking it up.
 */
export const STEPPER = [
  { key: 'select_role', label: 'Your Role', covers: ['select_role'] },
  { key: 'npi_lookup', label: 'NPI', covers: ['npi_lookup', 'confirm_profile'] },
  { key: 'license_verification', label: 'License', covers: ['license_verification'] },
  { key: 'practice_setup', label: 'Your Practice', covers: ['practice_setup'] },
  { key: 'schedule_setup', label: 'Schedule', covers: ['schedule_setup'] },
  { key: 'insurance_setup', label: 'Accepted Insurance', covers: ['insurance_setup'] },
  { key: 'photo_uploads', label: 'Upload Profile', covers: ['photo_uploads'] },
] as const satisfies readonly { key: ProviderStep; label: string; covers: readonly ProviderStep[] }[];

export type StepperItem = (typeof STEPPER)[number];
export type StepperKey = StepperItem['key'];
export type StepperState = 'complete' | 'current' | 'upcoming';

export function stepperState(
  item: StepperItem,
  completed: readonly string[],
  current: string,
): StepperState {
  if (item.covers.every((step) => completed.includes(step))) return 'complete';
  if ((item.covers as readonly string[]).includes(current)) return 'current';
  return 'upcoming';
}

/** The stepper item a server step belongs to. Null for submit_for_review. */
export function stepperKeyFor(step: string): StepperKey | null {
  return STEPPER.find((item) => (item.covers as readonly string[]).includes(step))?.key ?? null;
}
