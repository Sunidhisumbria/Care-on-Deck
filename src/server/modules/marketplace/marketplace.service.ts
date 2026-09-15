/**
 * The unauthenticated storefront.
 *
 * Everything here runs as an anonymous actor, so RLS exposes only rows that are
 * published AND approved -- there is no code path that can widen that by mistake.
 *
 * Search is served from Typesense; the profile reads come from Postgres, because
 * a profile must never show a stale price, address or roster.
 *
 * IA: 1. Public Marketplace
 */
import type { Tx } from '@/server/db/tenant';
import { notImplemented } from '@/server/http/response';

export const marketplaceService = {
  /**
   * Provider and facility search with the Filters panel applied.
   * IA: 1. Search Results > Filters, Sort Results, Map Preview
   */
  async search(tx: Tx, query: unknown): Promise<unknown> {
    return notImplemented('marketplaceService.search');
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
