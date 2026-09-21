import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { env } from '@/server/config/env';

import * as schema from './schema';


declare global {
  var __careondeckSql: ReturnType<typeof postgres> | undefined;
}

function createClient() {
  return postgres(env.DATABASE_URL, {
    max: env.DATABASE_POOL_MAX,
    /*
     * Seconds an unused connection stays open. Opening one to a hosted database
     * costs a TLS handshake and a password exchange -- about 3 seconds from
     * India to Neon in Ohio, against ~0.3s for a query on an open one -- so
     * closing them after a few idle seconds made every pause cost a reconnect.
     * Through Neon's pooler an idle client connection holds no database
     * process, so keeping it costs nothing and does not keep Neon awake.
     */
    idle_timeout: 300,
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
