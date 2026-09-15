/**
 * appointments/[id]/reschedule
 *
 * Generated shape: validate, delegate, respond. All behaviour lives in the
 * module service so it can be unit-tested without an HTTP layer.
 */
import { defineRoute } from '@/server/http/handler';
import { ok } from '@/server/http/response';
import { appointmentService } from '@/server/modules/appointments/appointment.service';

/** IA: 6. Unified Dashboard > Reschedules */
export const POST = defineRoute<{ id: string }>({
  access: 'user',
  permissions: ['appointments.update'],
  handler: async ({ tx, ctx, body, params }) =>
    ok(await appointmentService.reschedule(tx, ctx, params.id, body)),
});
