'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { insuranceKeys, patientKeys } from '@/lib/query/keys';

import { insuranceApi } from '../api/insurance.api';
import type { PatientInsuranceInput } from '../types';

/** The insurance directory. Reference data, so it is kept for a while. Shared with provider onboarding. */
export function useInsuranceCarriers() {
  return useQuery({
    queryKey: insuranceKeys.carriers(),
    queryFn: insuranceApi.carriers,
    staleTime: 10 * 60 * 1000,
  });
}

/** IA: 3. Saved Insurance. Member IDs arrive masked. */
export function useSavedInsurance() {
  return useQuery({ queryKey: patientKeys.insurance(), queryFn: insuranceApi.saved });
}

/**
 * One card with its full member ID, for editing.
 *
 * Dropped from the cache as soon as the editor closes: a decrypted member ID
 * should live exactly as long as the screen that needs it.
 */
export function useInsuranceDetail(id: string | null) {
  return useQuery({
    queryKey: patientKeys.insuranceDetail(id ?? 'none'),
    queryFn: () => insuranceApi.detail(id as string),
    enabled: Boolean(id),
    gcTime: 0,
    staleTime: 0,
  });
}

/** Adds a card, or updates one when given its id. The profile shows the primary card, so it refreshes too. */
export function useSaveInsurance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, body }: { id?: string; body: PatientInsuranceInput }) =>
      id ? insuranceApi.update(id, body) : insuranceApi.create(body),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: patientKeys.insurance() }),
        queryClient.invalidateQueries({ queryKey: patientKeys.profile() }),
      ]);
    },
  });
}
