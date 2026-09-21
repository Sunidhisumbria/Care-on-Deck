/**
 * patients/appointments
 *
 * Generated shape: validate, delegate, respond. All behaviour lives in the
 * module service so it can be unit-tested without an HTTP layer.
 */
import { defineRoute } from '@/server/http/handler';
import { ok } from '@/server/http/response';
import { appointmentListQuerySchema } from '@/server/modules/patients/own-appointments.schemas';
import { patientService } from '@/server/modules/patients/patient.service';

/** IA: 3. Patient Dashboard > Upcoming / Completed / Canceled. `?status=` picks the tab. */
export const GET = defineRoute({
  access: 'patient',
  query: appointmentListQuerySchema,
  handler: async ({ tx, ctx, query }) =>
    ok(await patientService.listOwnAppointments(tx, ctx, query.status)),
});
