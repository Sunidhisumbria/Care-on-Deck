/**
 * Exercises the social sign-in account-matching rules against the real
 * database.
 *
 *     npm run db:verify:social
 *
 * Calls `linkOrCreateSocialUser` directly with synthetic verified claims,
 * which is deliberate: token verification belongs to Firebase and cannot be
 * tested without live credentials, but the matching rules are ours and are
 * where an account-takeover bug would live. Those are what this covers.
 */
import 'dotenv/config';

import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import type { RequestContext } from '../src/server/auth/context';
import * as schema from '../src/server/db/schema';
import { withActor } from '../src/server/db/tenant';
import { authService } from '../src/server/modules/auth/auth.service';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL must be set.');

const ownerSql = postgres(url, { max: 1, onnotice: () => {} });
const owner = drizzle(ownerSql, { schema, casing: 'snake_case' });

const TAG = Date.now().toString(36);
const results: Array<{ name: string; ok: boolean }> = [];
const check = (name: string, ok: boolean, detail = '') => {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  -- ${detail}` : ''}`);
};

const ctx = (): RequestContext => ({
  requestId: `verify-social-${TAG}`,
  session: null,
  organizationId: null,
  facilityId: null,
  permissions: new Set(),
  isInternal: false,
  ipAddress: '203.0.113.9',
  userAgent: 'verify-social',
});

const signIn = (provider: 'google' | 'apple', claims: Parameters<
  typeof authService.linkOrCreateSocialUser
>[3]) => withActor({ kind: 'anonymous' }, (tx) =>
  authService.linkOrCreateSocialUser(tx, ctx(), provider, claims),
);

async function main() {
  // Probes below read policy-guarded tables directly, so this connection needs
  // an actor. Session-level (false) rather than transaction-local.
  await ownerSql`select set_config('app.actor_kind', 'internal', false)`;

  // --- 1. a brand new social account ---------------------------------------
  const freshEmail = `google-new-${TAG}@example.test`;
  const first = await signIn('google', {
    providerAccountId: `google-uid-${TAG}`,
    email: freshEmail,
    emailVerified: true,
    firstName: 'Nita',
    lastName: 'Bose',
  });
  check('new social identity creates an account', first.body.is_new_account, first.body.user_id);

  const [patient] = await ownerSql`select first_name from patients where user_id = ${first.body.user_id}`;
  check('a patient record is created alongside it', patient?.first_name === 'Nita');

  // --- 2. the same identity signs in again ---------------------------------
  const second = await signIn('google', {
    providerAccountId: `google-uid-${TAG}`,
    email: freshEmail,
    emailVerified: true,
    firstName: 'Nita',
    lastName: 'Bose',
  });
  check(
    'returning identity reuses the same account',
    second.body.user_id === first.body.user_id && !second.body.is_new_account,
  );

  // --- 3. linking to an existing password account --------------------------
  const existingEmail = `password-user-${TAG}@example.test`;
  await ownerSql`select set_config('app.actor_kind','internal',false)`;
  const [existing] = await ownerSql`
    insert into users (type, email, first_name, last_name, status)
    values ('patient', ${existingEmail}, 'Ravi', 'Kumar', 'active') returning id`;

  const linked = await signIn('google', {
    providerAccountId: `google-uid-link-${TAG}`,
    email: existingEmail,
    emailVerified: true,
    firstName: 'Ravi',
    lastName: 'Kumar',
  });
  check(
    'a verified email links to the existing account rather than duplicating it',
    linked.body.user_id === existing!.id && linked.body.linked_to_existing,
  );

  const [afterLink] = await ownerSql`
    select email_verified_at from users where id = ${existing!.id}`;
  check('linking marks the email verified', afterLink?.email_verified_at !== null);

  // --- 4. an UNVERIFIED email must not link --------------------------------
  const victimEmail = `victim-${TAG}@example.test`;
  const [victim] = await ownerSql`
    insert into users (type, email, first_name, last_name, status)
    values ('patient', ${victimEmail}, 'Real', 'Owner', 'active') returning id`;

  let takeoverBlocked = false;
  let takeoverMessage = '';
  try {
    const attacker = await signIn('google', {
      providerAccountId: `google-uid-attacker-${TAG}`,
      email: victimEmail,
      emailVerified: false,
      firstName: 'Not',
      lastName: 'Them',
    });
    takeoverMessage =
      attacker.body.user_id === victim!.id
        ? 'ACCOUNT TAKEOVER -- it linked'
        : 'it created a separate account instead of refusing';
  } catch (error) {
    const message = (error as Error).message;
    takeoverBlocked = /did not confirm your email/i.test(message);
    takeoverMessage = takeoverBlocked ? 'refused cleanly' : message;
  }
  check(
    'an unverified email does NOT take over an existing account',
    takeoverBlocked,
    takeoverMessage,
  );

  const [victimAfter] = await ownerSql`
    select email_verified_at from users where id = ${victim!.id}`;
  check(
    'the targeted account is left untouched',
    victimAfter?.email_verified_at === null,
  );

  // --- 5. Apple private relay: no email, matched on provider id ------------
  const relayId = `apple-uid-${TAG}`;
  const relayFirst = await signIn('apple', {
    providerAccountId: relayId,
    email: null,
    emailVerified: false,
    firstName: 'Hidden',
    lastName: 'Person',
  });
  check('Apple sign-in without an email creates an account', relayFirst.body.is_new_account);

  const relaySecond = await signIn('apple', {
    providerAccountId: relayId,
    email: null,
    emailVerified: false,
    firstName: null,
    lastName: null,
  });
  check(
    'a returning Apple user is matched on provider id, not email',
    relaySecond.body.user_id === relayFirst.body.user_id && !relaySecond.body.is_new_account,
  );

  // --- 6. providers are kept distinct --------------------------------------
  const crossProvider = await signIn('apple', {
    providerAccountId: `google-uid-${TAG}`, // same id string, different provider
    email: `apple-distinct-${TAG}@example.test`,
    emailVerified: true,
    firstName: 'Different',
    lastName: 'Human',
  });
  check(
    'the same id under a different provider is a different person',
    crossProvider.body.user_id !== first.body.user_id,
  );

  // --- 7. a suspended account cannot sign in socially ----------------------
  await ownerSql`update users set status = 'suspended' where id = ${first.body.user_id}`;
  let blocked = false;
  try {
    await signIn('google', {
      providerAccountId: `google-uid-${TAG}`,
      email: freshEmail,
      emailVerified: true,
      firstName: 'Nita',
      lastName: 'Bose',
    });
  } catch (error) {
    blocked = /not active/i.test((error as Error).message);
  }
  check('a suspended account is refused', blocked);

  // --- 8. every social account has an identity row -------------------------
  const identities = await owner
    .select({ id: schema.userIdentities.id })
    .from(schema.userIdentities)
    .where(
      and(
        eq(schema.userIdentities.provider, 'google'),
        eq(schema.userIdentities.providerAccountId, `google-uid-${TAG}`),
      ),
    );
  check('the provider link is recorded exactly once', identities.length === 1);
}

async function cleanup() {
  await ownerSql`select set_config('app.actor_kind','internal',false)`;
  await ownerSql`delete from patients where email like ${`%${TAG}@example.test`}`;
  await ownerSql`delete from patients where user_id in (select id from users where email like ${`%${TAG}@example.test`})`;
  await ownerSql`delete from users where email like ${`%${TAG}@example.test`}`;
  // Apple relay accounts carry no email; sweep them by their identity row.
  await ownerSql`delete from users where id in (
    select user_id from user_identities where provider_account_id like ${`%${TAG}`})`;
  await ownerSql`delete from rate_limit_buckets`;
}

async function run() {
  try {
    await main();
  } catch (error) {
    console.error('\nABORTED:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  } finally {
    try {
      await cleanup();
    } catch (error) {
      console.error(`cleanup failed: ${(error as Error).message}`);
    }
    await ownerSql.end();
    const failed = results.filter((r) => !r.ok).length;
    console.log(`\n${results.length - failed}/${results.length} checks passed`);
    if (failed) process.exitCode = 1;
    setTimeout(() => process.exit(process.exitCode ?? 0), 200).unref();
  }
}

void run();
