import { sql as raw } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { db, type schema } from './client';

export type Tx = PostgresJsDatabase<typeof schema>;

/**
 * Who is asking. Every database transaction runs under exactly one of these.
 */
export type ActorKind =
  /** No session: the public marketplace and Direct booking pages. */
  | 'anonymous'
  /** A signed-in user acting inside one organization. */
  | 'user'
  /** CareOndeck staff in Control Center. Reads across tenants, always audited. */
  | 'internal'
  /** A background job or webhook handler. No human behind it. */
  | 'system';

export interface ActorContext {
  kind: ActorKind;
  userId?: string;
  /** The tenant this request is acting in. Required when kind === 'user'. */
  organizationId?: string;
  /** Narrows a facility-scoped staff member to their own location. */
  facilityId?: string;
  /** Correlates database work with the HTTP request in the logs. */
  requestId?: string;
}

/**
 * Runs `fn` inside a transaction with the tenant GUCs set.
 *
 * Everything hangs off this. The GUCs are set with `set_config(..., true)`,
 * meaning transaction-local -- they are discarded on commit or rollback, so a
 * pooled connection can never leak one request's tenant into the next.
 *
 * The application database role must be a non-superuser that does NOT own the
 * tables, otherwise Postgres skips RLS entirely and every policy below is
 * decoration. See drizzle/sql/rls.sql and the README's database setup section.
 */
export async function withActor<T>(ctx: ActorContext, fn: (tx: Tx) => Promise<T>): Promise<T> {
  if (ctx.kind === 'user' && !ctx.organizationId) {
    throw new Error('withActor: a user context requires an organizationId');
  }

  return db.transaction(async (tx) => {
    await tx.execute(raw`
      select
        set_config('app.actor_kind', ${ctx.kind}, true),
        set_config('app.current_user_id', ${ctx.userId ?? ''}, true),
        set_config('app.current_org_id', ${ctx.organizationId ?? ''}, true),
        set_config('app.current_facility_id', ${ctx.facilityId ?? ''}, true),
        set_config('app.request_id', ${ctx.requestId ?? ''}, true)
    `);
    return fn(tx as Tx);
  });
}

/** Convenience wrapper for the common case: a signed-in user inside a tenant. */
export function withTenant<T>(
  args: { userId: string; organizationId: string; facilityId?: string; requestId?: string },
  fn: (tx: Tx) => Promise<T>,
): Promise<T> {
  return withActor({ kind: 'user', ...args }, fn);
}

/**
 * Unauthenticated reads: marketplace search, public profiles, Direct pages.
 * Policies expose only rows that are published and approved.
 */
export function withPublic<T>(fn: (tx: Tx) => Promise<T>, requestId?: string): Promise<T> {
  return withActor({ kind: 'anonymous', requestId }, fn);
}

/**
 * CareOndeck staff. Reads across tenants, so every call site must also write a
 * `phi_access_logs` row when the data it touches is patient data.
 */
export function withInternal<T>(
  args: { userId: string; requestId?: string },
  fn: (tx: Tx) => Promise<T>,
): Promise<T> {
  return withActor({ kind: 'internal', ...args }, fn);
}

/**
 * Background jobs and webhook handlers. Scoped to one organization where the
 * work belongs to one (billing sync, campaign rollups); org-less only for
 * genuinely global work such as draining the search index outbox.
 */
export function withSystem<T>(
  args: { organizationId?: string; requestId?: string },
  fn: (tx: Tx) => Promise<T>,
): Promise<T> {
  return withActor({ kind: 'system', ...args }, fn);
}

/**
 * Promotes the current transaction to act as `userId`.
 *
 * There is exactly one moment this is right: credentials have just been
 * verified, but no session exists yet. The login transaction started out
 * anonymous and must now insert a `sessions` row, which the `sessions_owner`
 * policy accepts only from that row's owner. Transaction-local, like every
 * other GUC here -- it cannot outlive the request.
 */
export async function assumeUser(tx: Tx, userId: string): Promise<void> {
  await tx.execute(raw`select set_config('app.current_user_id', ${userId}, true)`);
}

/**
 * Runs `fn` with the actor raised to `system`, restoring the previous kind
 * afterwards -- on the error path too.
 *
 * For server-initiated ledger writes only: the delivery record for a one-time
 * code the server decided to send, the usage row behind a metered call. The
 * *caller* may be anonymous, but the *server* is the one acting, and the
 * policies are right to refuse the anonymous actor. Never wrap anything that
 * reads or writes on a user's behalf in this; that is what the actor kinds
 * above are for.
 */
export async function withElevated<T>(tx: Tx, fn: () => Promise<T>): Promise<T> {
  const rows = await tx.execute<{ kind: string | null }>(
    raw`select current_setting('app.actor_kind', true) as kind`,
  );
  const previous = rows[0]?.kind ?? '';
  await tx.execute(raw`select set_config('app.actor_kind', 'system', true)`);
  try {
    return await fn();
  } finally {
    await tx.execute(raw`select set_config('app.actor_kind', ${previous}, true)`);
  }
}
