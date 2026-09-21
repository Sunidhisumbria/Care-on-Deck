/**
 * patients/insurance
 *
 * IA: 3. Patient Dashboard > Saved Insurance. The caller's own cards only.
 */
import { patientInsuranceSchema } from '@/lib/patient-insurance';
import { defineRoute } from '@/server/http/handler';
import { ok } from '@/server/http/response';
import { patientInsuranceService } from '@/server/modules/patients/insurance.service';

/** Member IDs arrive masked to their last four. */
export const GET = defineRoute({
  access: 'patient',
  handler: async ({ tx, ctx }) => ok(await patientInsuranceService.list(tx, ctx)),
});

/** Adds a card. Adding one already on file updates it instead of saving a copy. */
export const POST = defineRoute({
  access: 'patient',
  body: patientInsuranceSchema,
  handler: async ({ tx, ctx, body }) => ok(await patientInsuranceService.create(tx, ctx, body)),
});
