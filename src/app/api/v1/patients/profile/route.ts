/**
 * patients/profile
 *
 * Generated shape: validate, delegate, respond. All behaviour lives in the
 * module service so it can be unit-tested without an HTTP layer.
 */
import { defineRoute } from '@/server/http/handler';
import { ok } from '@/server/http/response';
import { patientService } from '@/server/modules/patients/patient.service';

/** IA: 3. Patient Profile */
export const GET = defineRoute({
  access: 'patient',
  handler: async ({ tx, ctx }) =>
    ok(await patientService.getOwnProfile(tx, ctx)),
});

export const PATCH = defineRoute({
  access: 'patient',
  handler: async ({ tx, ctx, body }) =>
    ok(await patientService.updateOwnProfile(tx, ctx, body)),
});
