/**
 * patients/appointments/[id]/cancel
 *
 * IA: 3. Appointments > Cancel. The caller's own upcoming appointment only;
 * anyone else's reads as not found.
 */
import { defineRoute } from '@/server/http/handler';
import { ok } from '@/server/http/response';
import { cancelOwnAppointmentSchema } from '@/server/modules/patients/own-appointments.schemas';
import { ownAppointmentsService } from '@/server/modules/patients/own-appointments.service';

export const POST = defineRoute<{ id: string }>({
  access: 'patient',
  body: cancelOwnAppointmentSchema,
  handler: async ({ tx, ctx, body, params }) =>
    ok(await ownAppointmentsService.cancel(tx, ctx, params.id, body)),
});
