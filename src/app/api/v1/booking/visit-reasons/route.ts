/**
 * booking/visit-reasons
 *
 * Generated shape: validate, delegate, respond. All behaviour lives in the
 * module service so it can be unit-tested without an HTTP layer.
 */
import { defineRoute } from '@/server/http/handler';
import { ok } from '@/server/http/response';
import { visitReasonsQuerySchema } from '@/server/modules/booking/booking.schemas';
import { bookingService } from '@/server/modules/booking/booking.service';

/** IA: 2. Patient Booking > Select Visit Reason */
export const GET = defineRoute({
  access: 'public',
  query: visitReasonsQuerySchema,
  handler: async ({ tx, query }) => ok(await bookingService.listVisitReasons(tx, query)),
});
