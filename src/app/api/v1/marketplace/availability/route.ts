/**
 * marketplace/availability
 *
 * Generated shape: validate, delegate, respond. All behaviour lives in the
 * module service so it can be unit-tested without an HTTP layer.
 */
import { defineRoute } from '@/server/http/handler';
import { ok } from '@/server/http/response';
import { bookableSlotsQuerySchema } from '@/server/modules/scheduling/scheduling.schemas';
import { schedulingService } from '@/server/modules/scheduling/scheduling.service';

/** Open slots for the booking picker. IA: 2. Select Date / Select Time */
export const GET = defineRoute({
  access: 'public',
  query: bookableSlotsQuerySchema,
  handler: async ({ tx, query }) => ok(await schedulingService.getBookableSlots(tx, query)),
});
