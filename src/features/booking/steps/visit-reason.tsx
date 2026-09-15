'use client';

import { useState } from 'react';

import { ChevronRight } from '@/components/ui/icons';
import { OptionCards } from '@/components/ui/option-cards';

import { useBooking } from '../booking-state';
import { ProviderSummary } from '../components/provider-summary';
import { ReasonIcon } from '../components/reason-icon';
import { PLACEHOLDER_VISIT_REASONS } from '../placeholder-data';

/**
 * Step two: what the visit is for.
 *
 * The list is the shared `OptionCards`, which provider onboarding also uses for
 * its role choice -- the designs draw the two identically.
 */
export function VisitReasonStep() {
  const { draft, set, next } = useBooking();
  const [selected, setSelected] = useState<string>(
    draft.reason?.id ?? PLACEHOLDER_VISIT_REASONS[0]!.id,
  );

  if (!draft.provider) return null;

  function onContinue() {
    set('reason', PLACEHOLDER_VISIT_REASONS.find((reason) => reason.id === selected) ?? null);
    next();
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 lg:px-8">
      <h2 className="text-xl font-extrabold text-ink-900">What are you coming in for?</h2>
      <p className="mt-1 text-sm text-ink-500">Tell us the reason for your visit</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <ProviderSummary provider={draft.provider} />

        <div>
          <OptionCards
            name="visit-reason"
            label="Reason for visit"
            value={selected}
            onChange={setSelected}
            options={PLACEHOLDER_VISIT_REASONS.map((reason) => ({
              value: reason.id,
              title: reason.title,
              caption: reason.caption,
              icon: <ReasonIcon name={reason.icon} />,
            }))}
          />

          <button
            type="button"
            onClick={onContinue}
            className="mt-5 flex w-full items-center justify-center gap-1.5 rounded-field bg-brand-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          >
            Continue
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
