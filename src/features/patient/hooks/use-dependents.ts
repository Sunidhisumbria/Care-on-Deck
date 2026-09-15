'use client';

import { useQuery } from '@tanstack/react-query';

import { patientKeys } from '@/lib/query/keys';

import { patientApi } from '../api/patient.api';

/** IA: 3. Patient Account > Dependents. */
export function useDependents() {
  return useQuery({
    queryKey: patientKeys.dependents(),
    queryFn: patientApi.dependents,
  });
}
