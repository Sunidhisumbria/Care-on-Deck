import { sql as raw } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { db, type schema } from './client';

export type Tx = PostgresJsDatabase<typeof schema>;

export type ActorKind =
  | 'anonymous'
  | 'user'
  | 'internal'
  | 'system';

export interface ActorContext {
  kind: ActorKind;
  userId?: string;
  organizationId?: string;
  facilityId?: string;
  requestId?: string;
}


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


export async function assumeUser(tx: Tx, userId: string): Promise<void> {
  await tx.execute(raw`select set_config('app.current_user_id', ${userId}, true)`);
}

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
