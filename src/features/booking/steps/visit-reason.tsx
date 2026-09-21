'use client';

import { useState } from 'react';

import { ChevronRight } from '@/components/ui/icons';
import { OptionCards } from '@/components/ui/option-cards';

import { useBooking } from '../booking-state';
import { ProviderSummary } from '../components/provider-summary';
import { ReasonIcon } from '../components/reason-icon';
import { useVisitReasons } from '../hooks/use-booking';

/**
 * Step two: what the visit is for.
 *
 * The reasons belong to the practice being booked, not to CareOndeck -- each
 * one is a row that practice can rename, retire or set its own length for. So
 * the list is fetched for the chosen provider rather than hard-coded, and the
 * appointment records which of their reasons was picked.
 *
 * The list is the shared `OptionCards`, which provider onboarding also uses for
 * its role choice -- the designs draw the two identically.
 */
export function VisitReasonStep() {
  const { draft, set, next } = useBooking();
  const { data: reasons = [], isPending, isError } = useVisitReasons(draft.provider?.id ?? null);
  const [selected, setSelected] = useState<string | null>(draft.reason?.id ?? null);

  if (!draft.provider) return null;

  const chosen = selected ?? reasons[0]?.id ?? null;

  function onContinue() {
    set('reason', reasons.find((reason) => reason.id === chosen) ?? null);
    next();
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 lg:px-8">
      <h2 className="text-xl font-extrabold text-ink-900">What are you coming in for?</h2>
      <p className="mt-1 text-sm text-ink-500">Tell us the reason for your visit</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <ProviderSummary provider={draft.provider} />

        <div>
          {isPending ? (
            <div className="space-y-3" aria-hidden>
              {[0, 1, 2, 3].map((row) => (
                <div key={row} className="h-16 animate-pulse rounded-card bg-ink-100" />
              ))}
            </div>
          ) : null}

          {isError ? (
            <p className="rounded-card border border-dashed border-line bg-white p-6 text-center text-sm text-ink-500">
              Could not load the reasons this practice offers. Go back and try again.
            </p>
          ) : null}

          {!isPending && !isError && reasons.length === 0 ? (
            <p className="rounded-card border border-dashed border-line bg-white p-6 text-center text-sm text-ink-500">
              This practice has not listed any visit reasons yet.
            </p>
          ) : null}

          {reasons.length > 0 ? (
            <>
              <OptionCards
                name="visit-reason"
                label="Reason for visit"
                iconFrame={false}
                value={chosen}
                onChange={setSelected}
                options={reasons.map((reason) => ({
                  value: reason.id,
                  title: reason.name,
                  caption: reason.description ?? `${reason.duration_minutes} minutes`,
                  icon: <ReasonIcon reason={reason.name} />,
                }))}
              />

              <button
                type="button"
                onClick={onContinue}
                disabled={!chosen}
                className="mt-5 flex w-full items-center justify-center gap-1.5 rounded-field bg-brand-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Continue
                <ChevronRight className="h-4 w-4" />
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
