/**
 * appointments/[id]/cancel
 *
 * Generated shape: validate, delegate, respond. All behaviour lives in the
 * module service so it can be unit-tested without an HTTP layer.
 */
import { defineRoute } from '@/server/http/handler';
import { ok } from '@/server/http/response';
import { practiceCancelSchema } from '@/server/modules/appointments/appointment.schemas';
import { appointmentService } from '@/server/modules/appointments/appointment.service';

/** IA: 13. Reports > Cancellation Reason */
export const POST = defineRoute<{ id: string }>({
  access: 'user',
  permissions: ['appointments.cancel'],
  body: practiceCancelSchema,
  handler: async ({ tx, ctx, body, params }) =>
    ok(await appointmentService.cancel(tx, ctx, params.id, body)),
});
