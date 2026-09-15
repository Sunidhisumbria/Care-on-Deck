import type { UserType } from '../types';

/**
 * Where someone lands once signed in -- decided by what the account is, which
 * the server returns, and never by which tab they signed in from.
 *
 * Providers go to onboarding, and that screen decides between "your next step"
 * and "under review", because only it loads the application.
 *
 * Staff and internal users have no screens of their own yet. `/home` is a
 * holding answer until the unified dashboard and Control Center exist; there
 * are no internal users in the database today.
 */
export function destinationFor(userType: UserType | undefined): '/onboarding' | '/home' {
  return userType === 'provider' ? '/onboarding' : '/home';
}
