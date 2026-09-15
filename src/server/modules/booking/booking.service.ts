/**
 * The booking funnel, from Select Provider through Appointment Created.
 *
 * The critical section is requestAppointment: it must re-check availability
 * inside the same transaction that inserts the appointment. Checking first and
 * inserting after is a race two patients will find within a week. The exclusion
 * constraint on `appointments` is the backstop when they do.
 *
 * IA: 2. Patient Booking
 */
import type { RequestContext } from '@/server/auth/context';
import type { Tx } from '@/server/db/tenant';
import { notImplemented } from '@/server/http/response';

export const bookingService = {
  /** IA: 2. Patient Booking > Select Visit Reason */
  async listVisitReasons(tx: Tx, query: unknown): Promise<unknown> {
    return notImplemented('bookingService.listVisitReasons');
  },

  /**
   * Creates or matches the patient, freezes the demographic snapshot, and
   * inserts the appointment. Attributes the booking to its source so Pulse and
   * Direct can be credited. IA: 2. Almost There -> Appointment Created
   */
  async requestAppointment(tx: Tx, ctx: RequestContext, body: unknown): Promise<unknown> {
    return notImplemented('bookingService.requestAppointment');
  },

  /** IA: 2. Appointment Created > Confetti Success, Next Steps */
  async getConfirmation(tx: Tx, reference: string): Promise<unknown> {
    return notImplemented('bookingService.getConfirmation');
  },
};
