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
  savedProviders: () => [...patientKeys.all, 'saved-providers'] as const,
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

export const practiceKeys = {
  all: ['practice'] as const,
  summary: () => [...practiceKeys.all, 'summary'] as const,
  profile: () => [...practiceKeys.all, 'profile'] as const,
  weeklySchedule: () => [...practiceKeys.all, 'weekly-schedule'] as const,
  actionItems: () => [...practiceKeys.all, 'action-items'] as const,
  appointments: () => [...practiceKeys.all, 'appointments'] as const,
  appointmentList: (tab: string, q: string) => [...practiceKeys.all, 'appointments', 'list', tab, q] as const,
  appointment: (id: string) => [...practiceKeys.all, 'appointments', id] as const,
  calendar: (from: string, to: string) => [...practiceKeys.all, 'calendar', from, to] as const,
};

export const pulseKeys = {
  all: ['pulse'] as const,
  overview: () => [...pulseKeys.all, 'overview'] as const,
  campaigns: () => [...pulseKeys.all, 'campaigns'] as const,
  campaign: (id: string) => [...pulseKeys.all, 'campaigns', id] as const,
  agencies: () => [...pulseKeys.all, 'agencies'] as const,
  agency: (id: string) => [...pulseKeys.all, 'agencies', id] as const,
};

export const notificationKeys = {
  all: ['notifications'] as const,
  list: () => [...notificationKeys.all, 'list'] as const,
};
