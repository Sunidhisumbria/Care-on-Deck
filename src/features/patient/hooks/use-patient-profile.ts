'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { ProfileUpdateInput } from '@/lib/patient-profile';
import { authKeys, patientKeys } from '@/lib/query/keys';

import { patientApi } from '../api/patient.api';

/**
 * IA: 3. Patient Profile > Personal Information.
 *
 * `fresh` is for forms, which read their starting values once: it always
 * refetches when the screen opens, even when a cached copy is still within
 * its stale time, so `isFetchedAfterMount` is guaranteed to turn true.
 */
export function usePatientProfile({ fresh = false }: { fresh?: boolean } = {}) {
  return useQuery({
    queryKey: patientKeys.profile(),
    queryFn: patientApi.profile,
    ...(fresh ? { refetchOnMount: 'always' as const } : {}),
  });
}

/**
 * IA: 3. Edit Profile. The response is the updated profile, so it replaces the
 * cached one directly. Insurance is refetched because the card may have changed,
 * and the signed-in user because the header shows the patient's name.
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: ProfileUpdateInput) => patientApi.updateProfile(body),
    onSuccess: (profile) => {
      queryClient.setQueryData(patientKeys.profile(), profile);
      void queryClient.invalidateQueries({ queryKey: patientKeys.insurance() });
      void queryClient.invalidateQueries({ queryKey: authKeys.currentUser() });
    },
  });
}
