'use client';

import { useState } from 'react';
import { ChevronRight } from '@/components/ui/icons';

import { useBooking } from '../booking-state';
import { ProviderSummary } from '../components/provider-summary';
import { SlotPicker } from '../components/slot-picker';
import type { ChosenSlot } from '../types';

/**
 * Step three: when. The calendar and times are `SlotPicker`, shared with
 * rescheduling so both read the same openings.
 */
export function PickWhenStep() {
  const { draft, set, next } = useBooking();
  const [chosen, setChosen] = useState<ChosenSlot | null>(draft.slot);

  if (!draft.provider) return null;

  function onContinue() {
    if (!chosen) return;
    set('slot', chosen);
    next();
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 lg:px-8">
      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <ProviderSummary
          provider={draft.provider}
          reason={draft.reason}
          onEditReason={() => history.back()}
        />

        <div>
          <SlotPicker
            providerId={draft.provider.id}
            fallbackTimezone={draft.provider.facility.timezone}
            value={chosen}
            onChange={(slot, timezone) => setChosen(slot ? { ...slot, timezone } : null)}
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
        </div>
      </div>
    </div>
  );
}
