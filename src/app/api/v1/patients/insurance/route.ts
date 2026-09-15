/**
 * patients/insurance
 *
 * Generated shape: validate, delegate, respond. All behaviour lives in the
 * module service so it can be unit-tested without an HTTP layer.
 */
import { defineRoute } from '@/server/http/handler';
import { ok } from '@/server/http/response';
import { patientService } from '@/server/modules/patients/patient.service';

/** IA: 3. Patient Dashboard > Saved Insurance */
export const GET = defineRoute({
  access: 'patient',
  handler: async ({ tx, ctx }) =>
    ok(await patientService.listInsurance(tx, ctx)),
});

export const POST = defineRoute({
  access: 'patient',
  handler: async ({ tx, ctx, body }) =>
    ok(await patientService.addInsurance(tx, ctx, body)),
});
