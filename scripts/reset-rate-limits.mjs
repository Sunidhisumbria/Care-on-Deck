/**
 * Clears the rate-limit buckets. Local development only.
 *
 * The limits are deliberately tight -- 10 signups per IP per hour is right for
 * production and wrong for a test suite that creates a dozen accounts in a
 * minute. Running the HTTP suites a few times trips them, and every assertion
 * after that fails for a reason that has nothing to do with the code.
 *
 * Keys are stored hashed, so there is no way to clear one family of buckets;
 * the whole table goes. That is fine -- it is throwaway state that rebuilds on
 * the next request.
 *
 * Usage: npm run db:reset-limits
 */
import postgres from 'postgres';

if (process.env.APP_ENV !== 'local') {
  throw new Error(`Refusing to clear rate limits with APP_ENV=${process.env.APP_ENV}.`);
}

const sql = postgres(process.env.DATABASE_URL, { max: 1 });
await sql`select set_config('app.actor_kind', 'system', false)`;
const cleared = await sql`delete from rate_limit_buckets returning id`;
console.log(`Cleared ${cleared.length} rate-limit bucket(s).`);
await sql.end();
