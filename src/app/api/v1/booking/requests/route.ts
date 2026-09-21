/**
 * booking/requests
 *
 * Generated shape: validate, delegate, respond. All behaviour lives in the
 * module service so it can be unit-tested without an HTTP layer.
 */
import { defineRoute } from '@/server/http/handler';
import { ok } from '@/server/http/response';
import { bookingRequestSchema } from '@/server/modules/booking/booking.schemas';
import { bookingService } from '@/server/modules/booking/booking.service';

/**
 * Creates the appointment. IA: 2. Almost There -> Appointment Created
 *
 * Signed-in patients only. An appointment needs a patient record to belong to,
 * and taking one from the request body would let anyone book in someone else's
 * name -- so the patient is read from the session instead.
 */
export const POST = defineRoute({
  access: 'patient',
  body: bookingRequestSchema,
  handler: async ({ tx, ctx, body }) => ok(await bookingService.requestAppointment(tx, ctx, body)),
});
