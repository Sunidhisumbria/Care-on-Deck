'use client';

import { DateTime } from 'luxon';
import type { Route } from 'next';
import Link from 'next/link';
import { useEffect, useMemo, useState, type ReactNode } from 'react';

import { ChevronLeft, ChevronRight } from '@/components/ui/icons';
import { LoadingPanel } from '@/components/ui/spinner';

import { usePracticeCalendar, usePracticeReady } from '../hooks';
import type { BookingHold, PracticeCalendar } from '../types';
import { HoldDialog, lastDay, ResumeDialog } from './booking-hold-dialogs';
import { AppointmentStatusBadge } from './shared';

type View = 'day' | 'week';
type CalendarAppointment = PracticeCalendar['appointments'][number];

/** Used before the clinic's own hours are known, and when none are set. */
const DEFAULT_HOURS = { start: 8 * 60, end: 17 * 60 };

/**
 * IA: 7. Calendar & Schedule.
 *
 * Everything is drawn in the clinic's zone, never the browser's: the dates in
 * the header, which appointments fall on which day, and where each one sits.
 * Until the first answer says what that zone is, the browser's today stands
 * in; the calendar then moves to the clinic's today unless the user has
 * already navigated.
 */
export function CalendarScreen() {
  const { noPractice } = usePracticeReady();
  const [view, setView] = useState<View>('day');
  const [anchor, setAnchor] = useState(() => DateTime.local().toISODate()!);
  const [navigated, setNavigated] = useState(false);
  const [dialog, setDialog] = useState<'hold' | 'resume' | null>(null);

  const range = useMemo(() => rangeFor(view, anchor), [view, anchor]);
  const calendar = usePracticeCalendar(range.from, range.to);
  const data = calendar.data;
  const zone = data?.timezone ?? DateTime.local().zoneName!;
  const clinicToday = DateTime.now().setZone(zone).toISODate()!;

  useEffect(() => {
    if (data && !navigated && anchor !== clinicToday) setAnchor(clinicToday);
  }, [data, navigated, anchor, clinicToday]);

  function move(step: -1 | 1) {
    setNavigated(true);
    setAnchor(DateTime.fromISO(anchor).plus(view === 'day' ? { days: step } : { weeks: step }).toISODate()!);
  }

  function goToday() {
    setNavigated(true);
    setAnchor(clinicToday);
  }

  const holds = data?.holds ?? [];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-ink-900">Schedule</h2>
        <p className="mt-1 text-sm text-ink-500">Manage your availability, appointments, and working hours.</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Calendar view" className="inline-flex rounded-field border border-line bg-white p-1">
          {(['day', 'week'] as const).map((option) => (
            <button
              key={option}
              type="button"
              role="tab"
              aria-selected={view === option}
              onClick={() => setView(option)}
              className={`rounded-[0.5rem] px-4 py-1.5 text-sm font-semibold capitalize transition-colors ${
                view === option ? 'bg-brand-50 text-brand-700' : 'text-ink-700 hover:text-brand-600'
              }`}
            >
              {option}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setDialog('hold')}
          disabled={!data}
          className="inline-flex items-center gap-2 rounded-field bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-60"
        >
          <BanIcon className="h-5 w-5" />
          Pause / Hold Bookings
        </button>
      </div>

      {holds.length > 0 ? <PausedBanner holds={holds} zone={zone} onResume={() => setDialog('resume')} /> : null}

      <section className="overflow-hidden rounded-card border border-line bg-white">
        <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <NavButton label={view === 'day' ? 'Previous day' : 'Previous week'} onClick={() => move(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </NavButton>
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center">
            <button
              type="button"
              onClick={goToday}
              className="rounded-[0.375rem] border border-brand-600 px-2.5 py-0.5 text-xs font-semibold text-brand-600 transition-colors hover:bg-brand-50"
            >
              Today
            </button>
            <p className="text-sm font-bold text-ink-900 sm:text-base">{title(view, range, anchor)}</p>
            <p className="text-xs font-semibold text-brand-600">{data?.slot_minutes ?? 30} min slots</p>
          </div>
          <NavButton label={view === 'day' ? 'Next day' : 'Next week'} onClick={() => move(1)}>
            <ChevronRight className="h-4 w-4" />
          </NavButton>
        </header>

        {noPractice ? (
          <p className="px-6 py-12 text-center text-sm text-ink-500">Your account is not part of a practice yet.</p>
        ) : !data ? (
          calendar.error ? (
            <p className="px-6 py-12 text-center text-sm text-ink-500">The calendar could not be loaded. Refresh to try again.</p>
          ) : (
            <div className="p-5">
              <LoadingPanel label="Loading calendar…" rows={6} />
            </div>
          )
        ) : view === 'day' ? (
          <DayView calendar={data} date={anchor} />
        ) : (
          <WeekView calendar={data} range={range} today={clinicToday} />
        )}
      </section>

      {dialog === 'hold' && data ? <HoldDialog timezone={zone} onClose={() => setDialog(null)} /> : null}
      {dialog === 'resume' ? <ResumeDialog holds={holds} onClose={() => setDialog(null)} /> : null}
    </div>
  );
}

// --- day ---------------------------------------------------------------------

function DayView({ calendar, date }: { calendar: PracticeCalendar; date: string }) {
  const zone = calendar.timezone;
  const slot = Math.max(5, calendar.slot_minutes);
  const onDay = calendar.appointments.filter((appointment) => clinicDate(appointment.starts_at, zone) === date);

  // Working hours, widened to fit anything booked outside them.
  let start = calendar.hours ? toMinutes(calendar.hours.start) : DEFAULT_HOURS.start;
  let end = calendar.hours ? toMinutes(calendar.hours.end) : DEFAULT_HOURS.end;
  for (const appointment of onDay) {
    start = Math.min(start, minuteOfDay(appointment.starts_at, zone));
    end = Math.max(end, minuteOfDay(appointment.starts_at, zone) + 1);
  }
  start = Math.floor(start / slot) * slot;
  end = Math.ceil(end / slot) * slot;

  const rows: number[] = [];
  for (let minute = start; minute < end; minute += slot) rows.push(minute);

  const byRow = new Map<number, CalendarAppointment[]>();
  for (const appointment of onDay) {
    const row = Math.floor(minuteOfDay(appointment.starts_at, zone) / slot) * slot;
    byRow.set(row, [...(byRow.get(row) ?? []), appointment]);
  }

  return (
    <ol>
      {rows.map((minute) => {
        const here = byRow.get(minute) ?? [];
        return (
          <li key={minute} className="flex min-h-[3.25rem] gap-4 border-b border-line px-4 py-2 last:border-0">
            <span className="w-16 shrink-0 pt-1 text-xs text-ink-500">
              {clock(minute)}
              <span className="ml-0.5 text-[0.625rem] text-ink-300">{minute < 720 ? 'AM' : 'PM'}</span>
            </span>
            <div className="min-w-0 flex-1 space-y-2">
              {here.map((appointment) => (
                <Link
                  key={appointment.id}
                  href={`/provider/appointments/${appointment.id}` as Route}
                  className="block rounded-r-field border-l-[3px] border-brand-600 bg-[#faf4f6] px-4 py-2.5 transition-colors hover:bg-brand-50"
                >
                  <p className="truncate text-sm font-bold text-brand-700">{appointment.patient_name}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-500">
                    <span className="truncate">{appointment.problem ?? 'Visit'}</span>
                    <AppointmentStatusBadge status={appointment.status} />
                  </p>
                </Link>
              ))}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

// --- week --------------------------------------------------------------------

function WeekView({ calendar, range, today }: { calendar: PracticeCalendar; range: Range; today: string }) {
  const zone = calendar.timezone;
  const monday = DateTime.fromISO(range.from);
  const all = Array.from({ length: 7 }, (_, index) => monday.plus({ days: index }));
  const busy = new Set(calendar.appointments.map((appointment) => clinicDate(appointment.starts_at, zone)));

  // Monday to Friday always; a weekend day only when it is worked or booked.
  const days = all.filter((day) => {
    if (day.weekday <= 5) return true;
    return calendar.working_days.includes(day.weekday % 7) || busy.has(day.toISODate()!);
  });

  let start = calendar.hours ? toMinutes(calendar.hours.start) : DEFAULT_HOURS.start;
  let end = calendar.hours ? toMinutes(calendar.hours.end) : DEFAULT_HOURS.end;
  for (const appointment of calendar.appointments) {
    start = Math.min(start, minuteOfDay(appointment.starts_at, zone));
    end = Math.max(end, minuteOfDay(appointment.starts_at, zone) + 1);
  }
  const hours: number[] = [];
  for (let hour = Math.floor(start / 60); hour < Math.ceil(end / 60); hour += 1) hours.push(hour);

  const cell = new Map<string, CalendarAppointment[]>();
  for (const appointment of calendar.appointments) {
    const key = `${clinicDate(appointment.starts_at, zone)}|${Math.floor(minuteOfDay(appointment.starts_at, zone) / 60)}`;
    cell.set(key, [...(cell.get(key) ?? []), appointment]);
  }

  const columns = `4.5rem repeat(${days.length}, minmax(8.5rem, 1fr))`;

  return (
    <div className="overflow-x-auto">
      <div className="min-w-max" style={{ display: 'grid', gridTemplateColumns: columns }}>
        <div className="border-b border-line bg-canvas" />
        {days.map((day) => {
          const isToday = day.toISODate() === today;
          return (
            <div
              key={day.toISODate()}
              className={`border-b border-l border-line bg-canvas px-3 py-3 text-center text-sm font-semibold ${
                isToday ? 'text-brand-600' : 'text-ink-900'
              }`}
            >
              {day.toFormat('ccc LLL d')}
            </div>
          );
        })}

        {hours.map((hour) => (
          <HourRow key={hour} hour={hour} days={days} cell={cell} />
        ))}
      </div>
    </div>
  );
}

function HourRow({ hour, days, cell }: { hour: number; days: DateTime[]; cell: Map<string, CalendarAppointment[]> }) {
  return (
    <>
      <div className="border-b border-line px-3 py-3 text-xs text-ink-500">{hourLabel(hour)}</div>
      {days.map((day) => {
        const here = cell.get(`${day.toISODate()}|${hour}`) ?? [];
        return (
          <div key={day.toISODate()} className="min-h-[3.25rem] space-y-1 border-b border-l border-line p-1.5">
            {here.map((appointment) => (
              <Link
                key={appointment.id}
                href={`/provider/appointments/${appointment.id}` as Route}
                title={`${appointment.patient_name} · ${appointment.problem ?? 'Visit'}`}
                className="block truncate rounded-r-[0.375rem] border-l-[3px] border-brand-600 bg-brand-50 px-2 py-2 text-xs text-brand-700 transition-colors hover:bg-brand-100"
              >
                <span className="font-semibold">{appointment.patient_name}</span>
                <span className="px-1 text-brand-400">&bull;</span>
                {appointment.problem ?? 'Visit'}
              </Link>
            ))}
          </div>
        );
      })}
    </>
  );
}

// --- pieces ------------------------------------------------------------------

function PausedBanner({ holds, zone, onResume }: { holds: BookingHold[]; zone: string; onResume: () => void }) {
  const now = Date.now();
  const current = holds.filter((hold) => Date.parse(hold.starts_at) <= now);
  const pausedNow = current.length > 0;
  // The furthest end among the holds shown is when bookings reopen.
  const latest = holds.reduce((a, b) => (Date.parse(b.ends_at) > Date.parse(a.ends_at) ? b : a));
  const first = holds[0]!;

  const detail = pausedNow
    ? `Through ${lastDay(latest, zone)}`
    : `From ${DateTime.fromISO(first.starts_at).setZone(zone).toFormat('ccc, LLL d')} through ${lastDay(latest, zone)}`;

  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-between gap-3 rounded-field border border-red-300 bg-red-50 px-4 py-3"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-500 text-white">
          <BanIcon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm font-semibold text-red-600">{pausedNow ? 'Bookings Paused' : 'Bookings Pause Scheduled'}</p>
          <p className="text-xs text-red-500/90">{detail}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onResume}
        className="rounded-field bg-red-500 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-600"
      >
        Resume Bookings
      </button>
    </div>
  );
}

function NavButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[0.375rem] border border-line text-ink-700 transition-colors hover:border-brand-300 hover:text-brand-600"
    >
      {children}
    </button>
  );
}

function BanIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden="true">
      <circle cx="10" cy="10" r="7.25" />
      <path d="m4.9 15.1 10.2-10.2" strokeLinecap="round" />
    </svg>
  );
}

// --- dates -------------------------------------------------------------------

interface Range {
  from: string;
  to: string;
}

/** A day is itself; a week runs Monday to Sunday. */
function rangeFor(view: View, anchor: string): Range {
  if (view === 'day') return { from: anchor, to: anchor };
  const day = DateTime.fromISO(anchor);
  return { from: day.startOf('week').toISODate()!, to: day.endOf('week').toISODate()! };
}

function title(view: View, range: Range, anchor: string): string {
  if (view === 'day') return DateTime.fromISO(anchor).toFormat('cccc, LLLL d, yyyy');
  const from = DateTime.fromISO(range.from);
  const to = DateTime.fromISO(range.to);
  return from.year === to.year
    ? `${from.toFormat('LLL d')} – ${to.toFormat('LLL d, yyyy')}`
    : `${from.toFormat('LLL d, yyyy')} – ${to.toFormat('LLL d, yyyy')}`;
}

function clinicDate(iso: string, zone: string): string {
  return DateTime.fromISO(iso).setZone(zone).toISODate()!;
}

function minuteOfDay(iso: string, zone: string): number {
  const at = DateTime.fromISO(iso).setZone(zone);
  return at.hour * 60 + at.minute;
}

function toMinutes(hhmm: string): number {
  const [hours = 0, minutes = 0] = hhmm.split(':').map(Number);
  return hours * 60 + minutes;
}

/** 540 -> "9:00", 810 -> "1:30". The AM/PM is drawn beside it. */
function clock(minute: number): string {
  const hours = Math.floor(minute / 60) % 24;
  return `${hours % 12 === 0 ? 12 : hours % 12}:${String(minute % 60).padStart(2, '0')}`;
}

/** 9 -> "9 AM", 12 -> "12 PM". */
function hourLabel(hour: number): string {
  const suffix = hour % 24 < 12 ? 'AM' : 'PM';
  return `${hour % 12 === 0 ? 12 : hour % 12} ${suffix}`;
}
