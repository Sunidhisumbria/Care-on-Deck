'use client';

import { useQuery } from '@tanstack/react-query';

import { patientKeys } from '@/lib/query/keys';

import { patientApi } from '../api/patient.api';

/** IA: 3. Patient Profile > Personal Information. */
export function usePatientProfile() {
  return useQuery({
    queryKey: patientKeys.profile(),
    queryFn: patientApi.profile,
  });
}
