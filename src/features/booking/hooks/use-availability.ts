'use client';

import { useQuery } from '@tanstack/react-query';

import { marketplaceKeys } from '@/lib/query/keys';

import { bookingApi } from '../api/booking.api';

/**
 * A provider's open slots across a span of dates.
 *
 * Short staleness on purpose: someone else may take the 9:00 while this
 * calendar is open, and offering a slot that is already gone wastes the last
 * step of the flow.
 */
export function useProviderAvailability(providerId: string | null, from: string, to: string) {
  return useQuery({
    queryKey: marketplaceKeys.availability(providerId ?? 'none', from, to),
    queryFn: () => bookingApi.availability(providerId as string, from, to),
    enabled: Boolean(providerId),
    staleTime: 30_000,
  });
}
