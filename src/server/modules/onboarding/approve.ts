/**
 * Approving a provider application: the records submission created go live.
 *
 * One function for both ways an application gets approved: a reviewer in
 * Control Center (not built yet -- `adminService.decideApproval` will call
 * this) and PROVIDER_AUTO_APPROVE on local and staging. With one path,
 * switching the setting off later changes nothing else.
 *
 * Approval makes the practice, its location, the provider and the doctor's
 * owner membership active, and lists the location and provider for patients.
 * It deliberately does not mark the NPI or license verified. Approving an
 * application and checking a license with the state board are different acts,
 * and an automatic approval has checked nothing.
 */
import { and, eq, isNull } from 'drizzle-orm';

import { DEFAULT_VISIT_REASONS } from '@/lib/visit-reasons';
import type { RequestContext } from '@/server/auth/context';
import {
  approvalRequests,
  facilities,
  memberships,
  onboardingSessions,
  organizations,
  providers,
  visitReasons,
} from '@/server/db/schema';
import { withElevated, type Tx } from '@/server/db/tenant';
import { ApiError } from '@/server/http/errors';
import { recordAudit } from '@/server/observability/audit';

type SessionRow = typeof onboardingSessions.$inferSelect;

export const AUTO_APPROVAL_NOTE =
  'Approved automatically: PROVIDER_AUTO_APPROVE is on in this environment. Nothing was reviewed.';

/**
 * The note for an automatic approval that went ahead despite our own checks.
 * The flags are spelled out so these approvals can be searched for and
 * reviewed once there is someone to review them.
 */
export function flaggedApprovalNote(flags: readonly string[]): string {
  return `${AUTO_APPROVAL_NOTE} Flagged, and approved anyway because PROVIDER_AUTO_APPROVE_FLAGGED is on: ${flags.join(', ')}.`;
}

export interface ApprovalDecision {
  /** The reviewer. Null when the approval was automatic. */
  decidedByUserId: string | null;
  note: string;
  automatic: boolean;
}

export async function approveApplication(
  tx: Tx,
  ctx: RequestContext,
  session: SessionRow,
  decision: ApprovalDecision,
): Promise<SessionRow> {
  const { userId, organizationId, facilityId, providerId, approvalRequestId } = session;
  if (
    session.status !== 'submitted' ||
    !userId ||
    !organizationId ||
    !facilityId ||
    !providerId ||
    !approvalRequestId
  ) {
    throw ApiError.conflict('Only a submitted application can be approved.');
  }

  const now = new Date();

  const approved = await withElevated(tx, async () => {
    await tx
      .update(approvalRequests)
      .set({
        status: 'approved',
        decidedByUserId: decision.decidedByUserId,
        decidedAt: now,
        decisionNote: decision.note,
        updatedAt: now,
      })
      .where(eq(approvalRequests.id, approvalRequestId));

    await tx
      .update(organizations)
      .set({ status: 'active', updatedAt: now })
      .where(eq(organizations.id, organizationId));

    await tx
      .update(facilities)
      .set({ status: 'active', isPubliclyListed: true, updatedAt: now })
      .where(eq(facilities.id, facilityId));

    await tx
      .update(providers)
      .set({ status: 'active', isPubliclyListed: true, updatedAt: now })
      .where(eq(providers.id, providerId));

    // What lets the doctor act inside their practice: loadPermissions honours only active memberships.
    await tx
      .update(memberships)
      .set({ status: 'active', updatedAt: now })
      .where(
        and(
          eq(memberships.userId, userId),
          eq(memberships.organizationId, organizationId),
          isNull(memberships.deletedAt),
        ),
      );

    // A practice with no visit reasons cannot be booked: the patient's second
    // screen would be empty. These are defaults it can rename or replace.
    const [reason] = await tx
      .select({ id: visitReasons.id })
      .from(visitReasons)
      .where(eq(visitReasons.organizationId, organizationId))
      .limit(1);

    if (!reason) {
      await tx.insert(visitReasons).values(
        DEFAULT_VISIT_REASONS.map((entry, index) => ({
          organizationId,
          facilityId,
          name: entry.name,
          description: entry.description,
          visitType: entry.visitType,
          durationMinutes: entry.durationMinutes,
          displayOrder: index,
        })),
      );
    }

    const [row] = await tx
      .update(onboardingSessions)
      .set({ status: 'approved', reviewerNote: null, updatedAt: now })
      .where(eq(onboardingSessions.id, session.id))
      .returning();
    return row;
  });
  if (!approved) throw ApiError.internal('Could not approve the application.');

  await recordAudit(tx, ctx, {
    action: 'onboarding.approved',
    resourceType: 'onboarding_session',
    resourceId: session.id,
    organizationId,
    metadata: { automatic: decision.automatic, approvalRequestId, providerId },
  });

  return approved;
}
