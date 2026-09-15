import { dependentSchema } from '@/features/patient/schemas/dependent.schema';
/**
 * patients/dependents
 *
 * Generated shape: validate, delegate, respond. All behaviour lives in the
 * module service so it can be unit-tested without an HTTP layer.
 */
import { defineRoute } from '@/server/http/handler';
import { ok } from '@/server/http/response';
import { patientService } from '@/server/modules/patients/patient.service';

/** IA: 3. Patient Account > Dependents */
export const GET = defineRoute({
  access: 'patient',
  handler: async ({ tx, ctx }) =>
    ok(await patientService.listDependents(tx, ctx)),
});

export const POST = defineRoute({
  body: dependentSchema,
  access: 'patient',
  handler: async ({ tx, ctx, body }) =>
    ok(await patientService.addDependent(tx, ctx, body)),
});
