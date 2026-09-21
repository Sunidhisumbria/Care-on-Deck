/**
 * The reasons a patient can pick when booking.
 *
 * `visit_reasons` is tenant data -- each practice owns its own list, can rename
 * them and will eventually set its own durations -- so these are seeded per
 * organization when an application is approved rather than kept as one global
 * list. This file is what they are seeded from, and what the icons are matched
 * against afterwards.
 */
export const VISIT_REASON_ICONS = ['checkup', 'cold', 'chronic', 'skin', 'other'] as const;

export type VisitReasonIcon = (typeof VISIT_REASON_ICONS)[number];

export interface DefaultVisitReason {
  name: string;
  description: string;
  /** Matches the `visit_type` enum. */
  visitType: 'new_patient' | 'returning_patient' | 'consultation' | 'follow_up';
  durationMinutes: number;
  icon: VisitReasonIcon;
}

export const DEFAULT_VISIT_REASONS: DefaultVisitReason[] = [
  {
    name: 'General Check-up',
    description: 'Routine annual physical or general health check',
    visitType: 'new_patient',
    durationMinutes: 30,
    icon: 'checkup',
  },
  {
    name: 'Cold, Cough or Flu',
    description: 'Common cold, flu, sore throat, fever, etc.',
    visitType: 'new_patient',
    durationMinutes: 30,
    icon: 'cold',
  },
  {
    name: 'Chronic Condition Follow-up',
    description: 'Diabetes, hypertension, asthma, etc.',
    visitType: 'follow_up',
    durationMinutes: 30,
    icon: 'chronic',
  },
  {
    name: 'Skin or Allergy Concern',
    description: 'Rash, acne, allergies, itching, etc.',
    visitType: 'new_patient',
    durationMinutes: 30,
    icon: 'skin',
  },
  {
    name: 'Other Health Concern',
    description: 'Not sure? Let us know and we will help.',
    visitType: 'consultation',
    durationMinutes: 30,
    icon: 'other',
  },
];

/**
 * The icon for a reason, matched on the words a practice is likely to use.
 *
 * Practices can rename their reasons and add their own, so this guesses from
 * the name and falls back to the neutral icon. A wrong guess costs a picture;
 * refusing to draw anything costs the row its shape.
 */
export function iconForVisitReason(name: string): VisitReasonIcon {
  const text = name.toLowerCase();

  if (/(check.?up|physical|annual|wellness|screening)/.test(text)) return 'checkup';
  if (/(cold|cough|flu|fever|throat|sick|illness|infection)/.test(text)) return 'cold';
  if (/(chronic|follow.?up|diabet|hypertension|asthma|blood pressure)/.test(text)) return 'chronic';
  if (/(skin|allerg|rash|acne|derm|itch)/.test(text)) return 'skin';

  return 'other';
}
