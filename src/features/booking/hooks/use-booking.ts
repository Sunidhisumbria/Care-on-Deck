'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { marketplaceKeys, patientKeys } from '@/lib/query/keys';

import { bookingApi } from '../api/booking.api';
import type { BookingRequest } from '../types';

/** The visit reasons the chosen practice offers. Reference data for that practice. */
export function useVisitReasons(providerId: string | null) {
  return useQuery({
    queryKey: marketplaceKeys.visitReasons(providerId ?? 'none'),
    queryFn: () => bookingApi.visitReasons(providerId as string),
    enabled: Boolean(providerId),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Books the appointment.
 *
 * On success the provider's openings are dropped from the cache: the slot just
 * taken is gone, and anyone stepping back through the flow must not be offered
 * it again.
 */
export function useRequestBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: BookingRequest) => bookingApi.requestBooking(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: marketplaceKeys.all });
      void queryClient.invalidateQueries({ queryKey: patientKeys.appointments() });
    },
  });
}
