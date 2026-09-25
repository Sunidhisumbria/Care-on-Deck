'use client';

import Link from 'next/link';
import { Avatar } from '@/components/ui/avatar';
import { ArrowRight, PinIcon, StarIcon, StarOutlineIcon, StethoscopeIcon } from '@/components/ui/icons';
import { SectionLoader } from '@/components/ui/spinner';

import { useSavedProviders } from '../../hooks';
import type { SavedProvider } from '../../types';
import { SaveProviderButton } from '../save-provider-button';
import { SectionHeading } from './section-heading';

/** How many the dashboard shows before "View all" takes over. */
const DASHBOARD_LIMIT = 3;

/** The dashboard's Saved Providers section: the most recent few, then Find More. */
export function SavedProviders() {
  const { data, isPending } = useSavedProviders();
  const saved = data ?? [];

  return (
    <section>
      <div className="flex items-end justify-between gap-4">
        <SectionHeading
          icon={<StarOutlineIcon className="h-[1.125rem] w-[1.125rem]" />}
          title="Saved Providers"
          caption="Your trusted Care Providers"
        />
        {saved.length > DASHBOARD_LIMIT ? (
          <Link href="/saved-providers" className="text-sm font-semibold text-brand-600 hover:underline">
            View all
          </Link>
        ) : null}
      </div>

      <SavedProviderGrid
        providers={saved.slice(0, DASHBOARD_LIMIT)}
        loading={isPending}
        className="mt-4"
      />
    </section>
  );
}

/**
 * Saved provider cards followed by the Find More card. Shared by the dashboard
 * and the Saved Providers screen so the two cannot drift.
 */
export function SavedProviderGrid({
  providers,
  loading,
  className = '',
}: {
  providers: SavedProvider[];
  loading: boolean;
  className?: string;
}) {
  if (loading) {
    return (
      <div className={`rounded-card border border-line bg-white p-8 ${className}`}>
        <SectionLoader label="Loading saved providers…" />
      </div>
    );
  }

  return (
    <div className={`grid gap-4 md:grid-cols-2 xl:grid-cols-4 ${className}`}>
      {providers.map((provider) => (
        <ProviderCard key={provider.provider_id} provider={provider} />
      ))}
      {providers.length === 0 ? <EmptyCard /> : null}
      <FindMore />
    </div>
  );
}

function ProviderCard({ provider }: { provider: SavedProvider }) {
  const { facility } = provider;
  const address = [facility.address_line1, facility.city, [facility.state, facility.postal_code].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(', ');

  return (
    <article className="flex flex-col rounded-card border border-line bg-white p-4">
      <div className="flex items-start gap-3">
        <Avatar name={provider.name} className="h-11 w-11 text-sm" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-sm font-bold text-ink-900">{provider.name}</p>
            <SaveProviderButton
              providerId={provider.provider_id}
              providerName={provider.name}
              className="-mr-1.5 -mt-1.5 h-7 w-7"
              iconClassName="h-4 w-4"
            />
          </div>
          {provider.specialty ? (
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-500">
              <StethoscopeIcon className="h-3.5 w-3.5" />
              {provider.specialty}
            </p>
          ) : null}
          {provider.rating ? (
            <p className="mt-1 flex items-center gap-1 text-xs text-ink-500">
              <StarIcon className="h-3.5 w-3.5 text-amber-400" />
              <span className="font-semibold text-ink-700">{provider.rating.average.toFixed(2)}</span>
              ({provider.rating.count} reviews)
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-3 flex items-start gap-2 border-t border-line pt-3 text-xs text-ink-500">
        <PinIcon className="mt-px h-3.5 w-3.5 shrink-0 text-brand-600" />
        <span className="min-w-0">
          <span className="block font-semibold text-ink-700">{facility.name}</span>
          {address ? <span className="block">{address}</span> : null}
        </span>
      </div>

      <Link
        href="/"
        className="mt-4 rounded-field border border-brand-200 py-2 text-center text-sm font-semibold text-brand-600 transition-colors hover:border-brand-400"
      >
        View Profile
      </Link>
    </article>
  );
}

function EmptyCard() {
  return (
    <article className="flex flex-col items-center justify-center rounded-card border border-dashed border-line bg-white p-6 text-center md:col-span-1 xl:col-span-3">
      <p className="text-sm font-semibold text-ink-900">No saved providers yet</p>
      <p className="mt-1 max-w-sm text-xs text-ink-500">
        Tap the heart on any provider while you book, and they will be kept here for next time.
      </p>
    </article>
  );
}

function FindMore() {
  return (
    <article className="flex flex-col items-center justify-center rounded-card bg-gradient-to-br from-brand-500 to-brand-700 p-6 text-center text-white">
      <h3 className="text-lg font-extrabold leading-tight">Find More Provider</h3>
      <p className="mt-2 text-xs text-white/85">
        Discover and save trusted providers to build your care team.
      </p>
      <Link
        href="/book"
        className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-50"
      >
        Find Care
        <ArrowRight className="h-4 w-4" />
      </Link>
    </article>
  );
}
