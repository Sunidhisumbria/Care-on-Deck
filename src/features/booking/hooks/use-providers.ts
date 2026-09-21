'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { marketplaceKeys } from '@/lib/query/keys';

import { bookingApi } from '../api/booking.api';
import type { ProviderSearchFilters } from '../types';

/**
 * Providers matching the filter rail.
 *
 * The previous page stays on screen while a new filter loads, because the
 * alternative is the list blinking to empty every time a checkbox is ticked.
 * Kept fresh for a minute only: "next available" is a live number.
 */
export function useProviderSearch(filters: ProviderSearchFilters) {
  return useQuery({
    queryKey: marketplaceKeys.providerSearch(filters),
    queryFn: () => bookingApi.searchProviders(filters),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}
