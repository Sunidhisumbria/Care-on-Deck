import { env } from '@/server/config/env';
import { IntegrationNotConfiguredError } from '@/server/http/errors';

import type { Adapter, AddressComponents, GeoPoint } from './types';

/**
 * IA: 15. External Services > Maps (Google Maps, Google Address Autocomplete).
 *
 * Three uses: the Address Autocomplete component during onboarding and booking,
 * geocoding a facility so Distance sort works, and the Static Map on facility
 * profiles.
 *
 * Results are cached in `geocode_cache`. Maps bills per request, and without a
 * cache the marketplace pays again for the same lookup on every search.
 */
export interface PlaceSuggestion {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

export interface GoogleMapsAdapter extends Adapter {
  /**
   * `sessionToken` groups the keystrokes of one autocomplete interaction into a
   * single billable session -- without it, every character is charged.
   */
  autocompleteAddress(input: {
    query: string;
    sessionToken: string;
    near?: GeoPoint;
  }): Promise<PlaceSuggestion[]>;

  getPlaceDetails(input: { placeId: string; sessionToken?: string }): Promise<{
    address: AddressComponents;
    location: GeoPoint;
    formattedAddress: string;
  }>;

  geocode(address: string): Promise<{ location: GeoPoint; placeId: string | null } | null>;

  /** Signed Static Maps URL for the facility profile. IA: 1. Facility Profile > Static Map */
  staticMapUrl(input: {
    location: GeoPoint;
    width: number;
    height: number;
    zoom?: number;
  }): string;
}

export const googleMaps: GoogleMapsAdapter = {
  vendor: 'google_maps',
  meter: 'google_maps',

  isConfigured() {
    return Boolean(env.GOOGLE_MAPS_SERVER_KEY);
  },

  async autocompleteAddress() {
    if (!this.isConfigured()) throw new IntegrationNotConfiguredError('Google Maps');
    throw new Error('googleMaps.autocompleteAddress is not implemented yet.');
  },

  async getPlaceDetails() {
    if (!this.isConfigured()) throw new IntegrationNotConfiguredError('Google Maps');
    throw new Error('googleMaps.getPlaceDetails is not implemented yet.');
  },

  async geocode() {
    if (!this.isConfigured()) throw new IntegrationNotConfiguredError('Google Maps');
    throw new Error('googleMaps.geocode is not implemented yet.');
  },

  staticMapUrl() {
    throw new Error('googleMaps.staticMapUrl is not implemented yet.');
  },
};
