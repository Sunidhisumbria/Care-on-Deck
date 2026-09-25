/**
 * Editing the provider's live profile from Personal Information, one section
 * at a time. Each saves in one transaction, with an audit row, and stores
 * values in exactly the form onboarding does -- the same phone format, the same
 * license number casing -- so an edited profile cannot drift from a new one.
 *
 * The rules that matter:
 *   Practice  A move to another time zone is refused while appointments are
 *             booked, because it would change what every booked time means.
 *   Media     Certificates must be the provider's own uploads.
 *   License   Any change goes back to the reviewer as pending.
 *
 * IA: 6. Account Menu > Personal Information > Edit
 */
import { and, desc, eq, gt, inArray, isNull } from 'drizzle-orm';

import type { LicenseValues } from '@/lib/license';
import { normalizeUsPhone, normalizeWebsite, type PracticeValues } from '@/lib/practice';
import type { ProfileValues } from '@/lib/profile';
import { timezoneForState } from '@/lib/us-states';
import type { RequestContext } from '@/server/auth/context';
import { appointments } from '@/server/db/schema/appointments';
import { mediaAssets } from '@/server/db/schema/moderation';
import { facilities, organizations } from '@/server/db/schema/organizations';
import { providerFacilities, providerLicenses, providers } from '@/server/db/schema/providers';
import { withElevated, type Tx } from '@/server/db/tenant';
import { ApiError } from '@/server/http/errors';
import { ownedFile } from '@/server/modules/uploads/uploads.service';
import { recordAudit } from '@/server/observability/audit';

export async function updatePractice(tx: Tx, ctx: RequestContext, input: PracticeValues): Promise<void> {
  const own = await ownProvider(tx, ctx);

  const [facility] = await tx
    .select({ id: facilities.id, timezone: facilities.timezone, line1: facilities.addressLine1, city: facilities.city, state: facilities.state, postalCode: facilities.postalCode })
    .from(providerFacilities)
    .innerJoin(facilities, eq(facilities.id, providerFacilities.facilityId))
    .where(eq(providerFacilities.providerId, own.providerId))
    .orderBy(desc(providerFacilities.isPrimary))
    .limit(1);
  if (!facility) throw ApiError.notFound('This practice has no location yet.');

  const timezone = timezoneForState(input.state);
  if (timezone !== facility.timezone) {
    const booked = await tx
      .select({ id: appointments.id })
      .from(appointments)
      .where(
        and(
          eq(appointments.facilityId, facility.id),
          inArray(appointments.status, ['requested', 'confirmed']),
          gt(appointments.startsAt, new Date()),
          isNull(appointments.deletedAt),
        ),
      )
      .limit(1);
    if (booked.length > 0) {
      throw fieldError(
        'state',
        'This would move your practice to another time zone while appointments are booked, which would change every booked time. Contact support to move your practice.',
      );
    }
  }

  const name = input.name.replace(/\s+/g, ' ');
  const phone = normalizeUsPhone(input.phone);
  const email = input.email.toLowerCase();
  const moved =
    facility.line1 !== input.address_line1 ||
    facility.city !== input.city ||
    facility.state !== input.state ||
    facility.postalCode !== input.postal_code;
  const now = new Date();

  await tx
    .update(facilities)
    .set({
      name,
      officeType: input.office_type,
      addressLine1: input.address_line1,
      addressLine2: input.address_line2 || null,
      city: input.city,
      state: input.state,
      postalCode: input.postal_code,
      timezone,
      phone,
      email,
      // A new address makes the old map pin wrong; it is looked up again from the address.
      ...(moved ? { googlePlaceId: null, latitude: null, longitude: null } : {}),
      updatedAt: now,
    })
    .where(eq(facilities.id, facility.id));

  await tx
    .update(organizations)
    .set({
      name,
      officeType: input.office_type,
      website: normalizeWebsite(input.website),
      supportEmail: email,
      supportPhone: phone,
      updatedAt: now,
    })
    .where(eq(organizations.id, own.organizationId));

  await recordAudit(tx, ctx, {
    action: 'practice.details_updated',
    resourceType: 'facility',
    resourceId: facility.id,
    organizationId: own.organizationId,
    metadata: { moved, timezone_changed: timezone !== facility.timezone },
  });
}

/** Bio, experience and certificates. The photo is saved on its own, from Personal Details. */
export async function updateMedia(
  tx: Tx,
  ctx: RequestContext,
  input: Pick<ProfileValues, 'bio' | 'years_experience' | 'certificate_media_ids'>,
): Promise<void> {
  const own = await ownProvider(tx, ctx);
  const current = new Set(own.certificateMediaIds);

  const added = input.certificate_media_ids.filter((id) => !current.has(id));
  for (const mediaId of added) {
    if (!(await ownedFile(tx, own.userId, mediaId, 'certificate'))) {
      throw fieldError('certificate_media_ids', 'A certificate could not be found. Upload it again.');
    }
  }
  await attachToPractice(tx, own, added);

  await tx
    .update(providers)
    .set({
      bio: input.bio,
      yearsExperience: input.years_experience,
      certificateMediaIds: input.certificate_media_ids,
      updatedAt: new Date(),
    })
    .where(eq(providers.id, own.providerId));

  await recordAudit(tx, ctx, {
    action: 'provider.profile_updated',
    resourceType: 'provider',
    resourceId: own.providerId,
    organizationId: own.organizationId,
    metadata: { certificates: input.certificate_media_ids.length },
  });
}

/** Any change sends the license back to the reviewer: a verified license is one a person checked. */
export async function updateLicense(tx: Tx, ctx: RequestContext, input: LicenseValues): Promise<void> {
  const own = await ownProvider(tx, ctx);

  const [license] = await tx
    .select()
    .from(providerLicenses)
    .where(eq(providerLicenses.providerId, own.providerId))
    .orderBy(desc(providerLicenses.createdAt))
    .limit(1);

  const documentId = input.document_media_id ?? null;
  if (documentId && documentId !== license?.documentMediaId) {
    if (!(await ownedFile(tx, own.userId, documentId, 'license_document'))) {
      throw fieldError('document_media_id', 'That document could not be found. Upload it again.');
    }
    await attachToPractice(tx, own, [documentId]);
  }

  const values = {
    state: input.state,
    licenseNumber: input.license_number.replace(/\s+/g, ' ').toUpperCase(),
    expiresOn: input.expires_on,
    documentMediaId: documentId,
    status: 'pending' as const,
    verifiedAt: null,
    verifiedByUserId: null,
    updatedAt: new Date(),
  };

  if (license) {
    await tx.update(providerLicenses).set(values).where(eq(providerLicenses.id, license.id));
  } else {
    await tx.insert(providerLicenses).values({ organizationId: own.organizationId, providerId: own.providerId, ...values });
  }

  await recordAudit(tx, ctx, {
    action: 'provider.license_updated',
    resourceType: 'provider',
    resourceId: own.providerId,
    organizationId: own.organizationId,
    metadata: { state: input.state, has_document: Boolean(documentId) },
  });
}

// --- helpers -----------------------------------------------------------------

async function ownProvider(tx: Tx, ctx: RequestContext) {
  const userId = ctx.session?.userId;
  if (!userId) throw ApiError.unauthenticated();
  const organizationId = ctx.organizationId;
  if (!organizationId) throw ApiError.badRequest('No active organization.');

  const [provider] = await tx
    .select({ id: providers.id, certificateMediaIds: providers.certificateMediaIds })
    .from(providers)
    .where(and(eq(providers.userId, userId), eq(providers.organizationId, organizationId), isNull(providers.deletedAt)))
    .limit(1);
  if (!provider) throw ApiError.notFound('No provider profile for this account.');

  return { userId, organizationId, providerId: provider.id, certificateMediaIds: provider.certificateMediaIds ?? [] };
}

/** New uploads move into the practice, so its members can open them. */
async function attachToPractice(tx: Tx, own: { userId: string; organizationId: string }, mediaIds: string[]) {
  if (mediaIds.length === 0) return;
  await withElevated(tx, () =>
    tx
      .update(mediaAssets)
      .set({ organizationId: own.organizationId, updatedAt: new Date() })
      .where(and(inArray(mediaAssets.id, mediaIds), eq(mediaAssets.uploadedByUserId, own.userId))),
  );
}

function fieldError(path: string, message: string): ApiError {
  return new ApiError('VALIDATION_FAILED', message, { details: [{ path, message }] });
}
