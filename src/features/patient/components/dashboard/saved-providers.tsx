'use client';

import Link from 'next/link';
import { Avatar } from '@/components/ui/avatar';
import { ArrowRight, HeartIcon, PinIcon, StarIcon, StethoscopeIcon } from '@/components/ui/icons';

import { PLACEHOLDER_SAVED_PROVIDERS, type SavedProvider } from './placeholder-data';
import { SectionHeading } from './section-heading';

/**
 * Saved Providers.
 *
 * Rendered from constants -- see placeholder-data.ts. There is no favourites
 * table and no endpoint, so the hearts are deliberately inert: a filled heart
 * that does nothing when clicked is honest, one that appears to save and
 * forgets on reload is not.
 */
export function SavedProviders() {
  return (
    <section>
      <SectionHeading
        icon={<HeartIcon className="h-[1.125rem] w-[1.125rem]" />}
        title="Saved Providers"
        caption="Your trusted Care Providers"
      />

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {PLACEHOLDER_SAVED_PROVIDERS.map((provider) => (
          <ProviderCard key={provider.id} provider={provider} />
        ))}
        <FindMore />
      </div>
    </section>
  );
}

function ProviderCard({ provider }: { provider: SavedProvider }) {
  return (
    <article className="flex flex-col rounded-card border border-line bg-white p-4">
      <div className="flex items-start gap-3">
        <Avatar name={provider.name} className="h-11 w-11 text-sm" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-sm font-bold text-ink-900">{provider.name}</p>
            <span className="shrink-0 text-brand-600" aria-hidden="true">
              <HeartIcon className="h-4 w-4" filled />
            </span>
          </div>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-500">
            <StethoscopeIcon className="h-3.5 w-3.5" />
            {provider.specialty}
          </p>
          <p className="mt-1 flex items-center gap-1 text-xs text-ink-500">
            <StarIcon className="h-3.5 w-3.5 text-amber-400" />
            <span className="font-semibold text-ink-700">{provider.ratingAverage.toFixed(2)}</span>
            ({provider.ratingCount} reviews)
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-start gap-2 border-t border-line pt-3 text-xs text-ink-500">
        <PinIcon className="mt-px h-3.5 w-3.5 shrink-0 text-brand-600" />
        <span className="min-w-0">
          <span className="block font-semibold text-ink-700">{provider.facility}</span>
          <span className="block">{provider.address}</span>
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

function FindMore() {
  return (
    <article className="flex flex-col items-center justify-center rounded-card bg-gradient-to-br from-brand-500 to-brand-700 p-6 text-center text-white">
      <h3 className="text-lg font-extrabold leading-tight">Find More Provider</h3>
      <p className="mt-2 text-xs text-white/85">
        Discover and save trusted providers to build your care team.
      </p>
      <Link
        href="/"
        className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-50"
      >
        Find Care
        <ArrowRight className="h-4 w-4" />
      </Link>
    </article>
  );
}
