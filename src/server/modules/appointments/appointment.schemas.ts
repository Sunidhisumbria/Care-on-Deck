import { z } from 'zod';

/** The Appointments screen's tabs, in the practice's words. */
export const PRACTICE_TABS = ['upcoming', 'pending', 'completed', 'canceled', 'no_show'] as const;
export type PracticeTab = (typeof PRACTICE_TABS)[number];

export const practiceAppointmentListSchema = z.object({
  tab: z.enum(PRACTICE_TABS).default('upcoming'),
  /** Patient name or booking reference. */
  q: z.string().trim().max(100).optional(),
});
export type PracticeAppointmentListQuery = z.infer<typeof practiceAppointmentListSchema>;

/** Why the practice is cancelling. The reasons are the Cancel dialog's list. */
export const CANCEL_REASONS = [
  'Provider unavailable',
  'Schedule conflict',
  'Clinic closure',
  'Patient request',
  'Other',
] as const;

export const practiceCancelSchema = z
  .object({
    reason: z.enum(CANCEL_REASONS, { errorMap: () => ({ message: 'Select a reason.' }) }),
    /** Shown to the patient in their notification. Never clinical. */
    message: z.string().trim().max(500, 'Keep the message under 500 characters.').nullish(),
  })
  .strict();
export type PracticeCancelInput = z.infer<typeof practiceCancelSchema>;

export const practiceRescheduleSchema = z
  .object({
    starts_at: z.string().datetime({ message: 'Choose a new time.' }),
    /** The dialog's "Notify patient about this schedule change?". */
    notify: z.boolean().default(true),
  })
  .strict();
export type PracticeRescheduleInput = z.infer<typeof practiceRescheduleSchema>;
