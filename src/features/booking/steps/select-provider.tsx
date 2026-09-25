'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { PinIcon, SearchIcon, StethoscopeIcon } from '@/components/ui/icons';
import { SelectMenu } from '@/components/ui/select-menu';
import { useInsuranceCarriers } from '@/features/insurance/hooks';
import { SectionLoader } from '@/components/ui/spinner';
import { SaveProviderButton } from '@/features/patient/components/save-provider-button';

import { useBooking } from '../booking-state';
import { MapPlaceholder } from '../components/map-placeholder';
import { formatNextAvailable } from '../format';
import { useProviderSearch } from '../hooks/use-providers';
import type { BookableProvider, ProviderSearchFilters } from '../types';

const AVAILABILITY: { value: NonNullable<ProviderSearchFilters['availability']>; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'tomorrow', label: 'Tomorrow' },
  { value: 'week', label: 'This week' },
];

/**
 * Step one: choose who you are seeing.
 *
 * Every provider, clinic, insurer and opening on this screen comes from the
 * database. Nothing is invented: a provider with no reviews shows no rating,
 * and one whose diary is full for the month says so rather than offering a
 * time that cannot be booked.
 *
 * Filtering is done by the server. It has to be -- "free on Tuesday" is a
 * question about appointments, which the browser is never allowed to read.
 */
export function SelectProviderStep() {
  const { set, next } = useBooking();
  const [term, setTerm] = useState('');
  const [availability, setAvailability] = useState<ProviderSearchFilters['availability']>();
  const [carrierId, setCarrierId] = useState<string>();
  const [sort, setSort] = useState<NonNullable<ProviderSearchFilters['sort']>>('recommended');
  // A campaign link lands here with ?provider=: show that doctor, with a way to see everyone.
  const linked = useSearchParams().get('provider');
  const [onlyProvider, setOnlyProvider] = useState<string | undefined>(
    linked && /^[0-9a-f-]{36}$/i.test(linked) ? linked : undefined,
  );

  const query = useDebounced(term, 300);
  const filters = useMemo<ProviderSearchFilters>(
    () => ({
      q: query || undefined,
      availability,
      insurance_carrier_id: carrierId,
      provider_id: onlyProvider,
      sort,
    }),
    [query, availability, carrierId, onlyProvider, sort],
  );

  const { data, isPending, isError, error, refetch } = useProviderSearch(filters);
  const providers = data?.providers ?? [];

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
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Search by doctor, clinic, city or specialty..."
            aria-label="Search providers"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-300"
          />
        </label>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[210px_minmax(0,1fr)] xl:grid-cols-[210px_minmax(0,1fr)_270px]">
        <FilterRail
          availability={availability}
          carrierId={carrierId}
          onAvailability={setAvailability}
          onCarrier={setCarrierId}
          onClear={() => {
            setAvailability(undefined);
            setCarrierId(undefined);
          }}
        />

        <div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink-900">
              {isPending ? 'Finding providers…' : `${providers.length} providers found`}
              {onlyProvider ? (
                <button
                  type="button"
                  onClick={() => setOnlyProvider(undefined)}
                  className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-100"
                >
                  Show all providers
                </button>
              ) : null}
            </p>
            <div className="flex items-center gap-2 text-xs text-ink-500">
              <span id="sort-providers-label">Sort by:</span>
              <SelectMenu
                options={[
                  { value: 'recommended', label: 'Recommended' },
                  { value: 'soonest', label: 'Soonest available' },
                ]}
                value={sort}
                onSelect={(next) => setSort(next as typeof sort)}
                placeholder="Recommended"
                labelledBy="sort-providers-label"
                align="end"
                className="w-[11rem]"
                triggerClassName="rounded-field border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink-700"
              />
            </div>
          </div>

          <div className="mt-3 space-y-4">
            {isPending ? <CardSkeleton /> : null}

            {isError ? (
              <div className="rounded-card border border-dashed border-line bg-white p-8 text-center">
                <p className="text-sm text-ink-700">
                  {error instanceof Error ? error.message : 'Could not load providers.'}
                </p>
                <button
                  type="button"
                  onClick={() => void refetch()}
                  className="mt-3 rounded-field border border-line px-4 py-2 text-sm font-semibold text-ink-700 hover:border-brand-300 hover:text-brand-600"
                >
                  Try again
                </button>
              </div>
            ) : null}

            {providers.map((provider) => (
              <ProviderCard key={provider.id} provider={provider} onBook={() => choose(provider)} />
            ))}

            {!isPending && !isError && providers.length === 0 ? (
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
              <p className="text-xs text-ink-500">Map preview</p>
              <p className="mt-1 text-xs text-ink-300">
                Clinic locations appear here once addresses are mapped.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Waits for typing to stop before asking the server. */
function useDebounced<T>(value: T, ms: number): T {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);

  return settled;
}

/**
 * The filters that have data behind them.
 *
 * Distance, rating and gender are deliberately absent: clinic addresses have no
 * map coordinates yet, no patient has reviewed anyone, and gender is not asked
 * for at onboarding. A checkbox that silently changes nothing is worse than no
 * checkbox, so each returns when its data does.
 */
function FilterRail({
  availability,
  carrierId,
  onAvailability,
  onCarrier,
  onClear,
}: {
  availability: ProviderSearchFilters['availability'];
  carrierId: string | undefined;
  onAvailability: (value: ProviderSearchFilters['availability']) => void;
  onCarrier: (value: string | undefined) => void;
  onClear: () => void;
}) {
  const { data: carriers = [], isPending } = useInsuranceCarriers();

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
        <fieldset>
          <legend className="text-xs font-bold text-ink-900">Availability</legend>
          <div className="mt-2 space-y-2">
            {AVAILABILITY.map((option) => (
              <label
                key={option.value}
                className="flex cursor-pointer items-center gap-2.5 text-xs text-ink-700"
              >
                <input
                  type="checkbox"
                  checked={availability === option.value}
                  onChange={() =>
                    onAvailability(availability === option.value ? undefined : option.value)
                  }
                  className="h-3.5 w-3.5 shrink-0 cursor-pointer accent-brand-600"
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-xs font-bold text-ink-900">Insurance</legend>
          <div className="mt-2 max-h-52 space-y-2 overflow-y-auto pr-1">
            {isPending ? <SectionLoader label="Loading insurers…" className="justify-start" /> : null}
            {carriers.map((carrier) => (
              <label
                key={carrier.id}
                className="flex cursor-pointer items-center gap-2.5 text-xs text-ink-700"
              >
                <input
                  type="checkbox"
                  checked={carrierId === carrier.id}
                  onChange={() => onCarrier(carrierId === carrier.id ? undefined : carrier.id)}
                  className="h-3.5 w-3.5 shrink-0 cursor-pointer accent-brand-600"
                />
                {carrier.name}
              </label>
            ))}
          </div>
        </fieldset>
      </div>
    </aside>
  );
}

function ProviderCard({
  provider,
  onBook,
}: {
  provider: BookableProvider;
  onBook: () => void;
}) {
  const where = [provider.facility.city, provider.facility.state].filter(Boolean).join(', ');
  const shown = provider.insurers.slice(0, 4);
  const rest = provider.insurers.length - shown.length;

  return (
    <article className="rounded-card border border-line bg-white p-4">
      <div className="flex flex-wrap items-start gap-4">
        <Avatar name={provider.name} className="h-16 w-16 text-base" />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-base font-bold text-ink-900">{provider.name}</h3>
              <p className="mt-0.5 text-xs text-ink-500">
                {provider.specialty ?? 'General practice'}
                <span className="px-1 text-ink-300">&bull;</span>
                In-person
              </p>
            </div>
            <div className="flex shrink-0 items-start gap-2">
              <p className="text-right text-xs">
                <span className="block text-ink-500">Next available</span>
                <span className="font-semibold text-brand-600">
                  {formatNextAvailable(provider.next_available, provider.facility.timezone)}
                </span>
              </p>
              <SaveProviderButton
                providerId={provider.id}
                providerName={provider.name}
                className="-mr-1 -mt-1 h-9 w-9"
              />
            </div>
          </div>

          {where ? (
            <p className="mt-1.5 flex flex-wrap items-center gap-1 text-xs text-ink-500">
              <PinIcon className="h-3.5 w-3.5" />
              {where}
            </p>
          ) : null}

          <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-500">
            <StethoscopeIcon className="h-3.5 w-3.5 text-brand-600" />
            {provider.facility.name}
          </p>

          {shown.length > 0 ? (
            <p className="mt-2 flex flex-wrap items-center gap-1.5 text-[0.6875rem] text-ink-500">
              Insurance:
              {shown.map((insurer) => (
                <span
                  key={insurer}
                  className="rounded-full bg-brand-50 px-2 py-0.5 font-semibold text-brand-700"
                >
                  {insurer}
                </span>
              ))}
              {rest > 0 ? <span>+{rest} more</span> : null}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-4">
        <button
          type="button"
          onClick={onBook}
          disabled={provider.next_available === null}
          className="w-full rounded-field bg-brand-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-ink-200"
        >
          {provider.next_available === null ? 'No openings this month' : 'Book Appointment'}
        </button>
      </div>
    </article>
  );
}

function CardSkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      {[0, 1, 2].map((row) => (
        <div key={row} className="animate-pulse rounded-card border border-line bg-white p-4">
          <div className="flex gap-4">
            <div className="h-16 w-16 shrink-0 rounded-full bg-ink-100" />
            <div className="flex-1 space-y-2 py-1">
              <div className="h-4 w-48 rounded bg-ink-100" />
              <div className="h-3 w-32 rounded bg-ink-100" />
              <div className="h-3 w-40 rounded bg-ink-100" />
            </div>
          </div>
          <div className="mt-4 h-10 rounded-field bg-ink-100" />
        </div>
      ))}
    </div>
  );
}
