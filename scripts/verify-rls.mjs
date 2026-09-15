#!/usr/bin/env node
/**
 * Proves tenant isolation against the real database, through the real
 * unprivileged role.
 *
 *     npm run db:verify
 *
 * This is not a unit test of a query builder. It creates two tenants and asks
 * Postgres directly whether one can reach the other's rows, which is the only
 * way to know the policies in drizzle/sql/rls.sql behave as intended. Run it in
 * CI after every migration -- a forgotten policy on a new table is exactly the
 * failure this catches.
 *
 * Safe to run against a development database: every row it creates is removed
 * in the `finally` block. Do NOT point it at production.
 */
import 'dotenv/config';

import postgres from 'postgres';

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error('DATABASE_URL must be set.');
  process.exit(1);
}

/**
 * Two connections to the same database. `owner` seeds fixtures as an internal
 * actor; `app` runs the checks as a tenant, with no elevation. The tables
 * carry FORCE ROW LEVEL SECURITY, so policies bind both -- what separates them
 * is the actor GUC each one sets, not the role.
 */
const owner = postgres(dbUrl, { max: 1, onnotice: () => {} });
const app = postgres(dbUrl, { max: 2, onnotice: () => {} });

const results = [];
const check = (name, passed, detail = '') => {
  results.push({ name, passed });
  console.log(`${passed ? 'PASS' : 'FAIL'}  ${name}${detail ? `  -- ${detail}` : ''}`);
};

const TAG = `rls-verify-${Date.now()}`;

/**
 * Appointment references must be unique. Deriving them from Date.now() plus an
 * offset collides when two inserts land in the same millisecond window, and the
 * resulting duplicate-key error masquerades as whatever the check was actually
 * testing. A counter cannot collide.
 */
let refCounter = 0;
const nextRef = () => `V${String(Date.now() % 1000000).padStart(6, '0')}${String((refCounter += 1)).padStart(3, '0')}`;

const asOrg = (organizationId, fn) =>
  app.begin(async (tx) => {
    await tx`select set_config('app.actor_kind', 'user', true),
                    set_config('app.current_org_id', ${organizationId}, true)`;
    return fn(tx);
  });

const asAnon = (userId, fn) =>
  app.begin(async (tx) => {
    await tx`select set_config('app.actor_kind', 'anonymous', true),
                    set_config('app.current_user_id', ${userId ?? ''}, true)`;
    return fn(tx);
  });

let ids;

async function seed() {
  return owner.begin(async (tx) => {
    await tx`select set_config('app.actor_kind', 'internal', true)`;
    const [orgA] = await tx`insert into organizations (name, slug, status)
      values (${`A ${TAG}`}, ${`a-${TAG}`}, 'active') returning id`;
    const [orgB] = await tx`insert into organizations (name, slug, status)
      values (${`B ${TAG}`}, ${`b-${TAG}`}, 'active') returning id`;
    const [facA] = await tx`insert into facilities
      (organization_id, name, slug, status, is_publicly_listed)
      values (${orgA.id}, 'A Main', ${`a-main-${TAG}`}, 'active', true) returning id`;
    const [provA] = await tx`insert into providers
      (organization_id, first_name, last_name, status, is_publicly_listed)
      values (${orgA.id}, 'Ada', 'Reyes', 'active', true) returning id`;
    const [guardianUser] = await tx`insert into users (type, email)
      values ('patient', ${`guardian-${TAG}@example.test`}) returning id`;
    const [strangerUser] = await tx`insert into users (type, email)
      values ('patient', ${`stranger-${TAG}@example.test`}) returning id`;
    const [guardian] = await tx`insert into patients (first_name, last_name, user_id)
      values ('Sam', 'Okafor', ${guardianUser.id}) returning id`;
    const [child] = await tx`insert into patients (first_name, last_name)
      values ('Ife', 'Okafor') returning id`;
    await tx`insert into patient_dependents
      (guardian_patient_id, dependent_patient_id, relationship)
      values (${guardian.id}, ${child.id}, 'child')`;
    return {
      orgA: orgA.id, orgB: orgB.id, facA: facA.id, provA: provA.id,
      guardianUser: guardianUser.id, strangerUser: strangerUser.id,
      guardian: guardian.id, child: child.id,
    };
  });
}

async function run() {
  // --- every table is protected -------------------------------------------
  const unprotected = await owner`
    select c.relname from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity`;
  check(
    'every table has row level security enabled',
    unprotected.length === 0,
    unprotected.map((r) => r.relname).join(', '),
  );

  // --- tenant isolation ----------------------------------------------------
  const bReadsA = await asOrg(ids.orgB, (tx) =>
    tx`select id from facilities where id = ${ids.facA}`);
  check('tenant B cannot read tenant A facility', bReadsA.length === 0);

  await asOrg(ids.orgB, (tx) => tx`update facilities set name = 'hijacked' where id = ${ids.facA}`);
  const [stillA] = await asOrg(ids.orgA, (tx) =>
    tx`select name from facilities where id = ${ids.facA}`);
  check('tenant B cannot write tenant A facility', stillA?.name === 'A Main');

  let insertBlocked = false;
  try {
    await asOrg(ids.orgB, (tx) => tx`
      insert into facilities (organization_id, name, slug)
      values (${ids.orgA}, 'sneak', ${`sneak-${TAG}`})`);
  } catch (e) {
    insertBlocked = /row-level security/i.test(e.message);
  }
  check('tenant B cannot insert into tenant A', insertBlocked);

  // --- patients: no blanket read ------------------------------------------
  const before = await asOrg(ids.orgA, (tx) =>
    tx`select id from patients where id = ${ids.guardian}`);
  check('org cannot read a patient it has no appointment with', before.length === 0);

  const appointmentId = await asOrg(ids.orgA, async (tx) => {
    const [row] = await tx`
      insert into appointments
        (reference, organization_id, facility_id, provider_id, patient_id, status, source,
         starts_at, ends_at, duration_minutes)
      values (${nextRef()}, ${ids.orgA}, ${ids.facA}, ${ids.provA},
              ${ids.guardian}, 'confirmed', 'marketplace',
              now() + interval '30 days', now() + interval '30 days 30 minutes', 30)
      returning id`;
    return row.id;
  });

  const after = await asOrg(ids.orgA, (tx) =>
    tx`select id from patients where id = ${ids.guardian}`);
  check('org can read that patient once an appointment links them', after.length === 1);

  const fromB = await asOrg(ids.orgB, (tx) =>
    tx`select id from patients where id = ${ids.guardian}`);
  check('the other org still cannot read that patient', fromB.length === 0);

  // --- guardian / dependent ------------------------------------------------
  const guardianView = await asAnon(ids.guardianUser, (tx) =>
    tx`select id from patients where id in (${ids.guardian}, ${ids.child})`);
  check('guardian sees their own record and their dependent', guardianView.length === 2);

  const strangerView = await asAnon(ids.strangerUser, (tx) =>
    tx`select id from patients where id in (${ids.guardian}, ${ids.child})`);
  check('an unrelated patient sees neither', strangerView.length === 0);

  // --- a patient reading their own appointments (IA: 3. Patient Dashboard) --
  const ownAppointments = await asAnon(ids.guardianUser, (tx) =>
    tx`select id from appointments where id = ${appointmentId}`);
  check('patient can read their own appointment', ownAppointments.length === 1);

  const strangerAppointments = await asAnon(ids.strangerUser, (tx) =>
    tx`select id from appointments where id = ${appointmentId}`);
  check('an unrelated patient cannot read it', strangerAppointments.length === 0);

  // --- rescheduling releases the original slot -----------------------------
  // Uses its own window so it cannot interact with the overlap test below.
  const movedId = await asOrg(ids.orgA, async (tx) => {
    const [row] = await tx`
      insert into appointments
        (reference, organization_id, facility_id, provider_id, patient_id, status, source,
         starts_at, ends_at, duration_minutes)
      values (${nextRef()}, ${ids.orgA}, ${ids.facA}, ${ids.provA},
              ${ids.guardian}, 'confirmed', 'marketplace',
              now() + interval '60 days', now() + interval '60 days 30 minutes', 30)
      returning id`;
    return row.id;
  });

  await asOrg(ids.orgA, (tx) =>
    tx`update appointments set status = 'rescheduled' where id = ${movedId}`);

  let slotReleased = true;
  try {
    await asOrg(ids.orgA, (tx) => tx`
      insert into appointments
        (reference, organization_id, facility_id, provider_id, patient_id, status, source,
         starts_at, ends_at, duration_minutes, rescheduled_from_id)
      values (${nextRef()}, ${ids.orgA}, ${ids.facA}, ${ids.provA},
              ${ids.guardian}, 'confirmed', 'marketplace',
              now() + interval '60 days', now() + interval '60 days 30 minutes', 30, ${movedId})`);
  } catch (e) {
    slotReleased = false;
    console.log(`      reschedule blocked: ${e.message}`);
  }
  check('a superseded appointment releases its slot', slotReleased);

  // --- double booking ------------------------------------------------------
  let overlapRejected = false;
  try {
    await asOrg(ids.orgA, (tx) => tx`
      insert into appointments
        (reference, organization_id, facility_id, provider_id, patient_id, status, source,
         starts_at, ends_at, duration_minutes)
      values (${nextRef()}, ${ids.orgA}, ${ids.facA}, ${ids.provA},
              ${ids.guardian}, 'requested', 'marketplace',
              now() + interval '30 days 15 minutes', now() + interval '30 days 45 minutes', 30)`);
  } catch (e) {
    overlapRejected = e.code === '23P01';
  }
  check('overlapping appointment for the same provider is rejected', overlapRejected);

  // --- anonymous visibility ------------------------------------------------
  const anonAppointments = await asAnon(null, (tx) =>
    tx`select id from appointments where id = ${appointmentId}`);
  check('anonymous cannot read appointments', anonAppointments.length === 0);

  const anonPatients = await asAnon(null, (tx) =>
    tx`select id from patients where id = ${ids.guardian}`);
  check('anonymous cannot read patients', anonPatients.length === 0);

  const anonFacility = await asAnon(null, (tx) =>
    tx`select id from facilities where id = ${ids.facA}`);
  check('anonymous can read a publicly listed facility', anonFacility.length === 1);

  // --- audit trail is append-only -----------------------------------------
  await asOrg(ids.orgA, (tx) => tx`
    insert into audit_logs (organization_id, action, resource_type)
    values (${ids.orgA}, 'verify.probe', 'facility')`);

  let auditImmutable = false;
  try {
    await asOrg(ids.orgA, (tx) => tx`delete from audit_logs where action = 'verify.probe'`);
  } catch (e) {
    auditImmutable = e.code === '42501';
  }
  check('app role cannot delete audit rows', auditImmutable);
}

async function cleanup() {
  await owner.begin(async (tx) => {
    await tx`select set_config('app.actor_kind', 'internal', true)`;
    await tx`delete from audit_logs where action = 'verify.probe'`;
    if (!ids) return;
    await tx`delete from appointments where organization_id in (${ids.orgA}, ${ids.orgB})`;
    await tx`delete from patient_dependents where guardian_patient_id = ${ids.guardian}`;
    await tx`delete from patients where id in (${ids.guardian}, ${ids.child})`;
    await tx`delete from users where id in (${ids.guardianUser}, ${ids.strangerUser})`;
    await tx`delete from organizations where id in (${ids.orgA}, ${ids.orgB})`;
  });
}

try {
  ids = await seed();
  await run();
} catch (error) {
  console.error('\nABORTED:', error.message);
  process.exitCode = 1;
} finally {
  try {
    await cleanup();
  } catch (error) {
    console.error(`cleanup failed, rows tagged ${TAG} may remain: ${error.message}`);
  }
  await app.end();
  await owner.end();

  const failed = results.filter((r) => !r.passed).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  if (failed) process.exitCode = 1;
}
