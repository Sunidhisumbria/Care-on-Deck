/**
 * patients/appointments/[id]
 *
 * Generated shape: validate, delegate, respond. All behaviour lives in the
 * module service so it can be unit-tested without an HTTP layer.
 */
import { defineRoute } from '@/server/http/handler';
import { ok } from '@/server/http/response';
import { patientService } from '@/server/modules/patients/patient.service';

/** IA: 3. Appointments > View Details. The caller's own appointment only. */
export const GET = defineRoute<{ id: string }>({
  access: 'patient',
  handler: async ({ tx, ctx, params }) => ok(await patientService.getOwnAppointment(tx, ctx, params.id)),
});
