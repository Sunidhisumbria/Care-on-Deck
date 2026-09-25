'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { patientKeys } from '@/lib/query/keys';

import { patientApi } from '../api/patient.api';
import type { SavedProvider } from '../types';

/** The caller's saved providers, most recent first. Self-scoped server-side. */
export function useSavedProviders() {
  return useQuery({
    queryKey: patientKeys.savedProviders(),
    queryFn: patientApi.savedProviders,
  });
}

/**
 * One provider's heart: whether they are saved, and a toggle.
 *
 * The heart flips the moment it is tapped -- `saved` reports where the pending
 * request is headed, not where the list was. Unsaving also drops the provider
 * from the cached list straight away, so a card on Saved Providers disappears
 * without waiting; if the server refuses, the list is put back. Either way the
 * list is refetched afterwards, since saving needs the server's copy of the
 * provider to draw its card.
 */
export function useSavedProvider(providerId: string) {
  const queryClient = useQueryClient();
  const key = patientKeys.savedProviders();
  const { data, isPending: loading } = useSavedProviders();

  const mutation = useMutation<
    { provider_id: string; saved: boolean },
    Error,
    boolean,
    { previous: SavedProvider[] | undefined }
  >({
    mutationFn: (save) =>
      save ? patientApi.saveProvider(providerId) : patientApi.unsaveProvider(providerId),
    onMutate: async (save) => {
      if (save) return { previous: undefined };
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<SavedProvider[]>(key);
      queryClient.setQueryData<SavedProvider[]>(key, (list) =>
        list?.filter((entry) => entry.provider_id !== providerId),
      );
      return { previous };
    },
    onError: (_error, _save, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });

  const onFile = data?.some((entry) => entry.provider_id === providerId) ?? false;
  const saved = mutation.isPending ? mutation.variables : onFile;

  return {
    saved,
    /** True until the list has loaded; the heart cannot know its state before then. */
    loading,
    busy: mutation.isPending,
    toggle: () => mutation.mutateAsync(!saved),
  };
}
