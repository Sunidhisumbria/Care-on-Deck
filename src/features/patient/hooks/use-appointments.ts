'use client';

import { useQuery } from '@tanstack/react-query';

import { patientKeys } from '@/lib/query/keys';

import { patientApi } from '../api/patient.api';

/** The caller's upcoming visits, soonest first. Self-scoped server-side. */
export function useUpcomingAppointments() {
  return useQuery({
    queryKey: patientKeys.appointments(),
    queryFn: () => patientApi.appointments(),
  });
}
