'use client';

import { ScheduleForm } from '@/features/practice/forms/schedule-form';
import { defaultSchedule, type ScheduleValues } from '@/lib/schedule';
import { pushSamePage } from '@/lib/same-page-navigation';

import { useSaveStep } from '../hooks';
import type { OnboardingSession } from '../types';

/**
 * IA: 4. Provider Onboarding > Schedule Setup.
 *
 * Starts from Monday to Friday, nine to five, half-hour appointments. Unlike
 * the role choice, a default is right here: every day and time is on screen to
 * adjust, and a blank week of fourteen empty time fields is a chore with no
 * benefit.
 *
 * Breaks apply to every day the provider is available. Per-day breaks belong to
 * the scheduling screens after approval, where hours are edited week to week.
 */
export function ScheduleStep({ session }: { session: OnboardingSession }) {
  const save = useSaveStep(session.id);
  const saved = session.draft.schedule_setup as ScheduleValues | undefined;

  return (
    <>
      <h1 className="text-xl font-extrabold text-ink-900">Set Your Availability</h1>
      <p className="mt-1 text-sm text-ink-500">Configure your working hours and appointment duration.</p>

      <div className="mt-6">
        <ScheduleForm
          defaultValues={saved ?? defaultSchedule()}
          submitLabel="Continue"
          onSubmit={async (values) => {
            await save.mutateAsync({ step: 'schedule_setup', data: values });
            pushSamePage('/onboarding');
          }}
        />
      </div>
    </>
  );
}
