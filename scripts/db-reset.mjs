/**
 * Empties every table in the local database, keeping the schema.
 *
 * Tables, columns, migrations, row-level security and grants all stay. Only the
 * rows go -- accounts, providers, patients, appointments, audit history, all of
 * it. Run `npm run db:seed` afterwards to restore the reference data the app
 * cannot start without: permissions, roles and the insurance directory.
 *
 * Refuses unless every one of these holds, because the same command pointed at
 * a hosted database would erase real patients:
 *
 *   - the database is on this machine (localhost),
 *   - APP_ENV is `local`,
 *   - `--yes` was passed,
 *   - the connection may truncate, which in practice means the `postgres`
 *     owner account -- the app account is deliberately not allowed to.
 *
 * Usage (PowerShell):
 *   $env:DATABASE_URL = "postgresql://postgres:PASSWORD@localhost:5432/careondeck"
 *   npm run db:reset -- --yes
 *   Remove-Item Env:DATABASE_URL
 *   npm run db:seed
 */
import 'dotenv/config';

import postgres from 'postgres';

const url = process.env.DATABASE_URL;
const confirmed = process.argv.includes('--yes');

function stop(message) {
  console.error(`\n${message}`);
  process.exit(1);
}

if (!url) stop('DATABASE_URL is not set.');

let target;
try {
  target = new URL(url);
} catch {
  stop('DATABASE_URL is not a valid connection string.');
}

if (!['localhost', '127.0.0.1', '::1'].includes(target.hostname)) {
  stop(`Refusing: DATABASE_URL points at ${target.hostname}, not this machine.`);
}
if (process.env.APP_ENV !== 'local') {
  stop(`Refusing: APP_ENV is "${process.env.APP_ENV ?? 'unset'}", not "local".`);
}

const sql = postgres(url, { max: 1, onnotice: () => {} });

try {
  await sql`select set_config('app.actor_kind', 'system', false)`;

  const tables = (
    await sql`select tablename from pg_tables where schemaname = 'public' order by tablename`
  ).map((row) => row.tablename);

  const [counts] = await sql`
    select
      (select count(*)::int from users) as users,
      (select count(*)::int from providers) as providers,
      (select count(*)::int from patients) as patients,
      (select count(*)::int from appointments) as appointments`;

  console.log(`database   ${target.pathname.slice(1)} on ${target.hostname}`);
  console.log(`account    ${decodeURIComponent(target.username)}`);
  console.log(`tables     ${tables.length}`);
  console.log(
    `rows       ${counts.users} users, ${counts.providers} providers, ` +
      `${counts.patients} patients, ${counts.appointments} appointments`,
  );

  if (!confirmed) {
    stop('Nothing was deleted. Run again with --yes to empty every table:  npm run db:reset -- --yes');
  }

  const [{ allowed }] = await sql`
    select has_table_privilege(current_user, 'public.users', 'TRUNCATE') as allowed`;
  if (!allowed) {
    stop(
      `Refusing: "${decodeURIComponent(target.username)}" may not truncate tables.\n` +
        'Connect as the postgres owner account for this one command -- see the top of this file.',
    );
  }

  const list = tables.map((name) => `public."${name}"`).join(', ');
  await sql.unsafe(`truncate table ${list} restart identity cascade`);

  console.log(`\nEmptied ${tables.length} tables.`);
  console.log('Next: Remove-Item Env:DATABASE_URL, then npm run db:seed');
} catch (error) {
  stop(`Failed: ${error.message}`);
} finally {
  await sql.end({ timeout: 5 }).catch(() => {});
}
