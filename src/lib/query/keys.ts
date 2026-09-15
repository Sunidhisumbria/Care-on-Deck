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
