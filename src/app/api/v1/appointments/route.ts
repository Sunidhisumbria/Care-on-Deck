/**
 * appointments
 *
 * Generated shape: validate, delegate, respond. All behaviour lives in the
 * module service so it can be unit-tested without an HTTP layer.
 */
import { defineRoute } from '@/server/http/handler';
import { ok } from '@/server/http/response';
import { practiceAppointmentListSchema } from '@/server/modules/appointments/appointment.schemas';
import { appointmentService } from '@/server/modules/appointments/appointment.service';

export const GET = defineRoute({
  access: 'user',
  permissions: ['appointments.read'],
  query: practiceAppointmentListSchema,
  handler: async ({ tx, ctx, query }) =>
    ok(await appointmentService.list(tx, ctx, query)),
});

/** Staff booking on a patient's behalf. Source is recorded as 'staff'. */
export const POST = defineRoute({
  access: 'user',
  permissions: ['appointments.create'],
  handler: async ({ tx, ctx, body }) =>
    ok(await appointmentService.createForPatient(tx, ctx, body)),
});
