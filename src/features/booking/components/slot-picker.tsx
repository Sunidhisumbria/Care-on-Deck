'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from '@/components/ui/icons';
import { formatClinicTime } from '@/lib/clinic-time';
import { SectionLoader } from '@/components/ui/spinner';

import { useProviderAvailability } from '../hooks/use-availability';
import type { Slot } from '../types';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * A provider's real openings: a month calendar, then the times on the chosen day.
 *
 * Used when booking and when rescheduling, so the two can never disagree about
 * what is free.
 *
 * Dates are handled as YYYY-MM-DD strings in the clinic's timezone, never as
 * Date objects in the reader's. A patient in Delhi picking "Thursday" for a
 * clinic in Oregon must get the clinic's Thursday, and a Date would quietly
 * shift it by a day.
 *
 * Only days the server offers can be picked. A day that is closed and a day
 * that is fully booked both come back missing, and both are equally unbookable.
 */
export function SlotPicker({
  providerId,
  fallbackTimezone,
  value,
  onChange,
  initialDate = null,
}: {
  providerId: string;
  /** Used until the server answers with the clinic's zone. */
  fallbackTimezone: string;
  value: Slot | null;
  onChange: (slot: Slot | null, timezone: string) => void;
  initialDate?: string | null;
}) {
  const [cursor, setCursor] = useState(() => {
    const start = initialDate ? new Date(`${initialDate}T12:00:00`) : new Date();
    return { year: start.getFullYear(), month: start.getMonth() };
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(initialDate);

  const monthStart = isoDate(cursor.year, cursor.month, 1);
  const monthEnd = isoDate(cursor.year, cursor.month, daysInMonth(cursor.year, cursor.month));

  const { data, isPending, isError } = useProviderAvailability(providerId, monthStart, monthEnd);
  const zone = data?.timezone ?? fallbackTimezone;

  const openDays = useMemo(() => {
    const map = new Map<string, Slot[]>();
    for (const day of data?.days ?? []) map.set(day.date, day.slots);
    return map;
  }, [data]);

  const grid = useMemo(() => monthGrid(cursor.year, cursor.month), [cursor]);
  const slots = selectedDate ? (openDays.get(selectedDate) ?? []) : [];

  return (
    <div>
      <h2 className="text-lg font-extrabold text-ink-900">Select a date</h2>
      <p className="mt-1 text-sm text-ink-500">
        Pick a date that works best for you. Times are the clinic&rsquo;s local time.
      </p>

      <div className="mt-3 rounded-card border border-line bg-white p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-ink-900">
            {new Date(cursor.year, cursor.month, 1).toLocaleString(undefined, {
              month: 'short',
              year: 'numeric',
            })}
          </p>
          <div className="flex items-center gap-1">
            <IconButton label="Previous month" onClick={() => setCursor(shift(cursor, -1))}>
              <ChevronLeft className="h-4 w-4" />
            </IconButton>
            <IconButton label="Next month" onClick={() => setCursor(shift(cursor, 1))}>
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

          {grid.map((day) => {
            const bookable = openDays.has(day.iso);
            const active = selectedDate === day.iso;

            return (
              <button
                key={day.iso}
                type="button"
                disabled={!bookable}
                aria-pressed={active}
                title={bookable ? undefined : 'No openings'}
                onClick={() => {
                  setSelectedDate(day.iso);
                  onChange(null, zone);
                }}
                className={[
                  'mx-auto my-0.5 flex h-8 w-8 items-center justify-center rounded-full text-xs transition-colors',
                  active
                    ? 'bg-brand-600 font-bold text-white'
                    : !bookable
                      ? 'cursor-not-allowed text-ink-300'
                      : day.outside
                        ? 'text-ink-400 hover:bg-brand-50'
                        : 'font-semibold text-ink-700 hover:bg-brand-50',
                ].join(' ')}
              >
                {day.day}
              </button>
            );
          })}
        </div>

        {isPending ? (
          <SectionLoader label="Loading openings…" className="mt-3" />
        ) : null}
        {isError ? (
          <p className="mt-3 text-center text-xs text-ink-500">
            Could not load this doctor&rsquo;s openings. Try another month.
          </p>
        ) : null}
        {!isPending && !isError && openDays.size === 0 ? (
          <p className="mt-3 text-center text-xs text-ink-500">
            Nothing open this month. Try the next one.
          </p>
        ) : null}
      </div>

      <h3 className="mt-6 text-lg font-extrabold text-ink-900">Select a time</h3>
      <p className="mt-1 text-sm text-ink-500">
        {selectedDate
          ? `${slots.length} times available on ${humanDate(selectedDate)}`
          : 'Pick a date first to see available times.'}
      </p>

      <div className="mt-3 rounded-card border border-line bg-white p-4">
        {slots.length === 0 ? (
          <p className="py-2 text-center text-xs text-ink-300">
            {selectedDate ? 'No times left on that day.' : 'No date selected yet.'}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {slots.map((slot) => {
              const active = value?.starts_at === slot.starts_at;
              return (
                <button
                  key={slot.starts_at}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onChange(slot, zone)}
                  className={[
                    'rounded-field border py-2.5 text-xs font-semibold transition-colors',
                    active
                      ? 'border-brand-600 bg-brand-600 text-white'
                      : 'border-brand-200 text-brand-700 hover:border-brand-400',
                  ].join(' ')}
                >
                  {formatClinicTime(slot.starts_at, zone)}
                </button>
              );
            })}
          </div>
        )}
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

function shift(cursor: { year: number; month: number }, months: number) {
  const moved = new Date(cursor.year, cursor.month + months, 1);
  return { year: moved.getFullYear(), month: moved.getMonth() };
}

function isoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** "2026-09-17" -> "Thu, Sep 17, 2026", without going through a UTC parse. */
function humanDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year!, month! - 1, day!).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Six weeks starting on the Monday on or before the first of the month. */
function monthGrid(year: number, month: number): { iso: string; day: number; outside: boolean }[] {
  const first = new Date(year, month, 1);
  // getDay() is Sunday-first; this shifts it so Monday is 0.
  const offset = (first.getDay() + 6) % 7;

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(year, month, 1 - offset + index);
    return {
      iso: isoDate(date.getFullYear(), date.getMonth(), date.getDate()),
      day: date.getDate(),
      outside: date.getMonth() !== month,
    };
  });
}
