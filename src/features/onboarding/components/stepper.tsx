'use client';

import { CheckIcon } from '@/components/ui/icons';

import { STEPPER, stepperState, type StepperKey } from '../steps';

/**
 * Onboarding progress.
 *
 * Completed items are buttons, so an applicant can go back and correct an
 * answer; upcoming ones are not, because the server refuses a step whose
 * earlier steps are unfinished and a clickable dead end is worse than none.
 *
 * Seven labels do not fit a phone, so below `sm` it collapses to one line --
 * "Step 2 of 7 · NPI" -- rather than shrinking to text nobody can read.
 */
export function Stepper({
  completed,
  current,
  onSelect,
}: {
  completed: readonly string[];
  current: string;
  onSelect: (key: StepperKey) => void;
}) {
  const items = STEPPER.map((item, index) => ({
    ...item,
    number: index + 1,
    state: stepperState(item, completed, current),
  }));
  const active = items.find((item) => item.state === 'current');

  return (
    <nav aria-label="Onboarding progress">
      <p className="text-center text-xs font-semibold text-ink-500 sm:hidden">
        {active ? (
          <>
            Step {active.number} of {items.length} &middot;{' '}
            <span className="text-ink-900">{active.label}</span>
          </>
        ) : (
          'All steps complete'
        )}
      </p>

      <ol className="hidden items-start sm:flex">
        {items.map((item, index) => {
          const done = item.state === 'complete';
          const isCurrent = item.state === 'current';
          const last = index === items.length - 1;
          const number = String(item.number).padStart(2, '0');

          const circle = done ? (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-white">
              <CheckIcon className="h-3.5 w-3.5" />
            </span>
          ) : (
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full border text-[0.6875rem] font-bold ${
                isCurrent
                  ? 'border-brand-400 bg-brand-100 text-brand-700'
                  : 'border-line bg-white text-ink-500'
              }`}
            >
              {number}
            </span>
          );

          return (
            <li
              key={item.key}
              aria-current={isCurrent ? 'step' : undefined}
              className="relative flex flex-1 flex-col items-center"
            >
              {last ? null : (
                <span
                  aria-hidden="true"
                  className={`absolute left-1/2 top-3.5 h-px w-full ${done ? 'bg-brand-600' : 'bg-line'}`}
                />
              )}

              {done ? (
                <button
                  type="button"
                  onClick={() => onSelect(item.key)}
                  aria-label={`${item.label}, completed. Review or change`}
                  className="relative z-10 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  {circle}
                </button>
              ) : (
                <span className="relative z-10">{circle}</span>
              )}

              <span
                className={`mt-2 px-1 text-center text-[0.6875rem] font-semibold ${
                  isCurrent ? 'text-ink-900' : done ? 'text-ink-700' : 'text-ink-500'
                }`}
              >
                {item.label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
