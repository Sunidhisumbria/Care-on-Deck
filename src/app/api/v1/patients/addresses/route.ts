/**
 * patients/addresses
 *
 * Generated shape: validate, delegate, respond. All behaviour lives in the
 * module service so it can be unit-tested without an HTTP layer.
 */
import { defineRoute } from '@/server/http/handler';
import { ok } from '@/server/http/response';
import { patientService } from '@/server/modules/patients/patient.service';

/** IA: 3. Patient Dashboard > Saved Address */
export const GET = defineRoute({
  access: 'patient',
  handler: async ({ tx, ctx }) =>
    ok(await patientService.listAddresses(tx, ctx)),
});

export const POST = defineRoute({
  access: 'patient',
  handler: async ({ tx, ctx, body }) =>
    ok(await patientService.addAddress(tx, ctx, body)),
});
