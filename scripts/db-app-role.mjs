/**
 * Gives the app's restricted database account a password, then proves it works.
 *
 * `npm run db:rls` creates `careondeck_app` without a login. On a hosted
 * database (Neon, RDS) that login has to be switched on with a password, and
 * doing it by hand -- typing a password into a SQL editor, then again into a
 * connection string -- is an easy place for the two to drift apart. This sets
 * the password and immediately signs in with the very same value, so a success
 * here means the connection string will work.
 *
 * It also confirms what matters about that account: it is not the owner, and
 * it does not bypass row-level security.
 *
 * Usage (PowerShell), with DATABASE_URL set to the OWNER connection string:
 *   $env:DATABASE_URL = 'postgresql://neondb_owner:OWNER_PASSWORD@HOST/neondb?sslmode=require'
 *   $env:APP_DB_PASSWORD = -join ((48..57)+(65..90)+(97..122) | Get-Random -Count 32 | % {[char]$_})
 *   npm run db:app-role
 *
 * Nothing secret is printed, so the output is safe to share. The password stays
 * in $env:APP_DB_PASSWORD, and the script prints a command that copies the full
 * connection string to the clipboard.
 */
import postgres from 'postgres';

const ownerUrl = process.env.DATABASE_URL;
const password = process.env.APP_DB_PASSWORD;
const ROLE = 'careondeck_app';

function stop(message) {
  console.error(`\n${message}`);
  process.exit(1);
}

if (!ownerUrl) stop('DATABASE_URL is not set. Set it to the owner connection string first.');
if (!password) stop('APP_DB_PASSWORD is not set. See the usage at the top of scripts/db-app-role.mjs.');

// ALTER ROLE cannot take the password as a bound parameter, so it is written
// into the statement. Letters and digits only keeps that safe, and keeps the
// connection string free of characters that would need escaping.
if (!/^[A-Za-z0-9]{24,}$/.test(password)) {
  stop('APP_DB_PASSWORD must be at least 24 letters and digits, with no symbols.');
}

let owner;
try {
  owner = new URL(ownerUrl);
} catch {
  stop('DATABASE_URL is not a valid connection string.');
}

const appUrl = new URL(ownerUrl);
appUrl.username = ROLE;
appUrl.password = password;

const masked = new URL(appUrl);
masked.password = '***';

const admin = postgres(ownerUrl, { max: 1, onnotice: () => {} });

try {
  const [{ exists }] = await admin`select exists(select 1 from pg_roles where rolname = ${ROLE}) as exists`;
  if (!exists) {
    stop(`The role "${ROLE}" does not exist on this database. Run npm run db:rls (as the owner) first.`);
  }

  const [{ database }] = await admin`select current_database() as database`;
  await admin.unsafe(`alter role ${ROLE} login password '${password}'`);
  await admin.unsafe(`grant connect on database "${database.replace(/"/g, '""')}" to ${ROLE}`);
  console.log(`password set   ${ROLE} on ${owner.hostname}/${database}`);
} catch (error) {
  stop(`Could not set the password as "${decodeURIComponent(owner.username)}": ${error.message}`);
} finally {
  await admin.end({ timeout: 5 }).catch(() => {});
}

const app = postgres(appUrl.toString(), { max: 1, onnotice: () => {} });

try {
  const [check] = await app`
    select current_user as usr,
           (select rolsuper or rolbypassrls from pg_roles where rolname = current_user) as bypasses_rls,
           (select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
             where n.nspname = 'public' and c.relkind = 'r') as tables,
           (select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
             where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity) as rls_tables`;

  console.log(`signed in      as ${check.usr}`);
  console.log(`tables         ${check.tables} (${check.rls_tables} with RLS)`);

  if (check.bypasses_rls) {
    stop(`"${check.usr}" bypasses row-level security. Do not use this account for the app.`);
  }

  console.log('row security   enforced for this account');
  console.log(`\nThe app's connection string (password hidden):\n  ${masked}`);
  console.log(
    '\nTo copy the full string to your clipboard, run:\n' +
      `  Set-Clipboard -Value ('postgresql://${ROLE}:' + $env:APP_DB_PASSWORD + '@${appUrl.host}${appUrl.pathname}${appUrl.search}')`,
  );
} catch (error) {
  stop(`The password was set, but signing in as ${ROLE} failed: ${error.message}`);
} finally {
  await app.end({ timeout: 5 }).catch(() => {});
}
