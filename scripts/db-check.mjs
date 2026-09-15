
import 'dotenv/config';

import postgres from 'postgres';

/**
 * --warn-only always exits 0. `npm run dev` uses it so a database that is down
 * prints a clear reason and still lets the server start; CI omits it and gets
 * a real exit code.
 */
const WARN_ONLY = process.argv.includes('--warn-only');
const fail = () => {
  process.exitCode = WARN_ONLY ? 0 : 1;
};

const DB_URL = process.env.DATABASE_URL;

if (!DB_URL) {
  console.error(
    'DATABASE_URL is not set.\n' +
      'Create a .env file in the project root (copy .env.example) and put the\n' +
      'connection string on the DATABASE_URL line.',
  );
  process.exit(WARN_ONLY ? 0 : 1);
}

function safeUrl(url) {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.username}:***@${u.hostname}:${u.port || '5432'}${u.pathname}${u.search}`;
  } catch {
    return null;
  }
}

const display = safeUrl(DB_URL);
if (!display) {
  console.error('DATABASE_URL is not a valid postgres:// connection string.');
  process.exit(WARN_ONLY ? 0 : 1);
}
console.log(`target     ${display}`);

const sql = postgres(DB_URL, { max: 1, connect_timeout: 10, onnotice: () => {} });

try {
  const started = Date.now();
  const [row] = await sql`
    select version() as version,
           current_database() as db,
           current_user as usr,
           (select count(*)::int from pg_class c
              join pg_namespace n on n.oid = c.relnamespace
             where n.nspname = 'public' and c.relkind = 'r') as tables,
           (select count(*)::int from pg_class c
              join pg_namespace n on n.oid = c.relnamespace
             where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity) as rls_tables,
           (select count(*)::int from information_schema.tables
             where table_schema = 'drizzle' and table_name = '__drizzle_migrations') as migrated,
           (select rolsuper or rolbypassrls from pg_roles where rolname = current_user) as bypasses_rls`;

  console.log(`connected  ${Date.now() - started} ms`);
  console.log(`server     ${row.version.split(',')[0]}`);
  console.log(`database   ${row.db}`);
  console.log(`user       ${row.usr}`);
  console.log(`tables     ${row.tables}${row.tables ? ` (${row.rls_tables} with RLS)` : ''}`);

  // A superuser or BYPASSRLS role makes Postgres ignore every tenant policy.
  // It fails silently when it happens, so say it loudly here.
  if (row.bypasses_rls) {
    console.error(
      `\nWARNING: "${row.usr}" bypasses row-level security, so tenant isolation is OFF.\n` +
        '  Connect the app as a plain role instead:\n' +
        "    alter role careondeck_app login password '<choose-one>';\n" +
        '    grant connect on database <db> to careondeck_app;\n' +
        '  then point DATABASE_URL at careondeck_app.',
    );
    fail();
  }

  const major = Number(row.version.match(/PostgreSQL (\d+)/)?.[1] ?? 0);
  if (major < 15) {
    console.error(`\nPostgres ${major} is too old -- the schema needs 15 or newer.`);
    process.exitCode = 1;
  } else {
    console.log('\nConnection OK.');
    // Keyed on tables, not on the drizzle bookkeeping table: an unprivileged
    // app role cannot see the `drizzle` schema and would be told to migrate a
    // database that is already fully migrated.
    if (!row.tables) {
      console.log('Next: npm run db:migrate && npm run db:rls && npm run db:seed');
    }
  }
} catch (error) {
  const message = [error.code, error.message].filter(Boolean).join(' ') || String(error);
  console.error(`\nCould not connect: ${message}`);

  if (/ECONNREFUSED/.test(message)) console.error('Nothing is listening at that host and port.');
  else if (/ENOTFOUND|EAI_AGAIN/.test(message)) console.error('That hostname does not resolve.');
  else if (/password authentication failed/i.test(message)) console.error('Wrong password, or no such user.');
  else if (/database .* does not exist/i.test(message)) console.error('That database does not exist yet.');
  else if (/SSL|ssl/.test(message)) console.error('Try adding ?sslmode=require to the URL.');
  else if (/timeout/i.test(message)) console.error('Blocked by a firewall, IP allow-list, or VPN.');

  fail();
} finally {
  await sql.end({ timeout: 5 }).catch(() => {});
}
