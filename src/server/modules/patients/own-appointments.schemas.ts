import { z } from 'zod';

/** Which of the Appointments tabs is being read. Upcoming unless asked otherwise. */
export const appointmentListQuerySchema = z.object({
  status: z.enum(['upcoming', 'completed', 'canceled']).default('upcoming'),
});

export type AppointmentListStatus = z.infer<typeof appointmentListQuerySchema>['status'];

/** Why the patient is cancelling. Optional, and never a medical record. */
export const cancelOwnAppointmentSchema = z
  .object({
    reason: z.string().trim().max(300, 'Keep this under 300 characters.').nullish(),
  })
  .strict();

export type CancelOwnAppointmentInput = z.infer<typeof cancelOwnAppointmentSchema>;

/** The new time, by its start instant. The server checks it is really open. */
export const rescheduleOwnAppointmentSchema = z
  .object({
    starts_at: z.string().datetime({ message: 'Choose a new time.' }),
  })
  .strict();

export type RescheduleOwnAppointmentInput = z.infer<typeof rescheduleOwnAppointmentSchema>;
