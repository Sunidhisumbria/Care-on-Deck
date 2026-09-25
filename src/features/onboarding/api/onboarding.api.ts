import { apiGet, apiPatch, apiPost, http } from '@/lib/http/client';

import type { OnboardingSession, ProviderStep } from '../types';

/** The onboarding endpoints, and nothing else. Owner-scoped server-side. */
export const onboardingApi = {
  /** The signed-in provider's application, or null if they have none. */
  current: () => apiGet<{ session: OnboardingSession | null }>('/onboarding/sessions'),

  /** Idempotent: returns the existing application when there is one. */
  start: () => apiPost<OnboardingSession>('/onboarding/sessions', { kind: 'provider' }),

  saveStep: (id: string, step: ProviderStep, data: Record<string, unknown>) =>
    apiPatch<OnboardingSession>(`/onboarding/sessions/${encodeURIComponent(id)}`, { step, data }),

  /**
   * `attested` is the applicant's own statement that the application is accurate.
   * Given longer than the usual 20 seconds: submitting builds the whole practice
   * in one transaction, which is slow when the database is far away.
   */
  submit: async (id: string) => {
    const response = await http.post<{ data: OnboardingSession }>(
      `/onboarding/sessions/${encodeURIComponent(id)}/submit`,
      { attested: true },
      { timeout: 90_000 },
    );
    return response.data.data;
  },
};
