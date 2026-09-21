/**
 * patients/insurance/[id]
 *
 * IA: 3. Patient Dashboard > Saved Insurance. One of the caller's own cards;
 * anyone else's reads as not found.
 */
import { patientInsuranceSchema } from '@/lib/patient-insurance';
import { defineRoute } from '@/server/http/handler';
import { ok } from '@/server/http/response';
import { patientInsuranceService } from '@/server/modules/patients/insurance.service';

/** The card with its full member ID, for editing. Audited. */
export const GET = defineRoute<{ id: string }>({
  access: 'patient',
  handler: async ({ tx, ctx, params }) => ok(await patientInsuranceService.get(tx, ctx, params.id)),
});

export const PATCH = defineRoute<{ id: string }>({
  access: 'patient',
  body: patientInsuranceSchema,
  handler: async ({ tx, ctx, params, body }) =>
    ok(await patientInsuranceService.update(tx, ctx, params.id, body)),
});
