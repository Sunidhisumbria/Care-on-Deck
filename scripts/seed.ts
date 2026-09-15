/**
 * Seeds the reference data the application cannot boot without: the permission
 * catalogue, the system roles, and a starting insurance carrier directory.
 *
 * Run after migrations and RLS:
 *     npm run db:migrate && npm run db:rls && npm run db:seed
 *
 * Idempotent -- safe to re-run after adding a permission.
 *
 * Note the `set_config('app.actor_kind', 'system', ...)` below. `rls.sql`
 * applies FORCE ROW LEVEL SECURITY, so policies bind the table owner too; a
 * seed that skipped this would be treated as anonymous traffic and rejected.
 */
import 'dotenv/config';

import { sql as raw } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { slugify } from '../src/lib/slug';
import { PERMISSIONS, SYSTEM_ROLES } from '../src/server/auth/permissions';
import * as schema from '../src/server/db/schema';

const STARTER_CARRIERS = [
  'Aetna',
  'Aetna Dental',
  'Ambetter',
  'Anthem Blue Cross Blue Shield',
  'Blue Cross Blue Shield',
  'Cigna',
  'Cigna Dental',
  'Delta Dental',
  'Guardian Dental',
  'Humana',
  'Kaiser Permanente',
  'Medicaid',
  'Medicare',
  'MetLife Dental',
  'Molina Healthcare',
  'Oscar Health',
  'Tricare',
  'UnitedHealthcare',
  'United Concordia Dental',
];

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL must be set.');

const sql = postgres(url, { max: 1, onnotice: () => {} });
const db = drizzle(sql, { schema, casing: 'snake_case' });

async function main() {
  await db.transaction(async (tx) => {
    await tx.execute(raw`select set_config('app.actor_kind', 'system', true)`);

    // --- Permission catalogue ----------------------------------------------
    const permissionRows = Object.entries(PERMISSIONS).map(([key, description]) => {
      const [resource, action] = key.split('.');
      return { key, resource: resource!, action: action!, description };
    });

    await tx
      .insert(schema.permissions)
      .values(permissionRows)
      .onConflictDoUpdate({
        target: schema.permissions.key,
        set: { description: raw`excluded.description` },
      });
    console.log(`permissions: ${permissionRows.length}`);

    // --- System roles ------------------------------------------------------
    for (const [key, role] of Object.entries(SYSTEM_ROLES)) {
      const [inserted] = await tx
        .insert(schema.roles)
        .values({
          organizationId: null,
          key,
          name: role.name,
          description: role.description,
          isSystem: true,
        })
        .onConflictDoUpdate({
          target: [schema.roles.organizationId, schema.roles.key],
          set: { name: raw`excluded.name`, description: raw`excluded.description` },
        })
        .returning({ id: schema.roles.id });

      if (!inserted) continue;

      await tx
        .insert(schema.rolePermissions)
        .values(role.permissions.map((permissionKey) => ({ roleId: inserted.id, permissionKey })))
        .onConflictDoNothing();

      console.log(`role ${key}: ${role.permissions.length} permissions`);
    }

    // --- Insurance directory -------------------------------------------------
    // A starting list so Accepted Insurance has something to choose from. Staff
    // curate it in Control Center; existing rows are left as they are.
    const carriers = await tx
      .insert(schema.insuranceCarriers)
      .values(STARTER_CARRIERS.map((name) => ({ name, slug: slugify(name) })))
      .onConflictDoNothing({ target: schema.insuranceCarriers.slug })
      .returning({ id: schema.insuranceCarriers.id });
    console.log(`insurance carriers: ${carriers.length} added`);
  });
}

main()
  .then(() => console.log('\nseed complete'))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
