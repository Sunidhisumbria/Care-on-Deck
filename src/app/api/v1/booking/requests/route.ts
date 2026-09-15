/**
 * booking/requests
 *
 * Generated shape: validate, delegate, respond. All behaviour lives in the
 * module service so it can be unit-tested without an HTTP layer.
 */
import { defineRoute } from '@/server/http/handler';
import { ok } from '@/server/http/response';
import { bookingService } from '@/server/modules/booking/booking.service';

/** Creates the appointment. IA: 2. Almost There -> Appointment Created */
export const POST = defineRoute({
  access: 'optional',
  handler: async ({ tx, ctx, body }) =>
    ok(await bookingService.requestAppointment(tx, ctx, body)),
});
