import { and, eq, isNull } from 'drizzle-orm';

import { db } from '@/server/db/client';
import { memberships, rolePermissions, roles } from '@/server/db/schema';
import { ApiError } from '@/server/http/errors';

import type { Permission } from './permissions';
import type { ResolvedSession } from './session';


export interface RequestContext {
  requestId: string;
  session: ResolvedSession | null;
  /** Null for anonymous traffic and for internal staff not scoped to a tenant. */
  organizationId: string | null;
  facilityId: string | null;
  permissions: ReadonlySet<Permission>;
  isInternal: boolean;
  ipAddress: string | null;
  userAgent: string | null;
}

export function isAuthenticated(
  ctx: RequestContext,
): ctx is RequestContext & { session: ResolvedSession } {
  return ctx.session !== null;
}

/**
 * Resolves the caller's effective permissions inside their active organization.
 *
 * The membership row is the authority, not the session: revoking a role takes
 * effect on the next request rather than when the session expires.
 */
export async function loadPermissions(
  userId: string,
  organizationId: string,
): Promise<{ permissions: Set<Permission>; facilityId: string | null }> {
  const rows = await db
    .select({
      permissionKey: rolePermissions.permissionKey,
      facilityId: memberships.facilityId,
    })
    .from(memberships)
    .innerJoin(roles, eq(roles.id, memberships.roleId))
    .leftJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
    .where(
      and(
        eq(memberships.userId, userId),
        eq(memberships.organizationId, organizationId),
        eq(memberships.status, 'active'),
        isNull(memberships.deletedAt),
      ),
    );

  if (rows.length === 0) {
    throw ApiError.forbidden('You are not a member of this organization.');
  }

  const permissions = new Set<Permission>();
  for (const row of rows) {
    if (row.permissionKey) permissions.add(row.permissionKey as Permission);
  }

  // A facility-scoped membership narrows every subsequent query. If the user
  // holds several memberships, the org-wide one (facilityId null) wins.
  const hasOrgWide = rows.some((r) => r.facilityId === null);
  const facilityId = hasOrgWide ? null : (rows[0]?.facilityId ?? null);

  return { permissions, facilityId };
}

/** Throws unless the caller holds every listed permission. */
export function assertPermissions(ctx: RequestContext, required: readonly Permission[]) {
  if (required.length === 0) return;
  if (ctx.isInternal) return; // Control Center staff hold the full set.

  const missing = required.filter((p) => !ctx.permissions.has(p));
  if (missing.length > 0) {
    throw ApiError.forbidden(
      `Missing permission${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}.`,
    );
  }
}
