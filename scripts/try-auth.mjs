#!/usr/bin/env node
/**
 * Walks the auth flows against a running dev server, over real HTTP.
 *
 *     npm run dev            # in one terminal
 *     npm run try:auth       # in another
 *
 * Unlike `npm run db:verify:auth`, which calls the service layer directly,
 * this exercises the actual endpoints -- routes, validation, cookies and all --
 * so it is what to reach for when a client is not behaving as expected.
 *
 * Needs APP_ENV=local so the one-time code comes back in the response instead
 * of being sent. Creates its own user and removes it afterwards.
 */
import 'dotenv/config';

import postgres from 'postgres';

const BASE = process.env.TRY_AUTH_BASE ?? 'http://localhost:3000';
const EMAIL = `try-${Date.now().toString(36)}@example.test`;

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL must be set.');
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, { max: 1, onnotice: () => {} });

/** The cookie jar, so a session survives between calls the way a browser's would. */
let cookie = '';

async function call(method, path, body, headers = {}) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { cookie } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const setCookie = response.headers.get('set-cookie');
  if (setCookie) {
    const pair = setCookie.split(';')[0];
    cookie = pair.endsWith('=') ? '' : pair; // an empty value means signed out
  }

  const text = await response.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = text.slice(0, 200);
  }
  return { status: response.status, payload };
}

const results = [];
function show(label, result, expectStatus) {
  const ok = result.status === expectStatus;
  results.push(ok);
  console.log(`\n${ok ? 'PASS' : 'FAIL'}  ${label}   [HTTP ${result.status}, expected ${expectStatus}]`);
  console.log(`      ${JSON.stringify(result.payload)}`);
}

async function main() {
  console.log(`Testing against ${BASE}`);

  const health = await call('GET', '/api/health');
  show('GET /api/health', health, 200);
  if (health.status !== 200) {
    console.error('\nServer or database is not up. Start it with `npm run dev`.');
    return;
  }

  await sql`select set_config('app.actor_kind','internal',false)`;
  const [user] = await sql`
    insert into users (type, email, first_name, last_name, status)
    values ('patient', ${EMAIL}, 'Try', 'Auth', 'active')
    returning id`;
  console.log(`\n(created test user ${EMAIL})`);

  // --- signup, exactly the fields on the signup screen ------------------------
  const NEW_EMAIL = `signup-${Date.now().toString(36)}@example.test`;
  const NEW_PHONE = `+1555${String(Date.now()).slice(-7)}`;
  const PASSWORD = 'Correct-Horse-Battery1';

  const signup = await call('POST', '/api/v1/auth/signup', {
    first_name: 'Maya',
    last_name: 'Sharma',
    date_of_birth: '1994-07-12',
    gender: 'female',
    phone: NEW_PHONE,
    email: NEW_EMAIL,
    location: { label: 'Austin, TX, USA', latitude: 30.2672, longitude: -97.7431 },
    password: PASSWORD,
    confirm_password: PASSWORD,
  });
  show('POST /api/v1/auth/signup', signup, 201);

  // The envelope every endpoint shares.
  const envelopeOk =
    signup.payload?.success === true &&
    'data' in signup.payload &&
    !('ok' in signup.payload);
  results.push(envelopeOk);
  console.log(`${envelopeOk ? 'PASS' : 'FAIL'}  success responses use { success: true, data }`);

  // Signup must hand out nothing: the mobile number is still unproved.
  const afterSignup = signup.payload?.data ?? {};
  const noTokensYet =
    !('access_token' in afterSignup) &&
    !('refresh_token' in afterSignup) &&
    afterSignup.next_step === 'verify_mobile';
  results.push(noTokensYet);
  console.log(`
${noTokensYet ? 'PASS' : 'FAIL'}  signup issues no session until the code is verified`);

  /*
   * And the password door must be shut too, or the verification step is
   * decoration: an account that never entered its code could otherwise sign in
   * by password forever.
   */
  const beforeVerifying = await call('POST', '/api/v1/auth/login', {
    email: NEW_EMAIL,
    password: PASSWORD,
  });
  const passwordDoorShut =
    beforeVerifying.status === 403 &&
    beforeVerifying.payload?.error?.code === 'ACCOUNT_UNVERIFIED' &&
    beforeVerifying.payload?.error?.details?.next_step === 'verify_account' &&
    !beforeVerifying.payload?.data?.access_token;
  results.push(passwordDoorShut);
  console.log(`${passwordDoorShut ? 'PASS' : 'FAIL'}  password login is refused until a contact is verified`);

  // ...while a wrong password still looks like a wrong password, so the
  // refusal above cannot be used to find out which accounts exist.
  const wrongOnUnverified = await call('POST', '/api/v1/auth/login', {
    email: NEW_EMAIL,
    password: 'definitely-not-the-password',
  });
  const noLeak =
    wrongOnUnverified.payload?.error?.code === 'FORBIDDEN' &&
    wrongOnUnverified.payload?.error?.message === 'Invalid email or password.';
  results.push(noLeak);
  console.log(`${noLeak ? 'PASS' : 'FAIL'}  a wrong password on an unverified account reveals nothing`);

  // Verifying the code is what signs the account in.
  const sentCode = await call('POST', '/api/v1/auth/otp', {
    channel: 'sms',
    destination: NEW_PHONE,
    purpose: 'verify_mobile',
  });
  const verifiedSignup = await call('POST', '/api/v1/auth/otp/verify', {
    channel: 'sms',
    destination: NEW_PHONE,
    purpose: 'verify_mobile',
    code: sentCode.payload?.data?.dev_code,
    role: 'patient',
    device_type: 'web',
  });
  const tokens = verifiedSignup.payload?.data ?? {};
  const hasPair =
    typeof tokens.access_token === 'string' &&
    typeof tokens.refresh_token === 'string' &&
    tokens.token_type === 'Bearer' &&
    typeof tokens.expires_in === 'number';
  results.push(hasPair);
  console.log(`${hasPair ? 'PASS' : 'FAIL'}  verifying the mobile code returns the token pair`);

  // Both token kinds must authenticate: browsers send the cookie, mobile the header.
  const viaAccess = await fetch(`${BASE}/api/v1/auth/session`, {
    headers: { authorization: `Bearer ${tokens.access_token}` },
  }).then((r) => r.json());
  results.push(viaAccess?.data?.user !== null);
  console.log(`${viaAccess?.data?.user ? 'PASS' : 'FAIL'}  access token authenticates a request`);

  const verifiedFlag = viaAccess?.data?.user?.phone_verified === true;
  results.push(verifiedFlag);
  console.log(`${verifiedFlag ? 'PASS' : 'FAIL'}  the account now reads as phone-verified`);

  const refreshed = await fetch(`${BASE}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'x-refresh-token': tokens.refresh_token },
  });
  const refreshedBody = await refreshed.json();
  const gotNewToken = refreshed.status === 200 && Boolean(refreshedBody?.data?.access_token);
  results.push(gotNewToken);
  console.log(`${gotNewToken ? 'PASS' : 'FAIL'}  refresh token yields a new access token`);

  const signedUpAs = await call('GET', '/api/v1/auth/session');
  const sessionOnSignup = signedUpAs.payload?.data?.user?.email === NEW_EMAIL;
  results.push(sessionOnSignup);
  console.log(`\n${sessionOnSignup ? 'PASS' : 'FAIL'}  verification leaves a usable cookie session`);

  const dupe = await call('POST', '/api/v1/auth/signup', {
    first_name: 'Maya',
    last_name: 'Sharma',
    date_of_birth: '1994-07-12',
    gender: 'female',
    phone: NEW_PHONE,
    email: NEW_EMAIL,
    password: PASSWORD,
    confirm_password: PASSWORD,
  });
  const envelopeErr =
    dupe.payload?.success === false &&
    typeof dupe.payload?.error?.message === 'string' &&
    !('ok' in dupe.payload);
  results.push(envelopeErr);
  console.log(`${envelopeErr ? 'PASS' : 'FAIL'}  failure responses use { success: false, error }`);

  show(
    'POST /api/v1/auth/signup  (duplicate email)',
    await call('POST', '/api/v1/auth/signup', {
      first_name: 'Other',
      last_name: 'Person',
      date_of_birth: '1990-01-01',
      gender: 'male',
      phone: `+1555${String(Date.now() + 7).slice(-7)}`,
      email: NEW_EMAIL,
      password: PASSWORD,
      confirm_password: PASSWORD,
    }),
    409,
  );

  show(
    'POST /api/v1/auth/signup  (passwords differ)',
    await call('POST', '/api/v1/auth/signup', {
      first_name: 'A',
      last_name: 'B',
      date_of_birth: '1990-01-01',
      gender: 'other',
      phone: `+1555${String(Date.now() + 8).slice(-7)}`,
      email: `mismatch-${NEW_EMAIL}`,
      password: PASSWORD,
      confirm_password: 'something-else',
    }),
    422,
  );

  // --- password login ---------------------------------------------------------
  cookie = '';
  show(
    'POST /api/v1/auth/login',
    await call('POST', '/api/v1/auth/login', { email: NEW_EMAIL, password: PASSWORD }),
    200,
  );

  const wrongPassword = await call('POST', '/api/v1/auth/login', {
    email: NEW_EMAIL,
    password: 'not-the-right-password',
  });
  show('POST /api/v1/auth/login  (wrong password)', wrongPassword, 403);

  const unknownEmail = await call('POST', '/api/v1/auth/login', {
    email: `nobody-${NEW_EMAIL}`,
    password: PASSWORD,
  });
  const indistinguishable =
    unknownEmail.payload?.error?.message === wrongPassword.payload?.error?.message;
  results.push(indistinguishable);
  console.log(
    `\n${indistinguishable ? 'PASS' : 'FAIL'}  unknown email and wrong password are indistinguishable`,
  );

  // --- password reset revokes every session -----------------------------------
  cookie = '';
  await call('POST', '/api/v1/auth/login', { email: NEW_EMAIL, password: PASSWORD });

  const resetSent = await call('POST', '/api/v1/auth/password/forgot', { email: NEW_EMAIL });
  const resetCode = resetSent.payload?.data?.dev_code;
  const resetVerified = await call('POST', '/api/v1/auth/otp/verify', {
    channel: 'email',
    destination: NEW_EMAIL,
    purpose: 'password_reset',
    code: resetCode,
  });
  const resetToken = resetVerified.payload?.data?.verification_token;

  const reset = await call(
    'POST',
    '/api/v1/auth/password/reset',
    { password: 'Brand-New-Passphrase2' },
    { 'x-verification-token': resetToken },
  );
  show('POST /api/v1/auth/password/reset', reset, 200);

  // A token in the body must not be honoured -- headers only. The password is
  // deliberately valid, so a 400 can only mean the missing header.
  const inBody = await call('POST', '/api/v1/auth/password/reset', {
    verification_token: resetToken,
    password: 'Sneaking-It-Through4',
  });
  const bodyRefused = inBody.status === 400;
  results.push(bodyRefused);
  console.log(`${bodyRefused ? 'PASS' : 'FAIL'}  a token in the body is not accepted`);

  const revokedCount = reset.payload?.data?.sessions_revoked ?? 0;
  results.push(revokedCount > 0);
  console.log(`\n${revokedCount > 0 ? 'PASS' : 'FAIL'}  reset revoked ${revokedCount} session(s)`);

  show(
    'POST /api/v1/auth/login  (old password no longer works)',
    await call('POST', '/api/v1/auth/login', { email: NEW_EMAIL, password: PASSWORD }),
    403,
  );

  show(
    'POST /api/v1/auth/login  (new password works)',
    await call('POST', '/api/v1/auth/login', {
      email: NEW_EMAIL,
      password: 'Brand-New-Passphrase2',
    }),
    200,
  );

  show(
    'POST /api/v1/auth/password/reset  (token cannot be reused)',
    await call(
      'POST',
      '/api/v1/auth/password/reset',
      { password: 'A-Third-Passphrase3' },
      { 'x-verification-token': resetToken },
    ),
    403,
  );

  cookie = '';

  // --- social sign-in: one endpoint, provider in the body, token in a header --
  show(
    'POST /api/v1/auth/social  (bad provider)',
    await call(
      'POST',
      '/api/v1/auth/social',
      { social_type: 'facebook', social_id: 'x' },
      { 'x-provider-token': 'x' },
    ),
    422,
  );

  show(
    'POST /api/v1/auth/social  (no provider token header)',
    await call('POST', '/api/v1/auth/social', {
      social_type: 'google',
      social_id: '100361441293081999766',
    }),
    400,
  );

  // Firebase credentials are not configured yet, so this is the honest answer.
  show(
    'POST /api/v1/auth/social  (google, no credentials configured)',
    await call(
      'POST',
      '/api/v1/auth/social',
      {
        social_type: 'google',
        social_id: '100361441293081999766',
        email: 'someone@example.test',
        device_token: 'fcm-token',
        device_type: 'web',
      },
      { 'x-provider-token': 'a-google-id-token' },
    ),
    503,
  );

  // --- the flow that works today ---------------------------------------------
  const sent = await call('POST', '/api/v1/auth/otp', {
    channel: 'email',
    destination: EMAIL,
    purpose: 'login',
  });
  show('POST /api/v1/auth/otp  (request a code)', sent, 200);

  const code = sent.payload?.data?.dev_code;
  if (!code) {
    console.error('\nNo devCode returned. Is APP_ENV=local in .env?');
    return;
  }

  show(
    'POST /api/v1/auth/otp/verify  (sign in)',
    await call('POST', '/api/v1/auth/otp/verify', {
      channel: 'email',
      destination: EMAIL,
      purpose: 'login',
      code,
    }),
    200,
  );

  show('GET /api/v1/auth/session  (with session)', await call('GET', '/api/v1/auth/session'), 200);
  show('GET /api/v1/auth/organizations', await call('GET', '/api/v1/auth/organizations'), 200);

  // --- rejections that should stay rejections --------------------------------
  show(
    'POST /api/v1/auth/otp  (malformed address)',
    await call('POST', '/api/v1/auth/otp', {
      channel: 'email',
      destination: 'not-an-email',
      purpose: 'login',
    }),
    422,
  );

  show(
    'POST /api/v1/auth/otp/verify  (wrong code)',
    await call('POST', '/api/v1/auth/otp/verify', {
      channel: 'email',
      destination: EMAIL,
      purpose: 'login',
      code: '000000',
    }),
    403,
  );

  const unknownReset = await call('POST', '/api/v1/auth/password/forgot', {
    email: 'nobody@example.test',
  });
  show('POST /api/v1/auth/password/forgot  (unknown address)', unknownReset, 404);

  // The message has to reach the Email field, not just a toast.
  const onTheField =
    unknownReset.payload?.error?.details?.[0]?.path === 'email' &&
    typeof unknownReset.payload?.error?.details?.[0]?.message === 'string';
  results.push(onTheField);
  console.log(`${onTheField ? 'PASS' : 'FAIL'}  the refusal is attached to the email field`);

  // --- sign out ---------------------------------------------------------------
  show('DELETE /api/v1/auth/session  (sign out)', await call('DELETE', '/api/v1/auth/session'), 200);

  const after = await call('GET', '/api/v1/auth/session');
  const signedOut = after.payload?.data?.user === null;
  results.push(signedOut);
  console.log(`\n${signedOut ? 'PASS' : 'FAIL'}  session no longer resolves after sign-out`);

  // Audit rows are deliberately left behind: the app role has no DELETE on
  // audit_logs, which is the append-only guarantee doing its job.
  await sql`delete from sessions where user_id = ${user.id}`;
}

try {
  await main();
} catch (error) {
  console.error('\nABORTED:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  try {
    await sql`delete from verification_codes where destination like ${'%@example.test'} or destination like ${'+1555%'}`;
    await sql`delete from outbound_messages where destination like ${'%@example.test'} or destination like ${'+1555%'}`;
    // patients cascade from users; user_credentials does too.
    await sql`delete from patients where email like ${'%@example.test'}`;
    await sql`delete from users where email like ${'%@example.test'}`;
    await sql`delete from rate_limit_buckets`;
  } catch (error) {
    console.error(`cleanup failed: ${error.message}`);
  }
  await sql.end();

  const failed = results.filter((r) => !r).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  if (failed) process.exitCode = 1;
}
