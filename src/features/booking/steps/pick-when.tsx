'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from '@/components/ui/icons';

import { useBooking } from '../booking-state';
import { ProviderSummary } from '../components/provider-summary';
import { PLACEHOLDER_SLOTS } from '../placeholder-data';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * Step three: when.
 *
 * The calendar is built from real dates rather than a fixed grid of numbers,
 * so month lengths, leap years and the Monday-first offset are handled by the
 * Date object instead of by hand. Past days are disabled -- offering a slot
 * that cannot be booked is the kind of thing that only shows up in testing on
 * the first of the month.
 */
export function PickWhenStep() {
  const { draft, set, next } = useBooking();
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState<Date | null>(draft.date ? new Date(draft.date) : null);
  const [time, setTime] = useState<string | null>(draft.time);

  const days = useMemo(() => monthGrid(cursor), [cursor]);
  const today = startOfDay(new Date());

  if (!draft.provider) return null;

  function onContinue() {
    if (!selected || !time) return;
    set('date', selected.toISOString());
    set('time', time);
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
          <h2 className="text-lg font-extrabold text-ink-900">Select a date</h2>
          <p className="mt-1 text-sm text-ink-500">Pick a date that works best for you.</p>

          <div className="mt-3 rounded-card border border-line bg-white p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-ink-900">
                {cursor.toLocaleString(undefined, { month: 'short', year: 'numeric' })}
              </p>
              <div className="flex items-center gap-1">
                <IconButton label="Previous month" onClick={() => setCursor(addMonths(cursor, -1))}>
                  <ChevronLeft className="h-4 w-4" />
                </IconButton>
                <IconButton label="Next month" onClick={() => setCursor(addMonths(cursor, 1))}>
                  <ChevronRight className="h-4 w-4" />
                </IconButton>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-7 gap-y-1 text-center text-[0.6875rem] text-ink-500">
              {WEEKDAYS.map((day) => (
                <span key={day} className="py-1 font-semibold">
                  {day}
                </span>
              ))}

              {days.map((day) => {
                const outside = day.getMonth() !== cursor.getMonth();
                const past = day < today;
                const active = selected !== null && isSameDay(day, selected);

                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    disabled={past}
                    aria-pressed={active}
                    onClick={() => setSelected(day)}
                    className={[
                      'mx-auto my-0.5 flex h-8 w-8 items-center justify-center rounded-full text-xs transition-colors',
                      active
                        ? 'bg-brand-600 font-bold text-white'
                        : past
                          ? 'cursor-not-allowed text-ink-300'
                          : outside
                            ? 'text-ink-300 hover:bg-brand-50'
                            : 'text-ink-700 hover:bg-brand-50',
                    ].join(' ')}
                  >
                    {day.getDate()}
                  </button>
                );
              })}
            </div>
          </div>

          <h3 className="mt-6 text-lg font-extrabold text-ink-900">Select a time</h3>
          <p className="mt-1 text-sm text-ink-500">
            {selected
              ? `Available times for ${selected.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}`
              : 'Pick a date first to see available times.'}
          </p>

          <div className="mt-3 rounded-card border border-line bg-white p-4">
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {PLACEHOLDER_SLOTS.map((slot) => {
                const active = slot === time;
                return (
                  <button
                    key={slot}
                    type="button"
                    disabled={!selected}
                    aria-pressed={active}
                    onClick={() => setTime(slot)}
                    className={[
                      'rounded-field border py-2.5 text-xs font-semibold transition-colors',
                      active
                        ? 'border-brand-600 bg-brand-600 text-white'
                        : 'border-brand-200 text-brand-700 hover:border-brand-400',
                      selected ? '' : 'cursor-not-allowed opacity-50',
                    ].join(' ')}
                  >
                    {slot}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={onContinue}
            disabled={!selected || !time}
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

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="rounded-full p-1.5 text-ink-500 transition-colors hover:bg-brand-50 hover:text-brand-600"
    >
      {children}
    </button>
  );
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  );
}

/** Six weeks starting on the Monday on or before the first of the month. */
function monthGrid(month: Date): Date[] {
  const first = startOfMonth(month);
  // getDay() is Sunday-first; this shifts it so Monday is 0.
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(first.getFullYear(), first.getMonth(), 1 - offset);

  return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
}
