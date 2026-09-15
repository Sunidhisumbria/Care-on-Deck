/**
 * Submitting a provider application: the answers become records.
 *
 * Until now everything lived in `onboarding_sessions.draft`, on purpose -- an
 * abandoned application should leave nothing in the tables the marketplace
 * reads. Submission is the one moment those records are written: the practice,
 * its location, the provider, the license, weekly hours, accepted insurance,
 * the doctor's membership of their own practice, and the approval request a
 * reviewer will pick up.
 *
 * It all happens in the request's transaction, so a failure part-way leaves no
 * half-made practice. And nothing created here is visible to patients: every
 * record starts `pending_review`, nothing is publicly listed, and the membership
 * stays inactive until a reviewer approves. `loadPermissions` honours only
 * active memberships, so the doctor cannot act inside the practice before then.
 *
 * A resubmission -- after a reviewer asked for changes -- updates the records
 * the first submission created instead of making a second practice. License,
 * hours and insurance are replaced wholesale: they are exactly what a reviewer
 * asks to see changed, and diffing them would buy nothing.
 */
import { randomBytes } from 'node:crypto';

import { and, eq, inArray, isNull } from 'drizzle-orm';

import type { NpiLookupAnswer } from '@/lib/npi';
import type { OfficeType } from '@/lib/practice';
import { workingWindows, type ScheduleValues } from '@/lib/schedule';
import { slugify } from '@/lib/slug';
import type { RequestContext } from '@/server/auth/context';
import {
  approvalRequests,
  availabilityRules,
  facilities,
  facilityAcceptedPlans,
  mediaAssets,
  memberships,
  onboardingSessions,
  organizations,
  providerAcceptedPlans,
  providerFacilities,
  providerLicenses,
  providers,
  roles,
  users,
} from '@/server/db/schema';
import { withElevated, type Tx } from '@/server/db/tenant';
import { ApiError } from '@/server/http/errors';
import { recordAudit } from '@/server/observability/audit';

type SessionRow = typeof onboardingSessions.$inferSelect;

/** What each step stored. The service built these, so their shapes are known. */
interface StoredFile {
  media_id: string;
}
interface PracticeAnswer {
  name: string;
  office_type: OfficeType;
  phone: string;
  email: string;
  website: string | null;
  address: { line1: string; line2: string | null; city: string; state: string; postal_code: string };
  timezone: string;
}
interface LicenseAnswer {
  state: string;
  license_number: string;
  expires_on: string;
  document: StoredFile | null;
}
interface InsuranceAnswer {
  self_pay_only: boolean;
  carriers: Array<{ id: string; name: string }>;
}
interface ProfileAnswer {
  headshot: StoredFile | null;
  bio: string;
  years_experience: number;
  certificates: StoredFile[];
}

export async function submitApplication(
  tx: Tx,
  ctx: RequestContext,
  session: SessionRow,
  userId: string,
): Promise<SessionRow> {
  const lookup = session.draft.npi_lookup as NpiLookupAnswer | undefined;
  const confirmation = session.draft.confirm_profile as { flags?: string[] } | undefined;
  const license = session.draft.license_verification as LicenseAnswer | undefined;
  const practice = session.draft.practice_setup as PracticeAnswer | undefined;
  const schedule = session.draft.schedule_setup as ScheduleValues | undefined;
  const insurance = session.draft.insurance_setup as InsuranceAnswer | undefined;
  const profile = session.draft.photo_uploads as ProfileAnswer | undefined;

  if (!lookup || !confirmation || !license || !practice || !schedule || !insurance || !profile) {
    throw ApiError.conflict('Finish every step before submitting.');
  }

  const resubmission = Boolean(session.providerId);
  const now = new Date();

  const result = await withElevated(tx, async () => {
    const [ownerRole] = await tx
      .select({ id: roles.id })
      .from(roles)
      .where(and(eq(roles.key, 'owner'), isNull(roles.organizationId)))
      .limit(1);
    if (!ownerRole) throw ApiError.internal('The system roles are missing. Run the database seed.');

    const [account] = await tx
      .select({ firstName: users.firstName, lastName: users.lastName })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    // The registry's name, not the account's: it is what the reviewer checks
    // against, and the applicant confirmed it as theirs.
    const record = lookup.profile;
    const firstName = record?.first_name ?? account?.firstName ?? 'Provider';
    const lastName = record?.last_name ?? account?.lastName ?? 'Provider';
    const credentials = record?.credential ?? null;

    // --- the practice and its location ----------------------------------------------
    const organizationValues = {
      name: practice.name,
      officeType: practice.office_type,
      status: 'pending_review' as const,
      website: practice.website,
      supportEmail: practice.email,
      supportPhone: practice.phone,
      ownerUserId: userId,
      updatedAt: now,
    };
    const organizationId = session.organizationId
      ? await updateReturningId(session.organizationId, () =>
          tx.update(organizations).set(organizationValues).where(eq(organizations.id, session.organizationId!)),
        )
      : await insertReturningId(() =>
          tx
            .insert(organizations)
            .values({ ...organizationValues, slug: platformUniqueSlug(practice.name) })
            .returning({ id: organizations.id }),
        );

    const facilityValues = {
      organizationId,
      name: practice.name,
      officeType: practice.office_type,
      status: 'pending_review' as const,
      addressLine1: practice.address.line1,
      addressLine2: practice.address.line2,
      city: practice.address.city,
      state: practice.address.state,
      postalCode: practice.address.postal_code,
      timezone: practice.timezone,
      phone: practice.phone,
      email: practice.email,
      isPubliclyListed: false,
      updatedAt: now,
    };
    const facilityId = session.facilityId
      ? await updateReturningId(session.facilityId, () =>
          tx.update(facilities).set(facilityValues).where(eq(facilities.id, session.facilityId!)),
        )
      : await insertReturningId(() =>
          tx
            .insert(facilities)
            .values({ ...facilityValues, slug: slugify(practice.name, 140) })
            .returning({ id: facilities.id }),
        );

    // --- the provider -----------------------------------------------------------------
    const providerValues = {
      organizationId,
      userId,
      status: 'pending_review' as const,
      npi: lookup.npi,
      // Pending until a reviewer checks it; unverified when the registry could not even be asked.
      npiVerificationStatus: (record ? 'pending' : 'unverified') as 'pending' | 'unverified',
      npiRegistrySnapshot: {
        profile: record,
        registry_unavailable: lookup.registry_unavailable,
        looked_up_at: lookup.looked_up_at,
        flags: confirmation.flags ?? [],
      },
      firstName,
      middleName: record?.middle_name ?? null,
      lastName,
      credentials,
      displayName: `${firstName} ${lastName}${credentials ? `, ${credentials}` : ''}`,
      bio: profile.bio,
      headshotMediaId: profile.headshot?.media_id ?? null,
      yearsExperience: profile.years_experience,
      isPubliclyListed: false,
      updatedAt: now,
    };
    const providerId = session.providerId
      ? await updateReturningId(session.providerId, () =>
          tx.update(providers).set(providerValues).where(eq(providers.id, session.providerId!)),
        )
      : await insertReturningId(() =>
          tx
            .insert(providers)
            .values({ ...providerValues, slug: slugify(`${firstName} ${lastName}`, 160) })
            .returning({ id: providers.id }),
        );

    await tx.delete(providerFacilities).where(eq(providerFacilities.providerId, providerId));
    await tx.insert(providerFacilities).values({ organizationId, providerId, facilityId, isPrimary: true });

    // --- license ---------------------------------------------------------------------------
    await tx.delete(providerLicenses).where(eq(providerLicenses.providerId, providerId));
    await tx.insert(providerLicenses).values({
      organizationId,
      providerId,
      state: license.state,
      licenseNumber: license.license_number,
      expiresOn: license.expires_on,
      status: 'pending',
      documentMediaId: license.document?.media_id ?? null,
    });

    // --- weekly hours ------------------------------------------------------------------------
    await tx.delete(availabilityRules).where(eq(availabilityRules.providerId, providerId));
    const rules = schedule.days
      .filter((day) => day.enabled)
      .flatMap((day) =>
        workingWindows(day, schedule.breaks, schedule.appointment_minutes).map((window) => ({
          organizationId,
          facilityId,
          providerId,
          weekday: day.weekday,
          startTime: `${window.start}:00`,
          endTime: `${window.end}:00`,
          slotIntervalMinutes: schedule.appointment_minutes,
          capacity: 1,
          isActive: true,
        })),
      );
    if (rules.length > 0) await tx.insert(availabilityRules).values(rules);

    // --- accepted insurance, for the provider and their practice -------------------------------
    await tx.delete(providerAcceptedPlans).where(eq(providerAcceptedPlans.providerId, providerId));
    await tx.delete(facilityAcceptedPlans).where(eq(facilityAcceptedPlans.facilityId, facilityId));
    if (!insurance.self_pay_only && insurance.carriers.length > 0) {
      // A null plan means "all plans from this carrier".
      await tx.insert(providerAcceptedPlans).values(
        insurance.carriers.map((carrier) => ({ organizationId, providerId, carrierId: carrier.id, planId: null })),
      );
      await tx.insert(facilityAcceptedPlans).values(
        insurance.carriers.map((carrier) => ({ organizationId, facilityId, carrierId: carrier.id, planId: null })),
      );
    }

    // --- the doctor's place in their own practice ------------------------------------------------
    const [membership] = await tx
      .select({ id: memberships.id })
      .from(memberships)
      .where(
        and(
          eq(memberships.userId, userId),
          eq(memberships.organizationId, organizationId),
          isNull(memberships.facilityId),
          isNull(memberships.deletedAt),
        ),
      )
      .limit(1);
    if (!membership) {
      await tx.insert(memberships).values({
        userId,
        organizationId,
        scope: 'organization',
        roleId: ownerRole.id,
        // Inactive until approval: loadPermissions ignores anything but `active`.
        status: 'pending_review',
        title: 'Owner',
        acceptedAt: now,
      });
    }

    // Uploaded files now belong to the practice, so its members can reach them
    // through the organization's access rules rather than only by elevation.
    const mediaIds = [
      profile.headshot?.media_id,
      license.document?.media_id,
      ...profile.certificates.map((certificate) => certificate.media_id),
    ].filter((id): id is string => Boolean(id));
    if (mediaIds.length > 0) {
      await tx
        .update(mediaAssets)
        .set({ organizationId, updatedAt: now })
        .where(and(inArray(mediaAssets.id, mediaIds), eq(mediaAssets.uploadedByUserId, userId)));
    }

    // --- the reviewer's queue ----------------------------------------------------------------------
    const approvalRequestId = await insertReturningId(() =>
      tx
        .insert(approvalRequests)
        .values({
          organizationId,
          subjectType: 'provider',
          subjectId: providerId,
          status: 'pending_review',
          submittedByUserId: userId,
          submittedAt: now,
        })
        .returning({ id: approvalRequests.id }),
    );

    const [updated] = await tx
      .update(onboardingSessions)
      .set({
        status: 'submitted',
        submittedAt: now,
        organizationId,
        facilityId,
        providerId,
        approvalRequestId,
        currentStep: 'submit_for_review',
        lastActiveAt: now,
        updatedAt: now,
      })
      .where(eq(onboardingSessions.id, session.id))
      .returning();
    if (!updated) throw ApiError.internal('Could not submit the application.');

    return { updated, organizationId, facilityId, providerId, approvalRequestId };
  });

  await recordAudit(tx, ctx, {
    action: resubmission ? 'onboarding.resubmitted' : 'onboarding.submitted',
    resourceType: 'onboarding_session',
    resourceId: session.id,
    metadata: {
      organizationId: result.organizationId,
      facilityId: result.facilityId,
      providerId: result.providerId,
      approvalRequestId: result.approvalRequestId,
    },
  });

  return result.updated;
}

async function insertReturningId(insert: () => Promise<Array<{ id: string }>>): Promise<string> {
  const [row] = await insert();
  if (!row) throw ApiError.internal('Could not create a record for the application.');
  return row.id;
}

async function updateReturningId(id: string, update: () => Promise<unknown>): Promise<string> {
  await update();
  return id;
}

/**
 * Organization slugs are unique across the whole platform, and two practices in
 * different cities can share a name -- so a short random suffix, not a counter
 * that would reveal how many "Family Dental"s exist.
 */
function platformUniqueSlug(name: string): string {
  return `${slugify(name, 100)}-${randomBytes(3).toString('hex')}`;
}
