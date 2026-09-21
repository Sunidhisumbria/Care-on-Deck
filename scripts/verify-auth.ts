/**
 * Exercises the auth flows that exist today against the real database,
 * through the real service layer and the real RLS policies.
 *
 *     npm run db:verify:auth
 *
 * Needs DATABASE_URL (the app role), SESSION_SECRET and APP_ENV=local so the
 * one-time code is echoed back instead of sent. Creates its own fixtures and
 * removes them.
 */
import 'dotenv/config';

import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import type { RequestContext } from '../src/server/auth/context';
import { resolveSession } from '../src/server/auth/session';
import { withActor } from '../src/server/db/tenant';
import * as schema from '../src/server/db/schema';
import { ApiError } from '../src/server/http/errors';
import { authService } from '../src/server/modules/auth/auth.service';

const migratorUrl = process.env.DATABASE_URL;
if (!migratorUrl) throw new Error('DATABASE_URL must be set.');
if (process.env.APP_ENV !== 'local') {
  throw new Error('APP_ENV must be "local" so the one-time code is echoed rather than sent.');
}

const ownerSql = postgres(migratorUrl, { max: 1, onnotice: () => {} });
const owner = drizzle(ownerSql, { schema, casing: 'snake_case' });

const TAG = Date.now().toString(36);
const PHONE = `+1555${String(Date.now()).slice(-7)}`;
const EMAIL = `auth-${TAG}@example.test`;

const results: Array<{ name: string; ok: boolean }> = [];
const check = (name: string, ok: boolean, detail = '') => {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  -- ${detail}` : ''}`);
};

const anonCtx = (): RequestContext => ({
  requestId: `verify-auth-${TAG}`,
  session: null,
  organizationId: null,
  facilityId: null,
  permissions: new Set(),
  isInternal: false,
  ipAddress: '203.0.113.7',
  userAgent: 'verify-auth',
});

async function expectApiError(fn: () => Promise<unknown>, code: string): Promise<string> {
  try {
    await fn();
    return '';
  } catch (error) {
    if (error instanceof ApiError && error.code === code) return error.message;
    throw error;
  }
}

/** Builds a Request the way the browser would send it: with the cookie. */
function requestWithCookie(token: string): Request {
  return new Request('http://localhost/api/v1/auth/session', {
    headers: { authorization: `Bearer ${token}` },
  });
}

let userId: string | null = null;
let orgId: string | null = null;

async function seed() {
  await owner.transaction(async (tx) => {
    await tx.execute(
      (await import('drizzle-orm')).sql`select set_config('app.actor_kind', 'internal', true)`,
    );
    const [user] = await tx
      .insert(schema.users)
      .values({ type: 'staff', email: EMAIL, phone: PHONE, firstName: 'Ada', lastName: 'Verify' })
      .returning({ id: schema.users.id });
    const [org] = await tx
      .insert(schema.organizations)
      .values({ name: `Auth Verify ${TAG}`, slug: `auth-verify-${TAG}`, status: 'active' })
      .returning({ id: schema.organizations.id });
    const [role] = await tx
      .select({ id: schema.roles.id })
      .from(schema.roles)
      .where(eq(schema.roles.key, 'office_manager'))
      .limit(1);
    if (!user || !org || !role) throw new Error('seed failed -- has db:seed been run?');
    await tx.insert(schema.memberships).values({
      userId: user.id,
      organizationId: org.id,
      roleId: role.id,
      status: 'active',
    });
    userId = user.id;
    orgId = org.id;
  });
}

async function run() {
  // --- 1. send a code, anonymously ------------------------------------------
  const sent = await withActor({ kind: 'anonymous' }, (tx) =>
    authService.sendOtp(tx, anonCtx(), { channel: 'sms', destination: PHONE, purpose: 'login' }),
  );
  check('OTP issued for a known account', Boolean(sent.dev_code), `masked as ${sent.destination}`);
  check('response masks the destination', !sent.destination.includes(PHONE.slice(2, -4)));
  const code = sent.dev_code!;

  // --- 2. resend too fast is refused ----------------------------------------
  const tooSoon = await expectApiError(
    () =>
      withActor({ kind: 'anonymous' }, (tx) =>
        authService.sendOtp(tx, anonCtx(), { channel: 'sms', destination: PHONE, purpose: 'login' }),
      ),
    'RATE_LIMITED',
  );
  check('immediate resend is refused', Boolean(tooSoon), tooSoon);

  // --- 3. a wrong code counts even though the transaction rolls back --------
  const wrongCode = code === '000000' ? '000001' : '000000';
  const wrong = await expectApiError(
    () =>
      withActor({ kind: 'anonymous' }, (tx) =>
        authService.verifyOtp(tx, anonCtx(), {
          channel: 'sms',
          destination: PHONE,
          purpose: 'login',
          code: wrongCode,
        }),
      ),
    'FORBIDDEN',
  );
  check('wrong code is refused', Boolean(wrong), wrong);

  const [row] = await ownerSql`
    select attempts from verification_codes
    where destination = ${PHONE} and purpose = 'login' and consumed_at is null
    order by created_at desc limit 1`;
  check('wrong attempt survived the rollback', row?.attempts === 1, `attempts = ${row?.attempts}`);

  // --- 4. the right code signs the user in ----------------------------------
  const verified = await withActor({ kind: 'anonymous' }, (tx) =>
    authService.verifyOtp(tx, anonCtx(), {
      channel: 'sms',
      destination: PHONE,
      purpose: 'login',
      code,
    }),
  );
  check('correct code verifies', verified.body.verified === true);
  check('login purpose issued a session', Boolean(verified.session?.refreshToken));
  check('verification token was returned', verified.body.verification_token.split('.').length === 2);

  const replay = await expectApiError(
    () =>
      withActor({ kind: 'anonymous' }, (tx) =>
        authService.verifyOtp(tx, anonCtx(), {
          channel: 'sms',
          destination: PHONE,
          purpose: 'login',
          code,
        }),
      ),
    'FORBIDDEN',
  );
  check('the same code cannot be used twice', Boolean(replay), replay);

  // --- 5. the session resolves the way a real request would -----------------
  const token = verified.session!.refreshToken;
  const session = await resolveSession(requestWithCookie(token));
  check('session resolves from the token', session?.userId === userId);

  const bogus = await resolveSession(requestWithCookie('not-a-real-token'));
  check('a bogus token resolves to nobody', bogus === null);

  // --- 6. /me through the same actor the handler would use ------------------
  const meCtx: RequestContext = { ...anonCtx(), session: session! };
  const me = await withActor({ kind: 'anonymous', userId: session!.userId }, (tx) =>
    authService.getCurrentUser(tx, meCtx),
  );
  check('current user is returned', me.user?.id === userId, me.user?.email ?? '');
  check('memberships are listed', me.memberships.length === 1, me.memberships[0]?.role_name ?? '');

  // --- 7. switching organization re-checks membership -----------------------
  const switched = await withActor({ kind: 'anonymous', userId: session!.userId }, (tx) =>
    authService.switchOrganization(tx, meCtx, { organization_id: orgId! }),
  );
  check('switch to a member organization succeeds', switched.active_organization_id === orgId);

  const notMember = await expectApiError(
    () =>
      withActor({ kind: 'anonymous', userId: session!.userId }, (tx) =>
        authService.switchOrganization(tx, meCtx, {
          organization_id: '00000000-0000-0000-0000-000000000000',
        }),
      ),
    'FORBIDDEN',
  );
  check('switch to a non-member organization is refused', Boolean(notMember));

  const after = await resolveSession(requestWithCookie(token));
  check('the session now carries the active organization', after?.activeOrganizationId === orgId);

  // --- 8. proof tokens are single-use ---------------------------------------
  const proofToken = verified.body.verification_token;
  const used = await expectApiError(
    () =>
      withActor({ kind: 'anonymous' }, (tx) =>
        authService.completeVerification(tx, proofToken, 'login'),
      ),
    'FORBIDDEN',
  );
  check('a spent verification cannot be completed again', Boolean(used), used);

  const wrongPurpose = await expectApiError(
    () =>
      withActor({ kind: 'anonymous' }, (tx) =>
        authService.completeVerification(tx, proofToken, 'password_reset'),
      ),
    'FORBIDDEN',
  );
  check('a proof cannot be used for a different purpose', Boolean(wrongPurpose));

  // --- 9. forgot-password refuses an address with no account ----------------
  let refusedUnknown = false;
  try {
    await withActor({ kind: 'anonymous' }, (tx) =>
      authService.forgotPassword(tx, anonCtx(), { email: `nobody-${TAG}@example.test` }),
    );
  } catch (error) {
    refusedUnknown = error instanceof ApiError && error.code === 'NOT_FOUND';
  }
  check('forgot-password refuses an unregistered address', refusedUnknown);

  const known = await withActor({ kind: 'anonymous' }, (tx) =>
    authService.forgotPassword(tx, anonCtx(), { email: EMAIL }),
  );
  check('forgot-password for a known address issues a code', Boolean(known.dev_code));

  // --- 10. sign out revokes the session -------------------------------------
  await withActor({ kind: 'anonymous', userId: session!.userId }, (tx) =>
    authService.revokeSession(tx, meCtx),
  );
  const gone = await resolveSession(requestWithCookie(token));
  check('a revoked session no longer resolves', gone === null);

  // --- 11. the per-destination rate limit trips -----------------------------
  const other = `+1555${String(Date.now() + 1).slice(-7)}`;
  let limited = '';
  for (let i = 0; i < 8 && !limited; i += 1) {
    await ownerSql`
      update verification_codes set created_at = now() - interval '2 minutes'
      where destination = ${other}`;
    limited = await expectApiError(
      () =>
        withActor({ kind: 'anonymous' }, (tx) =>
          authService.sendOtp(tx, anonCtx(), { channel: 'sms', destination: other, purpose: 'signup' }),
        ),
      'RATE_LIMITED',
    );
  }
  check('per-destination send limit trips', /hour/.test(limited), limited);
}

async function cleanup() {
  await ownerSql`delete from rate_limit_buckets`;
  await ownerSql`delete from verification_codes where destination like ${'+1555%'} or destination like ${`%${TAG}@example.test`}`;
  await ownerSql`delete from outbound_messages where destination like ${'+1555%'} or destination like ${`%${TAG}@example.test`}`;
  if (userId) {
    await ownerSql`delete from audit_logs where actor_user_id = ${userId}`;
    await ownerSql`delete from sessions where user_id = ${userId}`;
  }
  if (orgId) await ownerSql`delete from organizations where id = ${orgId}`;
  if (userId) await ownerSql`delete from users where id = ${userId}`;
}

async function main() {
  try {
    // This connection reads verification_codes directly, and that table is
    // server-only: without an actor it would see no rows at all.
    await ownerSql.unsafe(`select set_config('app.actor_kind', 'internal', false)`);
    await seed();
    await run();
  } catch (error) {
    console.error('\nABORTED:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  } finally {
    try {
      await ownerSql.unsafe(`select set_config('app.actor_kind', 'internal', false)`);
      await cleanup();
    } catch (error) {
      console.error(`cleanup failed: ${(error as Error).message}`);
    }
    await ownerSql.end();
    const failed = results.filter((r) => !r.ok).length;
    console.log(`\n${results.length - failed}/${results.length} checks passed`);
    if (failed) process.exitCode = 1;
    // The app pool is module-scoped; let the process exit.
    setTimeout(() => process.exit(process.exitCode ?? 0), 200).unref();
  }
}

void main();
