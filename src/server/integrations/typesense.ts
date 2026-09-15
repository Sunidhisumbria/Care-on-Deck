import { env } from '@/server/config/env';
import { IntegrationNotConfiguredError } from '@/server/http/errors';

import type { Adapter, GeoPoint } from './types';

/**
 * IA: 15. External Services > Search > Typesense; 1. Public Marketplace.
 *
 * Typesense serves the Search Results screen: typo tolerance on names, facets
 * for the Filters panel, and geo sort for Distance. Postgres stays the source
 * of truth -- the index is rebuilt from it and is disposable.
 *
 * Writes go through the `search_index_jobs` outbox, never straight from a
 * request, so a Typesense outage can never fail a booking.
 */
export interface ProviderDocument {
  id: string;
  organizationId: string;
  displayName: string;
  credentials: string | null;
  specialties: string[];
  languages: string[];
  gender: string | null;
  visitTypes: string[];
  practiceStyle: string | null;
  insurancePlanIds: string[];
  facilityIds: string[];
  /** [lat, lng] of the primary facility -- Typesense geo field order. */
  location: [number, number] | null;
  rating: number | null;
  ratingCount: number;
  acceptingNewPatients: boolean;
  /** Unix seconds, for the "soonest available" sort. */
  nextAvailableAt: number | null;
  /** Boost for paid placement. IA: 14. Pricing Configuration > Sponsored Placement */
  sponsoredWeight: number;
}

export interface FacilityDocument {
  id: string;
  organizationId: string;
  name: string;
  officeType: string;
  practiceStyle: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  location: [number, number] | null;
  specialtyIds: string[];
  insurancePlanIds: string[];
  rating: number | null;
  ratingCount: number;
  sponsoredWeight: number;
}

/** Mirrors the Filters panel one-for-one. IA: 1. Search Results > Filters */
export interface SearchQuery {
  q?: string;
  near?: GeoPoint;
  radiusMiles?: number;
  specialtyIds?: string[];
  insurancePlanIds?: string[];
  languages?: string[];
  gender?: string;
  visitTypes?: string[];
  availableWithinDays?: number;
  minRating?: number;
  /** IA: 1. Search Results > Sort Results */
  sort?: 'relevance' | 'distance' | 'rating' | 'soonest';
  page?: number;
  perPage?: number;
}

export interface SearchHit<T> {
  document: T;
  textMatch: number;
  distanceMiles?: number;
}

export interface SearchResult<T> {
  hits: SearchHit<T>[];
  found: number;
  page: number;
  facets: Record<string, Array<{ value: string; count: number }>>;
}

export interface TypesenseAdapter extends Adapter {
  ensureCollections(): Promise<void>;
  upsertProvider(doc: ProviderDocument): Promise<void>;
  upsertFacility(doc: FacilityDocument): Promise<void>;
  deleteDocument(collection: 'providers' | 'facilities', id: string): Promise<void>;
  searchProviders(query: SearchQuery): Promise<SearchResult<ProviderDocument>>;
  searchFacilities(query: SearchQuery): Promise<SearchResult<FacilityDocument>>;
}

export const typesense: TypesenseAdapter = {
  vendor: 'typesense',
  meter: null,

  isConfigured() {
    return Boolean(env.TYPESENSE_HOST && env.TYPESENSE_API_KEY);
  },

  async ensureCollections() {
    if (!this.isConfigured()) throw new IntegrationNotConfiguredError('Typesense');
    throw new Error('typesense.ensureCollections is not implemented yet.');
  },

  async upsertProvider() {
    throw new Error('typesense.upsertProvider is not implemented yet.');
  },

  async upsertFacility() {
    throw new Error('typesense.upsertFacility is not implemented yet.');
  },

  async deleteDocument() {
    throw new Error('typesense.deleteDocument is not implemented yet.');
  },

  async searchProviders() {
    if (!this.isConfigured()) throw new IntegrationNotConfiguredError('Typesense');
    throw new Error('typesense.searchProviders is not implemented yet.');
  },

  async searchFacilities() {
    throw new Error('typesense.searchFacilities is not implemented yet.');
  },
};
