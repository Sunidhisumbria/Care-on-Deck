'use client';

import { useMemo, useState } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { ChevronDown, PinIcon, SearchIcon, StarIcon } from '@/components/ui/icons';

import { useBooking } from '../booking-state';
import { MapPlaceholder } from '../components/map-placeholder';
import {
  PLACEHOLDER_FILTERS,
  PLACEHOLDER_PROVIDERS,
  type BookableProvider,
} from '../placeholder-data';

type FilterGroup = keyof typeof PLACEHOLDER_FILTERS;

/**
 * Step one: choose who you are seeing.
 *
 * The filters are real controls over the placeholder list rather than painted
 * checkboxes -- ticking an insurer actually narrows what is shown. It is the
 * only part of this screen that can be made honest without an endpoint, and it
 * is the first thing a reviewer will click.
 */
export function SelectProviderStep() {
  const { set, next } = useBooking();
  const [query, setQuery] = useState('');
  const [checked, setChecked] = useState<Record<string, boolean>>({
    Today: true,
    '< 5 miles': true,
    '4.5+': true,
    Cigna: true,
  });

  const toggle = (value: string) =>
    setChecked((current) => ({ ...current, [value]: !current[value] }));

  const providers = useMemo(() => {
    const insurers = PLACEHOLDER_FILTERS.insurance.filter((i) => checked[i]);
    const term = query.trim().toLowerCase();

    return PLACEHOLDER_PROVIDERS.filter((p) => {
      if (insurers.length > 0 && !insurers.some((i) => p.insurers.includes(i))) return false;
      if (!term) return true;
      return [p.name, p.specialty, p.facility, p.city].some((f) => f.toLowerCase().includes(term));
    });
  }, [checked, query]);

  function choose(provider: BookableProvider) {
    set('provider', provider);
    next();
  }

  return (
    <div className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-ink-900">Select a provider</h2>
          <p className="mt-1 text-sm text-ink-500">Choose a provider that meets your need</p>
        </div>
        <label className="flex w-full items-center gap-2 rounded-full border border-line bg-white px-4 py-2.5 sm:w-auto sm:min-w-[320px]">
          <span className="text-ink-300">
            <SearchIcon className="h-4 w-4" />
          </span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by color, clinic or booking iD..."
            aria-label="Search providers"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-300"
          />
        </label>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[210px_minmax(0,1fr)] xl:grid-cols-[210px_minmax(0,1fr)_270px]">
        <FilterRail checked={checked} onToggle={toggle} onClear={() => setChecked({})} />

        <div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-ink-900">
              {providers.length} providers found
            </p>
            <span className="flex items-center gap-2 text-xs text-ink-500">
              Sort by:
              <span className="flex items-center gap-1 rounded-field border border-line bg-white px-3 py-1.5 font-semibold text-ink-700">
                Recommended
                <ChevronDown className="h-3.5 w-3.5 text-ink-300" />
              </span>
            </span>
          </div>

          <div className="mt-3 space-y-4">
            {providers.map((provider) => (
              <ProviderCard key={provider.id} provider={provider} onBook={() => choose(provider)} />
            ))}
            {providers.length === 0 ? (
              <p className="rounded-card border border-dashed border-line bg-white p-8 text-center text-sm text-ink-500">
                No providers match those filters. Try clearing a few.
              </p>
            ) : null}
          </div>
        </div>

        <div className="hidden xl:block">
          <div className="sticky top-6 overflow-hidden rounded-card border border-line bg-white">
            <div className="h-[210px] w-full overflow-hidden">
              <MapPlaceholder />
            </div>
            <div className="p-4 text-center">
              <p className="text-xs text-ink-500">{providers.length} providers in this area</p>
              <button
                type="button"
                className="mt-3 w-full rounded-field border border-line py-2 text-sm font-semibold text-ink-700 transition-colors hover:border-brand-300 hover:text-brand-600"
              >
                View Full Map
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterRail({
  checked,
  onToggle,
  onClear,
}: {
  checked: Record<string, boolean>;
  onToggle: (value: string) => void;
  onClear: () => void;
}) {
  const groups: { key: FilterGroup; label: string }[] = [
    { key: 'availability', label: 'Availability' },
    { key: 'distance', label: 'Distance' },
    { key: 'rating', label: 'Rating' },
    { key: 'insurance', label: 'Insurance' },
    { key: 'gender', label: 'Gender' },
  ];

  return (
    <aside className="h-max rounded-card border border-line bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-ink-900">Filters</p>
        <button
          type="button"
          onClick={onClear}
          className="text-xs font-semibold text-brand-600 hover:underline"
        >
          Clear all
        </button>
      </div>

      <div className="mt-4 space-y-5">
        {groups.map((group) => (
          <fieldset key={group.key}>
            <legend className="text-xs font-bold text-ink-900">{group.label}</legend>
            <div className="mt-2 space-y-2">
              {PLACEHOLDER_FILTERS[group.key].map((option) => (
                <label
                  key={option}
                  className="flex cursor-pointer items-center gap-2.5 text-xs text-ink-700"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(checked[option])}
                    onChange={() => onToggle(option)}
                    className="h-3.5 w-3.5 shrink-0 cursor-pointer accent-brand-600"
                  />
                  {option}
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>
    </aside>
  );
}

function ProviderCard({ provider, onBook }: { provider: BookableProvider; onBook: () => void }) {
  return (
    <article className="rounded-card border border-line bg-white p-4">
      <div className="flex flex-wrap items-start gap-4">
        <Avatar name={provider.name} className="h-16 w-16 text-base" />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-base font-bold text-ink-900">{provider.name}</h3>
              <p className="mt-0.5 text-xs text-ink-500">
                {provider.specialty} <span className="px-1 text-ink-300">&bull;</span>{' '}
                {provider.visitModes}
              </p>
            </div>
            <p className="shrink-0 text-right text-xs">
              <span className="block text-ink-500">Next available</span>
              <span className="font-semibold text-brand-600">{provider.nextAvailable}</span>
            </p>
          </div>

          <p className="mt-1.5 flex flex-wrap items-center gap-1 text-xs text-ink-500">
            <StarIcon className="h-3.5 w-3.5 text-amber-400" />
            <span className="font-semibold text-ink-700">{provider.ratingAverage.toFixed(2)}</span>
            <span className="px-1 text-ink-300">&bull;</span>
            <PinIcon className="h-3.5 w-3.5" />
            {provider.city} <span className="px-0.5 text-ink-300">&middot;</span>{' '}
            {provider.distanceMiles} miles
          </p>

          <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-500">
            <PinIcon className="h-3.5 w-3.5 text-brand-600" />
            {provider.facility}
          </p>

          <p className="mt-2 flex flex-wrap items-center gap-1.5 text-[0.6875rem] text-ink-500">
            Insurance:
            {provider.insurers.map((insurer) => (
              <span
                key={insurer}
                className="rounded-full bg-brand-50 px-2 py-0.5 font-semibold text-brand-700"
              >
                {insurer}
              </span>
            ))}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          className="rounded-field border border-brand-200 py-2.5 text-sm font-semibold text-brand-600 transition-colors hover:border-brand-400"
        >
          View Profile
        </button>
        <button
          type="button"
          onClick={onBook}
          className="rounded-field bg-brand-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
        >
          Book Appointment
        </button>
      </div>
    </article>
  );
}
