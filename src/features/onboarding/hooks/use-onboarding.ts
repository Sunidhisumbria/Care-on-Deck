'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { toApiError } from '@/lib/http/errors';
import { onboardingKeys } from '@/lib/query/keys';

import { onboardingApi } from '../api/onboarding.api';
import type { OnboardingSession, ProviderStep } from '../types';

/**
 * The signed-in provider's application, started on first visit if missing.
 *
 * Sign-up creates the application, so the start call here is for provider
 * accounts that predate that -- it should rarely run. Starting from inside a
 * read would normally be a smell, since a refetch could create twice; it is
 * safe only because the server's start is idempotent and hands back the
 * existing application.
 */
export function useOnboardingSession() {
  return useQuery({
    queryKey: onboardingKeys.current(),
    queryFn: async (): Promise<OnboardingSession> => {
      const { session } = await onboardingApi.current();
      return session ?? onboardingApi.start();
    },
  });
}

/**
 * Saves one step. The response is the whole updated application -- including
 * anything the server cleared because an earlier answer changed -- so it
 * replaces the cached copy outright rather than being merged into it.
 */
export function useSaveStep(sessionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ step, data }: { step: ProviderStep; data: Record<string, unknown> }) =>
      onboardingApi.saveStep(sessionId, step, data),
    onSuccess: (session) => {
      queryClient.setQueryData(onboardingKeys.current(), session);
    },
  });
}

/**
 * Submits the application. The returned application is `submitted`, and
 * putting it in the cache is what moves the screen to "under review" -- there
 * is no separate navigation to get wrong.
 */
export function useSubmitApplication(sessionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    /*
     * A dropped connection does not mean the submit failed: the server may
     * have finished after the browser gave up. So before reporting an error,
     * look at the application -- if it has gone through, that is the answer.
     */
    mutationFn: async () => {
      try {
        return await onboardingApi.submit(sessionId);
      } catch (error) {
        if (toApiError(error).code !== 'NETWORK') throw error;
        const { session } = await onboardingApi.current();
        if (session && (session.status === 'submitted' || session.status === 'approved')) return session;
        throw error;
      }
    },
    onSuccess: (session) => {
      queryClient.setQueryData(onboardingKeys.current(), session);
    },
  });
}
