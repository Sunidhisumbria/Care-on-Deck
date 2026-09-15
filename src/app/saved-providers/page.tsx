'use client';

import { AccountHero } from '@/features/patient/components/account-hero';

/**
 * IA: 3. Patient Dashboard > Saved Providers.
 *
 * A placeholder so the header link resolves. There is no favourites model yet
 * -- no table, no endpoint -- so this says so rather than rendering invented
 * providers as if they were saved.
 */
export default function SavedProvidersPage() {
  return (
    <>
      <AccountHero title="Saved Providers" subtitle="Your trusted care providers." />

      <div className="mx-auto max-w-3xl px-5 py-10 lg:py-12">
        <div className="rounded-card border border-line bg-white p-8 text-center">
          <p className="text-sm font-semibold text-ink-900">This screen is being built.</p>
          <p className="mt-2 text-sm text-ink-500">
            Saving a provider needs somewhere to save it. That model has not been designed yet.
          </p>
        </div>
      </div>
    </>
  );
}
