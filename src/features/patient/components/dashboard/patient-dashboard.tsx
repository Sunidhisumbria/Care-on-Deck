'use client';

import { useCurrentUser } from '@/features/auth/hooks';

import { CareProgress } from './care-progress';
import { SavedProviders } from './saved-providers';
import { UpcomingAppointments } from './upcoming-appointments';
import { WelcomeHero } from './welcome-hero';

/**
 * IA: 3. Patient Dashboard -- the signed-in home screen.
 *
 * Only Upcoming Appointments reads real data. Care Progress and Saved
 * Providers render from placeholder-data.ts, which is the single file holding
 * everything on this screen that is not yet backed by the database.
 */
export function PatientDashboard() {
  const { user, isLoading } = useCurrentUser();

  return (
    <div className="mx-auto max-w-7xl space-y-10 px-5 py-6 lg:px-8 lg:py-8">
      {isLoading || !user ? (
        <div aria-hidden="true" className="h-64 animate-pulse rounded-card bg-brand-50" />
      ) : (
        <WelcomeHero firstName={displayName(user)} />
      )}

      <UpcomingAppointments />
      <CareProgress />
      <SavedProviders />
    </div>
  );
}

/** First name if we have one; never a blank greeting. */
function displayName(user: { first_name: string | null; email: string | null }): string {
  if (user.first_name) return user.first_name;
  if (user.email) return user.email.split('@')[0] ?? 'there';
  return 'there';
}
