'use client';

import { SavedProviderGrid } from '@/features/patient/components/dashboard/saved-providers';
import { AccountHero } from '@/features/patient/components/account-hero';
import { useSavedProviders } from '@/features/patient/hooks';

/**
 * IA: 3. Patient Dashboard > Saved Providers.
 *
 * Every provider the patient has hearted, most recent first. Unsaving one here
 * removes its card straight away.
 */
export default function SavedProvidersPage() {
  const { data, isPending, isError } = useSavedProviders();

  return (
    <>
      <AccountHero title="Saved Providers" subtitle="Your trusted care providers." />

      <div className="mx-auto max-w-7xl px-5 py-8 lg:px-8 lg:py-10">
        {isError ? (
          <div className="rounded-card border border-line bg-white p-8 text-center">
            <p className="text-sm font-semibold text-ink-900">Your saved providers could not be loaded.</p>
            <p className="mt-1 text-sm text-ink-500">Refresh the page to try again.</p>
          </div>
        ) : (
          <SavedProviderGrid providers={data ?? []} loading={isPending} />
        )}
      </div>
    </>
  );
}
