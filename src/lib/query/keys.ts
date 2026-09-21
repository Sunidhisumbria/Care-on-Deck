/**
 * Every query key in one place.
 *
 * Keys are built here rather than inline so a cache invalidation cannot miss a
 * query by spelling its key differently -- the compiler catches a typo in
 * `authKeys.currentUser()`, it cannot catch one in `['auth', 'me']`.
 */
export const authKeys = {
  all: ['auth'] as const,
  currentUser: () => [...authKeys.all, 'me'] as const,
  organizations: () => [...authKeys.all, 'organizations'] as const,
};

export const patientKeys = {
  all: ['patient'] as const,
  profile: () => [...patientKeys.all, 'profile'] as const,
  dependents: () => [...patientKeys.all, 'dependents'] as const,
  appointments: () => [...patientKeys.all, 'appointments'] as const,
  appointment: (id: string) => [...patientKeys.all, 'appointments', id] as const,
  /** One tab of the list. Under `appointments()`, so a change refreshes every tab. */
  appointmentList: (status: string) => [...patientKeys.all, 'appointments', 'list', status] as const,
  insurance: () => [...patientKeys.all, 'insurance'] as const,
  insuranceDetail: (id: string) => [...patientKeys.all, 'insurance', id] as const,
};

export const onboardingKeys = {
  all: ['onboarding'] as const,
  current: () => [...onboardingKeys.all, 'current'] as const,
};

export const insuranceKeys = {
  all: ['insurance'] as const,
  carriers: () => [...insuranceKeys.all, 'carriers'] as const,
};

export const uploadKeys = {
  all: ['uploads'] as const,
  view: (id: string) => [...uploadKeys.all, 'view', id] as const,
};

export const marketplaceKeys = {
  all: ['marketplace'] as const,
  /** Filters are part of the key: a different rail is a different result set. */
  providerSearch: (filters: unknown) =>
    [...marketplaceKeys.all, 'providers', filters] as const,
  availability: (providerId: string, from: string, to: string) =>
    [...marketplaceKeys.all, 'availability', providerId, from, to] as const,
  visitReasons: (providerId: string) =>
    [...marketplaceKeys.all, 'visit-reasons', providerId] as const,
};
