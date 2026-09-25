/**
 * A patient's saved providers -- the heart on a provider card.
 *
 * IA: 3. Patient Dashboard > Saved Providers.
 *
 * Saving and unsaving are both idempotent: the heart is a toggle the patient
 * may tap twice, or on two tabs, and "already saved" is not an error worth
 * showing anyone.
 *
 * A patient runs as an anonymous actor with their user id set, so provider and
 * facility rows arrive through the public-read policies. A provider who is
 * unlisted or suspended after being saved therefore drops out of the list on
 * their own -- the saved row stays, and reappears if they are listed again.
 */
import { and, desc, eq, isNull, sql } from 'drizzle-orm';

import type { RequestContext } from '@/server/auth/context';
import {
  facilities,
  patients,
  patientSavedProviders,
  providerFacilities,
  providerSpecialties,
  providers,
  specialties,
} from '@/server/db/schema';
import type { Tx } from '@/server/db/tenant';
import { ApiError } from '@/server/http/errors';
import { recordAudit } from '@/server/observability/audit';

export interface SavedProvider {
  provider_id: string;
  name: string;
  credentials: string | null;
  specialty: string | null;
  /** Null until patients have reviewed them, as on the search card. */
  rating: { average: number; count: number } | null;
  facility: {
    name: string;
    address_line1: string | null;
    city: string | null;
    state: string | null;
    postal_code: string | null;
  };
  saved_at: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Same rule as the marketplace card: the provider's chosen specialty, else the NPI registry's. */
const specialtyName = sql<
  string | null
>`coalesce(${specialties.name}, ${providers.npiRegistrySnapshot} #>> '{profile,primary_taxonomy,desc}')`;

export const savedProvidersService = {
  /** Most recently saved first. */
  async list(tx: Tx, ctx: RequestContext): Promise<SavedProvider[]> {
    const patientId = await ownPatientId(tx, ctx);

    const rows = await tx
      .select({
        providerId: providers.id,
        name: providers.displayName,
        firstName: providers.firstName,
        lastName: providers.lastName,
        credentials: providers.credentials,
        specialty: specialtyName,
        ratingAverage: providers.ratingAverage,
        ratingCount: providers.ratingCount,
        facilityName: facilities.name,
        addressLine1: facilities.addressLine1,
        city: facilities.city,
        state: facilities.state,
        postalCode: facilities.postalCode,
        savedAt: patientSavedProviders.createdAt,
      })
      .from(patientSavedProviders)
      .innerJoin(providers, eq(providers.id, patientSavedProviders.providerId))
      .innerJoin(providerFacilities, eq(providerFacilities.providerId, providers.id))
      .innerJoin(facilities, eq(facilities.id, providerFacilities.facilityId))
      .leftJoin(
        providerSpecialties,
        and(eq(providerSpecialties.providerId, providers.id), eq(providerSpecialties.isPrimary, true)),
      )
      .leftJoin(specialties, eq(specialties.id, providerSpecialties.specialtyId))
      .where(eq(patientSavedProviders.patientId, patientId))
      // One entry per provider, at the location their practice marked primary.
      .orderBy(desc(patientSavedProviders.createdAt), desc(providerFacilities.isPrimary));

    const seen = new Set<string>();
    const saved: SavedProvider[] = [];
    for (const row of rows) {
      if (seen.has(row.providerId)) continue;
      seen.add(row.providerId);
      saved.push({
        provider_id: row.providerId,
        name: row.name ?? `${row.firstName} ${row.lastName}`.trim(),
        credentials: row.credentials,
        specialty: row.specialty,
        rating:
          row.ratingAverage !== null && row.ratingCount > 0
            ? { average: row.ratingAverage, count: row.ratingCount }
            : null,
        facility: {
          name: row.facilityName,
          address_line1: row.addressLine1,
          city: row.city,
          state: row.state,
          postal_code: row.postalCode,
        },
        saved_at: row.savedAt.toISOString(),
      });
    }
    return saved;
  },

  /** Saves a listed provider. Saving one already saved changes nothing. */
  async save(tx: Tx, ctx: RequestContext, providerId: string): Promise<{ provider_id: string; saved: true }> {
    const patientId = await ownPatientId(tx, ctx);

    // RLS shows an anonymous actor only listed, active providers, so an
    // unlisted one reads as missing here exactly as it does in search.
    const [provider] = UUID.test(providerId)
      ? await tx
          .select({ id: providers.id })
          .from(providers)
          .where(and(eq(providers.id, providerId), isNull(providers.deletedAt)))
          .limit(1)
      : [];
    if (!provider) throw ApiError.notFound('That provider was not found.');

    const inserted = await tx
      .insert(patientSavedProviders)
      .values({ patientId, providerId: provider.id })
      .onConflictDoNothing()
      .returning({ id: patientSavedProviders.id });

    if (inserted[0]) {
      await recordAudit(tx, ctx, {
        action: 'patient.saved_provider.added',
        resourceType: 'patient_saved_provider',
        resourceId: inserted[0].id,
        metadata: { provider_id: provider.id },
      });
    }

    return { provider_id: provider.id, saved: true };
  },

  /** Unsaves. Unsaving one that is not saved changes nothing. */
  async remove(tx: Tx, ctx: RequestContext, providerId: string): Promise<{ provider_id: string; saved: false }> {
    const patientId = await ownPatientId(tx, ctx);
    if (!UUID.test(providerId)) throw ApiError.notFound('That provider was not found.');

    const removed = await tx
      .delete(patientSavedProviders)
      .where(
        and(eq(patientSavedProviders.patientId, patientId), eq(patientSavedProviders.providerId, providerId)),
      )
      .returning({ id: patientSavedProviders.id });

    if (removed[0]) {
      await recordAudit(tx, ctx, {
        action: 'patient.saved_provider.removed',
        resourceType: 'patient_saved_provider',
        resourceId: removed[0].id,
        metadata: { provider_id: providerId },
      });
    }

    return { provider_id: providerId, saved: false };
  },
};

async function ownPatientId(tx: Tx, ctx: RequestContext): Promise<string> {
  const userId = ctx.session?.userId;
  if (!userId) throw ApiError.unauthenticated();

  const [patient] = await tx
    .select({ id: patients.id })
    .from(patients)
    .where(and(eq(patients.userId, userId), isNull(patients.deletedAt)))
    .limit(1);
  if (!patient) throw ApiError.notFound('No patient record for this account.');

  return patient.id;
}
