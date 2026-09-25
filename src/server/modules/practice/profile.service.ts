/**
 * The signed-in provider's own profile, read from the live records their
 * approved application created -- not from the application itself, so what is
 * shown is what patients and the booking engine actually use.
 *
 * IA: 6. Account Menu > Personal Information
 */
import { and, asc, desc, eq, inArray, isNull, sql } from 'drizzle-orm';

import type { RequestContext } from '@/server/auth/context';
import { users } from '@/server/db/schema/identity';
import { insuranceCarriers, providerAcceptedPlans } from '@/server/db/schema/insurance';
import { mediaAssets } from '@/server/db/schema/moderation';
import { facilities, organizations, specialties } from '@/server/db/schema/organizations';
import {
  providerFacilities,
  providerLicenses,
  providerSpecialties,
  providers,
} from '@/server/db/schema/providers';
import { availabilityRules } from '@/server/db/schema/scheduling';
import { withElevated, type Tx } from '@/server/db/tenant';
import { ApiError } from '@/server/http/errors';
import { ownedFile } from '@/server/modules/uploads/uploads.service';
import { recordAudit } from '@/server/observability/audit';

import type { UpdateProviderPhotoInput } from './profile.schemas';

export interface ProfileFile {
  media_id: string;
  content_type: string;
}

export interface ProviderProfile {
  name: string;
  credentials: string | null;
  email: string | null;
  phone: string | null;
  headshot: ProfileFile | null;
  bio: string | null;
  years_experience: number | null;
  npi: string | null;
  specialty: string | null;
  practice: {
    name: string;
    office_type: string;
    phone: string | null;
    email: string | null;
    website: string | null;
    /** The clinic's zone: its hours and every booked time are in it. */
    timezone: string;
    address: { line1: string | null; line2: string | null; city: string | null; state: string | null; postal_code: string | null };
  } | null;
  license: { state: string; license_number: string; expires_on: string | null; status: string; document: ProfileFile | null } | null;
  certificates: ProfileFile[];
  availability: {
    slot_minutes: number | null;
    /** Only the days worked. 0 = Sunday … 6 = Saturday; times "HH:MM". */
    days: Array<{ weekday: number; start: string; end: string }>;
    /** Gaps inside a working day, e.g. lunch. */
    breaks: Array<{ start: string; end: string }>;
  };
  insurance: { self_pay_only: boolean; carriers: string[] };
}

const specialtyName = sql<
  string | null
>`coalesce(${specialties.name}, ${providers.npiRegistrySnapshot} #>> '{profile,primary_taxonomy,desc}')`;

export const providerProfileService = {
  /**
   * Personal details > photo. Only the provider's own headshot upload may be
   * attached. It stays pending in photo review like every headshot, and moves
   * into the practice so its members can open it.
   */
  async updatePhoto(tx: Tx, ctx: RequestContext, input: UpdateProviderPhotoInput): Promise<ProviderProfile> {
    const userId = ctx.session?.userId;
    if (!userId) throw ApiError.unauthenticated();
    const organizationId = ctx.organizationId;
    if (!organizationId) throw ApiError.badRequest('No active organization.');

    const [provider] = await tx
      .select({ id: providers.id, headshotMediaId: providers.headshotMediaId })
      .from(providers)
      .where(and(eq(providers.userId, userId), eq(providers.organizationId, organizationId), isNull(providers.deletedAt)))
      .limit(1);
    if (!provider) throw ApiError.notFound('No provider profile for this account.');

    const mediaId = input.headshot_media_id;
    if (mediaId && mediaId !== provider.headshotMediaId) {
      const photo = await ownedFile(tx, userId, mediaId, 'provider_headshot');
      if (!photo) {
        const message = 'That photo was not recognised. Upload it again.';
        throw new ApiError('VALIDATION_FAILED', message, { details: [{ path: 'headshot_media_id', message }] });
      }
      await withElevated(tx, () =>
        tx
          .update(mediaAssets)
          .set({ organizationId, updatedAt: new Date() })
          .where(and(eq(mediaAssets.id, mediaId), eq(mediaAssets.uploadedByUserId, userId))),
      );
    }

    if (mediaId !== provider.headshotMediaId) {
      await tx
        .update(providers)
        .set({ headshotMediaId: mediaId, updatedAt: new Date() })
        .where(eq(providers.id, provider.id));

      await recordAudit(tx, ctx, {
        action: mediaId ? 'provider.photo_updated' : 'provider.photo_removed',
        resourceType: 'provider',
        resourceId: provider.id,
        organizationId,
      });
    }

    return providerProfileService.getOwn(tx, ctx);
  },

  async getOwn(tx: Tx, ctx: RequestContext): Promise<ProviderProfile> {
    const userId = ctx.session?.userId;
    if (!userId) throw ApiError.unauthenticated();
    const organizationId = ctx.organizationId;
    if (!organizationId) throw ApiError.badRequest('No active organization.');

    const [row] = await tx
      .select({
        id: providers.id,
        firstName: providers.firstName,
        lastName: providers.lastName,
        credentials: providers.credentials,
        headshotMediaId: providers.headshotMediaId,
        certificateMediaIds: providers.certificateMediaIds,
        bio: providers.bio,
        yearsExperience: providers.yearsExperience,
        npi: providers.npi,
        specialty: specialtyName,
      })
      .from(providers)
      .leftJoin(
        providerSpecialties,
        and(eq(providerSpecialties.providerId, providers.id), eq(providerSpecialties.isPrimary, true)),
      )
      .leftJoin(specialties, eq(specialties.id, providerSpecialties.specialtyId))
      .where(and(eq(providers.userId, userId), eq(providers.organizationId, organizationId), isNull(providers.deletedAt)))
      .limit(1);
    if (!row) throw ApiError.notFound('No provider profile for this account.');

    const [account] = await tx.select({ email: users.email, phone: users.phone }).from(users).where(eq(users.id, userId)).limit(1);

    const [practice] = await tx
      .select({
        name: facilities.name,
        officeType: facilities.officeType,
        phone: facilities.phone,
        email: facilities.email,
        website: organizations.website,
        timezone: facilities.timezone,
        line1: facilities.addressLine1,
        line2: facilities.addressLine2,
        city: facilities.city,
        state: facilities.state,
        postalCode: facilities.postalCode,
      })
      .from(providerFacilities)
      .innerJoin(facilities, eq(facilities.id, providerFacilities.facilityId))
      .innerJoin(organizations, eq(organizations.id, facilities.organizationId))
      .where(eq(providerFacilities.providerId, row.id))
      .orderBy(desc(providerFacilities.isPrimary))
      .limit(1);

    const [license] = await tx
      .select()
      .from(providerLicenses)
      .where(eq(providerLicenses.providerId, row.id))
      .orderBy(desc(providerLicenses.createdAt))
      .limit(1);

    const rules = await tx
      .select({
        weekday: availabilityRules.weekday,
        startTime: availabilityRules.startTime,
        endTime: availabilityRules.endTime,
        slot: availabilityRules.slotIntervalMinutes,
      })
      .from(availabilityRules)
      .where(and(eq(availabilityRules.providerId, row.id), eq(availabilityRules.isActive, true)))
      .orderBy(asc(availabilityRules.weekday), asc(availabilityRules.startTime));

    const carriers = await tx
      .selectDistinct({ name: insuranceCarriers.name })
      .from(providerAcceptedPlans)
      .innerJoin(insuranceCarriers, eq(insuranceCarriers.id, providerAcceptedPlans.carrierId))
      .where(eq(providerAcceptedPlans.providerId, row.id))
      .orderBy(asc(insuranceCarriers.name));

    const certificateIds = row.certificateMediaIds ?? [];
    const files = await mediaFiles(tx, organizationId, [
      row.headshotMediaId,
      license?.documentMediaId ?? null,
      ...certificateIds,
    ]);

    return {
      name: `${row.firstName} ${row.lastName}`.trim(),
      credentials: row.credentials,
      email: account?.email ?? null,
      phone: account?.phone ?? null,
      headshot: row.headshotMediaId ? (files.get(row.headshotMediaId) ?? null) : null,
      bio: row.bio,
      years_experience: row.yearsExperience,
      npi: row.npi,
      specialty: row.specialty,
      practice: practice
        ? {
            name: practice.name,
            office_type: practice.officeType,
            phone: practice.phone,
            email: practice.email,
            website: practice.website,
            timezone: practice.timezone,
            address: {
              line1: practice.line1,
              line2: practice.line2,
              city: practice.city,
              state: practice.state,
              postal_code: practice.postalCode,
            },
          }
        : null,
      license: license
        ? {
            state: license.state,
            license_number: license.licenseNumber,
            expires_on: license.expiresOn,
            status: license.status,
            document: license.documentMediaId ? (files.get(license.documentMediaId) ?? null) : null,
          }
        : null,
      certificates: certificateIds.map((id) => files.get(id)).filter((file): file is ProfileFile => Boolean(file)),
      availability: weekly(rules),
      insurance: { self_pay_only: carriers.length === 0, carriers: carriers.map((carrier) => carrier.name) },
    };
  },
};

/** Files that belong to this practice, by id. Anything else is simply absent. */
async function mediaFiles(tx: Tx, organizationId: string, ids: Array<string | null>): Promise<Map<string, ProfileFile>> {
  const wanted = ids.filter((id): id is string => Boolean(id));
  if (wanted.length === 0) return new Map();
  const rows = await tx
    .select({ id: mediaAssets.id, contentType: mediaAssets.contentType })
    .from(mediaAssets)
    .where(and(inArray(mediaAssets.id, wanted), eq(mediaAssets.organizationId, organizationId), isNull(mediaAssets.deletedAt)));
  return new Map(rows.map((row) => [row.id, { media_id: row.id, content_type: row.contentType }]));
}

/**
 * Availability rules are stored as working windows, so a lunch break is the
 * gap between two windows on one day. Each day is shown from its first start
 * to its last end, and the gaps are listed once as breaks.
 */
function weekly(rules: Array<{ weekday: number; startTime: string; endTime: string; slot: number }>): ProviderProfile['availability'] {
  const hhmm = (time: string) => time.slice(0, 5);
  const byDay = new Map<number, Array<{ start: string; end: string }>>();
  for (const rule of rules) {
    byDay.set(rule.weekday, [...(byDay.get(rule.weekday) ?? []), { start: hhmm(rule.startTime), end: hhmm(rule.endTime) }]);
  }

  const days: ProviderProfile['availability']['days'] = [];
  const breaks = new Map<string, { start: string; end: string }>();
  for (const [weekday, windows] of [...byDay.entries()].sort((a, b) => a[0] - b[0])) {
    windows.sort((a, b) => a.start.localeCompare(b.start));
    days.push({ weekday, start: windows[0]!.start, end: windows[windows.length - 1]!.end });
    for (let index = 1; index < windows.length; index += 1) {
      const gap = { start: windows[index - 1]!.end, end: windows[index]!.start };
      if (gap.start < gap.end) breaks.set(`${gap.start}-${gap.end}`, gap);
    }
  }

  return {
    slot_minutes: rules.length > 0 ? Math.min(...rules.map((rule) => rule.slot)) : null,
    days,
    breaks: [...breaks.values()].sort((a, b) => a.start.localeCompare(b.start)),
  };
}
