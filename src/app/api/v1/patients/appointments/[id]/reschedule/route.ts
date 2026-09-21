/**
 * patients/appointments/[id]/reschedule
 *
 * IA: 3. Appointments > Reschedule. Books the new time and supersedes the old
 * appointment in one transaction.
 */
import { defineRoute } from '@/server/http/handler';
import { ok } from '@/server/http/response';
import { rescheduleOwnAppointmentSchema } from '@/server/modules/patients/own-appointments.schemas';
import { ownAppointmentsService } from '@/server/modules/patients/own-appointments.service';

export const POST = defineRoute<{ id: string }>({
  access: 'patient',
  body: rescheduleOwnAppointmentSchema,
  handler: async ({ tx, ctx, body, params }) =>
    ok(await ownAppointmentsService.reschedule(tx, ctx, params.id, body)),
});
