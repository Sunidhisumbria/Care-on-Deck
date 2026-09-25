/**
 * The unauthenticated storefront.
 *
 * Everything here runs as an anonymous actor, so RLS exposes only rows that are
 * published AND approved -- there is no code path that can widen that by mistake.
 *
 * Search reads Postgres directly. Typesense is the eventual home for it, but a
 * search index is worth having only once there is a catalogue to index, and it
 * cannot answer "who is free on Thursday" at all -- that comes from the
 * schedule tables either way.
 *
 * IA: 1. Public Marketplace
 */
import { and, asc, desc, eq, exists, ilike, inArray, isNull, or, sql } from 'drizzle-orm';
import { DateTime } from 'luxon';

import {
  facilities,
  insuranceCarriers,
  providerAcceptedPlans,
  providerFacilities,
  providerSpecialties,
  providers,
  specialties,
} from '@/server/db/schema';
import type { Tx } from '@/server/db/tenant';
import { notImplemented } from '@/server/http/response';
import { nextAvailable, openSlots } from '@/server/modules/scheduling/availability';

import type { ProviderSearchQuery } from './marketplace.schemas';

export interface ProviderCard {
  id: string;
  slug: string | null;
  name: string;
  credentials: string | null;
  specialty: string | null;
  years_experience: number | null;
  languages: string[];
  accepting_new_patients: boolean;
  /** Null until patients have reviewed them; the card shows nothing rather than a zero. */
  rating: { average: number; count: number } | null;
  facility: {
    id: string;
    name: string;
    office_type: string;
    city: string | null;
    state: string | null;
    timezone: string;
  };
  /** Carrier names, alphabetical. */
  insurers: string[];
  /** UTC ISO instant of the first open slot, or null when the next month is full. */
  next_available: string | null;
}

export interface ProviderSearchResult {
  providers: ProviderCard[];
  total: number;
}

/**
 * A provider's specialty, preferring the one they picked over the taxonomy the
 * NPI registry holds. `specialties` is reference data that Control Center will
 * own; until it is filled, the registry answer is the honest one.
 */
const specialtyName = sql<
  string | null
>`coalesce(${specialties.name}, ${providers.npiRegistrySnapshot} #>> '{profile,primary_taxonomy,desc}')`;

export const marketplaceService = {
  /**
   * Provider search with the Filters panel applied.
   * IA: 1. Search Results > Filters, Sort Results, Map Preview
   */
  async search(tx: Tx, query: ProviderSearchQuery): Promise<ProviderSearchResult> {
    const conditions = [
      eq(providers.isPubliclyListed, true),
      eq(providers.status, 'active'),
      isNull(providers.deletedAt),
      eq(facilities.isPubliclyListed, true),
      eq(facilities.status, 'active'),
      isNull(facilities.deletedAt),
    ];

    if (query.q) {
      const term = `%${query.q.replace(/[%_]/g, '\$&')}%`;
      conditions.push(
        or(
          ilike(providers.displayName, term),
          ilike(facilities.name, term),
          ilike(facilities.city, term),
          sql`${specialtyName} ilike ${term}`,
        )!,
      );
    }

    if (query.provider_id) conditions.push(eq(providers.id, query.provider_id));

    if (query.accepting_new_patients !== undefined) {
      conditions.push(eq(providers.acceptingNewPatients, query.accepting_new_patients));
    }

    if (query.insurance_carrier_id) {
      conditions.push(
        exists(
          tx
            .select({ one: sql`1` })
            .from(providerAcceptedPlans)
            .where(
              and(
                eq(providerAcceptedPlans.providerId, providers.id),
                eq(providerAcceptedPlans.carrierId, query.insurance_carrier_id),
              ),
            ),
        ),
      );
    }

    const where = and(...conditions);

    const rows = await tx
      .select({
        id: providers.id,
        slug: providers.slug,
        name: providers.displayName,
        firstName: providers.firstName,
        lastName: providers.lastName,
        credentials: providers.credentials,
        specialty: specialtyName,
        yearsExperience: providers.yearsExperience,
        languages: providers.languages,
        acceptingNewPatients: providers.acceptingNewPatients,
        ratingAverage: providers.ratingAverage,
        ratingCount: providers.ratingCount,
        facilityId: facilities.id,
        facilityName: facilities.name,
        officeType: facilities.officeType,
        city: facilities.city,
        state: facilities.state,
        timezone: facilities.timezone,
      })
      .from(providers)
      .innerJoin(providerFacilities, eq(providerFacilities.providerId, providers.id))
      .innerJoin(facilities, eq(facilities.id, providerFacilities.facilityId))
      .leftJoin(
        providerSpecialties,
        and(
          eq(providerSpecialties.providerId, providers.id),
          eq(providerSpecialties.isPrimary, true),
        ),
      )
      .leftJoin(specialties, eq(specialties.id, providerSpecialties.specialtyId))
      .where(where)
      // A provider who works at several locations is one result, shown at the
      // location their practice marked primary.
      .orderBy(desc(providerFacilities.isPrimary), asc(providers.lastName))
      .limit(query.limit)
      .offset(query.offset);

    const [counted] = await tx
      .select({ total: sql<number>`count(distinct ${providers.id})::int` })
      .from(providers)
      .innerJoin(providerFacilities, eq(providerFacilities.providerId, providers.id))
      .innerJoin(facilities, eq(facilities.id, providerFacilities.facilityId))
      .leftJoin(
        providerSpecialties,
        and(
          eq(providerSpecialties.providerId, providers.id),
          eq(providerSpecialties.isPrimary, true),
        ),
      )
      .leftJoin(specialties, eq(specialties.id, providerSpecialties.specialtyId))
      .where(where);

    const unique = new Map<string, (typeof rows)[number]>();
    for (const row of rows) if (!unique.has(row.id)) unique.set(row.id, row);
    const found = [...unique.values()];
    const ids = found.map((row) => row.id);

    const [insurers, openings] = await Promise.all([
      insurersFor(tx, ids),
      firstOpenSlots(tx, ids, query.availability),
    ]);

    let cards: ProviderCard[] = found.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name ?? `${row.firstName} ${row.lastName}`.trim(),
      credentials: row.credentials,
      specialty: row.specialty,
      years_experience: row.yearsExperience,
      languages: row.languages ?? [],
      accepting_new_patients: row.acceptingNewPatients,
      rating:
        row.ratingAverage !== null && row.ratingCount > 0
          ? { average: row.ratingAverage, count: row.ratingCount }
          : null,
      facility: {
        id: row.facilityId,
        name: row.facilityName,
        office_type: row.officeType,
        city: row.city,
        state: row.state,
        timezone: row.timezone,
      },
      insurers: insurers.get(row.id) ?? [],
      next_available: openings.get(row.id) ?? null,
    }));

    // Asking for "free today" means exactly that: no slot, no result.
    if (query.availability) cards = cards.filter((card) => card.next_available !== null);

    cards.sort(bySort(query.sort));

    return { providers: cards, total: counted?.total ?? cards.length };
  },

  /** IA: 1. Homepage > Browse by Specialty */
  async listSpecialties(tx: Tx): Promise<unknown> {
    return notImplemented('marketplaceService.listSpecialties');
  },

  /**
   * The curated rails: Top-Rated Specialists, Dental Care Without the Wait,
   * Dermatology Appointments, Imaging Centers. IA: 1. Homepage
   */
  async getHomepageSections(tx: Tx): Promise<unknown> {
    return notImplemented('marketplaceService.getHomepageSections');
  },

  /**
   * IA: 1. Provider Profile > Header, Credentials, Specialty, Locations,
   * Availability, Reviews
   */
  async getProviderProfile(tx: Tx, slug: string): Promise<unknown> {
    return notImplemented('marketplaceService.getProviderProfile');
  },

  /**
   * IA: 1. Facility Profile > Header, Location Details, Static Map, Services,
   * Providers, Reviews, Availability
   */
  async getFacilityProfile(tx: Tx, slug: string): Promise<unknown> {
    return notImplemented('marketplaceService.getFacilityProfile');
  },
};

/** Carrier names per provider, alphabetical, for the "Insurance:" row on a card. */
async function insurersFor(tx: Tx, providerIds: string[]): Promise<Map<string, string[]>> {
  const byProvider = new Map<string, string[]>();
  if (providerIds.length === 0) return byProvider;

  const rows = await tx
    .selectDistinct({
      providerId: providerAcceptedPlans.providerId,
      carrier: insuranceCarriers.name,
    })
    .from(providerAcceptedPlans)
    .innerJoin(insuranceCarriers, eq(insuranceCarriers.id, providerAcceptedPlans.carrierId))
    .where(inArray(providerAcceptedPlans.providerId, providerIds))
    .orderBy(asc(insuranceCarriers.name));

  for (const row of rows) {
    const list = byProvider.get(row.providerId);
    if (list) list.push(row.carrier);
    else byProvider.set(row.providerId, [row.carrier]);
  }

  return byProvider;
}

/**
 * The first open slot for each provider.
 *
 * With no availability filter this looks a month ahead, which is what the card
 * shows. With one, it looks only inside the window asked for, so "Today" cannot
 * be answered with a slot next week.
 */
async function firstOpenSlots(
  tx: Tx,
  providerIds: string[],
  availability: ProviderSearchQuery['availability'],
): Promise<Map<string, string | null>> {
  if (providerIds.length === 0) return new Map();
  if (!availability) return nextAvailable(tx, providerIds);

  const days =
    availability === 'today'
      ? { start: 0, end: 0 }
      : availability === 'tomorrow'
        ? { start: 1, end: 1 }
        : { start: 0, end: 6 };

  // The instants are only an outer bound for reading booked times; which days
  // count as "today" and "tomorrow" is decided inside, in each clinic's zone.
  const now = DateTime.now();
  const open = await openSlots(tx, {
    providerIds,
    from: now.minus({ days: 1 }).toJSDate(),
    to: now.plus({ days: days.end + 2 }).toJSDate(),
    days,
    maxPerProvider: 1,
  });

  return new Map(providerIds.map((id) => [id, open.get(id)?.slots[0]?.starts_at ?? null]));
}

/**
 * "Recommended" puts reviewed providers first, because a rating is the only
 * signal here that comes from patients. Everything else is a tiebreak, and a
 * provider with no open slot sorts last either way.
 */
function bySort(sort: ProviderSearchQuery['sort']) {
  return (a: ProviderCard, b: ProviderCard): number => {
    if (sort === 'recommended') {
      const rating = (b.rating?.average ?? -1) - (a.rating?.average ?? -1);
      if (rating !== 0) return rating;
    }

    if (a.next_available !== b.next_available) {
      if (a.next_available === null) return 1;
      if (b.next_available === null) return -1;
      return a.next_available.localeCompare(b.next_available);
    }

    return a.name.localeCompare(b.name);
  };
}
