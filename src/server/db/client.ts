import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { env } from '@/server/config/env';

import * as schema from './schema';

/**
 * A single pooled connection, reused across hot reloads in dev so Next's module
 * refresh does not exhaust Postgres connections.
 */
declare global {
  var __careondeckSql: ReturnType<typeof postgres> | undefined;
}

function createClient() {
  return postgres(env.DATABASE_URL, {
    max: env.DATABASE_POOL_MAX,
    idle_timeout: 20,
    max_lifetime: 60 * 30,
    prepare: false, // required when running behind a transaction-mode pooler
    onnotice: () => {},
  });
}

export const sql = globalThis.__careondeckSql ?? createClient();
if (env.NODE_ENV !== 'production') globalThis.__careondeckSql = sql;

/**
 * The raw Drizzle handle.
 *
 * Do not reach for this in feature code -- it runs with no tenant GUC set, so
 * every RLS policy evaluates against a null org and returns nothing (or, for
 * the public policies, only published rows). Use `withTenant` / `withActor` /
 * `withPublic` from ./tenant instead, which are what the route handlers wire up.
 */
export const db = drizzle(sql, { schema, casing: 'snake_case' });

export type Database = typeof db;
export { schema };
