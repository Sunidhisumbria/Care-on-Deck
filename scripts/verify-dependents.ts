/** Rollback-only integration check: npm exec tsx scripts/verify-dependents.ts */
import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { eq, sql as raw } from 'drizzle-orm';
import { db, sql } from '../src/server/db/client';
import { patients, patientDependents, users } from '../src/server/db/schema';
import { patientService } from '../src/server/modules/patients/patient.service';
import { dependentSchema } from '../src/features/patient/schemas/dependent.schema';
import type { RequestContext } from '../src/server/auth/context';

const rollback = new Error('ROLLBACK_FIXTURES');
const guardianUser = randomUUID();
const otherUser = randomUUID();
const guardianPatient = randomUUID();
const otherPatient = randomUUID();
const input = { first_name: 'Test', last_name: 'Dependent', date_of_birth: '2016-06-12', gender: 'female', relationship: 'Daughter', phone: '' };
const context = (userId: string): RequestContext => ({
  requestId: randomUUID(), session: { sessionId: randomUUID(), userId, userType: 'patient', activeOrganizationId: null, activeFacilityId: null },
  organizationId: null, facilityId: null, permissions: new Set(), isInternal: false, ipAddress: null, userAgent: 'verify-dependents',
});
async function main() {
  assert.equal(dependentSchema.safeParse({ ...input, date_of_birth: '2026-02-30' }).success, false);
  assert.equal(dependentSchema.safeParse({ ...input, date_of_birth: '2999-01-01' }).success, false);
  assert.equal(dependentSchema.safeParse({ ...input, first_name: ' ' }).success, false);
  console.log('PASS invalid dates and empty names rejected');
  try {
    await db.transaction(async tx => {
      const role = await tx.execute(raw`select rolsuper, rolbypassrls from pg_roles where rolname = current_user`);
      assert.equal(role[0]?.rolsuper, false, 'Use a non-superuser application database role');
      assert.equal(role[0]?.rolbypassrls, false, 'Use an application role without BYPASSRLS');
      await tx.execute(raw`select set_config('app.actor_kind', 'system', true)`);
      await tx.insert(users).values([{ id: guardianUser, type: 'patient' }, { id: otherUser, type: 'patient' }]);
      await tx.insert(patients).values([{ id: guardianPatient, userId: guardianUser, firstName: 'Test', lastName: 'Guardian' }, { id: otherPatient, userId: otherUser, firstName: 'Other', lastName: 'Guardian' }]);
      await tx.execute(raw`select set_config('app.actor_kind', 'patient', true), set_config('app.current_user_id', ${guardianUser}, true)`);
      const result = await patientService.addDependent(tx, context(guardianUser), input);
      assert.equal(result.first_name, input.first_name);
      assert.equal(result.phone, null);
      assert.equal((await patientService.listDependents(tx, context(guardianUser))).length, 1);
      console.log('PASS dependent creation and guardian list refresh');
      await tx.execute(raw`select set_config('app.current_user_id', ${otherUser}, true)`);
      assert.equal((await patientService.listDependents(tx, context(otherUser))).length, 0);
      assert.equal((await tx.select().from(patients).where(eq(patients.id, result.patient_id))).length, 0);
      assert.equal((await tx.select().from(patientDependents).where(eq(patientDependents.id, result.id))).length, 0);
      console.log('PASS another guardian cannot read the dependent or relationship');
      throw rollback;
    });
  } catch (error) { if (error !== rollback) throw error; }
  console.log('PASS all fixture writes rolled back');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => sql.end());

