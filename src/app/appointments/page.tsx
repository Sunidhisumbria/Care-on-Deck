'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import { AccountHero } from '@/features/patient/components/account-hero';
import { useUpcomingAppointments } from '@/features/patient/hooks';
import type { UpcomingAppointment } from '@/features/patient/types';
import { CalendarIcon, CheckIcon, ChevronRight, CrossIcon, SearchIcon } from '@/components/ui/icons';
import { Avatar } from '@/components/ui/avatar';
import { StatusBadge } from '@/components/ui/status-badge';
import { appointmentStatusLabel, appointmentStatusTone } from '@/features/patient/lib/appointment-status';

type Tab = 'upcoming' | 'completed' | 'canceled';

/**
 * IA: 3. Patient Dashboard > Appointments.
 *
 * Only the Upcoming tab has data. `GET /patients/appointments` returns future,
 * non-cancelled visits by design -- it feeds the dashboard, which asks "what
 * is coming up". Completed and Canceled need that endpoint to take a filter,
 * so they say so rather than showing an empty list that looks like a bug.
 */
export default function AppointmentsPage() {
  const { data, isPending, error } = useUpcomingAppointments();
  const [tab, setTab] = useState<Tab>('upcoming');
  const [query, setQuery] = useState('');

  const visible = useMemo(() => {
    if (tab !== 'upcoming') return [];
    const term = query.trim().toLowerCase();
    if (!term) return data ?? [];

    return (data ?? []).filter((appointment) =>
      [appointment.provider?.name, appointment.facility?.name, appointment.reference]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(term)),
    );
  }, [data, tab, query]);

  return (
    <>
      <AccountHero
        title="Appointments"
        subtitle="View and manage all your past and upcoming appointments.."
      />

      <div className="mx-auto max-w-5xl px-5 py-8 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-card border border-line bg-white p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white">
              <CalendarIcon className="h-[1.125rem] w-[1.125rem]" />
            </span>
            <div>
              <p className="text-sm font-bold text-ink-900">Need to book a new appointment?</p>
              <p className="mt-0.5 text-xs text-ink-500">
                Find the right doctor and time that worked for you.
              </p>
            </div>
          </div>
          <Link
            href="/book"
            className="flex items-center gap-1.5 rounded-field bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          >
            Book New appointment
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div role="tablist" aria-label="Appointment status" className="flex flex-wrap gap-2">
            <Tabs current={tab} onChange={setTab} />
          </div>

          <label className="flex w-full items-center gap-2 rounded-full border border-line bg-white px-4 py-2 sm:w-auto sm:min-w-[280px]">
            <span className="text-ink-300">
              <SearchIcon className="h-4 w-4" />
            </span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by color, clinic or booking iD..."
              aria-label="Search appointments"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-300"
            />
          </label>
        </div>

        <h2 className="mt-6 text-base font-bold text-ink-900">
          {LABELS[tab]} Appointments{' '}
          <span className="font-extrabold text-brand-600">({visible.length})</span>
        </h2>

        <div className="mt-3 space-y-3">
          {tab !== 'upcoming' ? (
            <NotYetAvailable tab={tab} />
          ) : isPending ? (
            <div aria-hidden="true" className="h-28 animate-pulse rounded-card bg-white" />
          ) : error ? (
            <p className="rounded-card border border-line bg-white p-6 text-sm text-ink-500">
              Your appointments could not be loaded. Refresh to try again.
            </p>
          ) : visible.length === 0 ? (
            <NothingHere hasQuery={query.trim().length > 0} />
          ) : (
            visible.map((appointment) => (
              <AppointmentRow key={appointment.id} appointment={appointment} />
            ))
          )}
        </div>
      </div>
    </>
  );
}

const LABELS: Record<Tab, string> = {
  upcoming: 'Upcoming',
  completed: 'Completed',
  canceled: 'Canceled',
};

function Tabs({ current, onChange }: { current: Tab; onChange: (tab: Tab) => void }) {
  const tabs: { id: Tab; icon: React.ReactNode }[] = [
    { id: 'upcoming', icon: <CalendarIcon className="h-3.5 w-3.5" /> },
    { id: 'completed', icon: <CheckIcon className="h-3.5 w-3.5" /> },
    { id: 'canceled', icon: <CrossIcon className="h-3.5 w-3.5" /> },
  ];

  return (
    <>
      {tabs.map((tab) => {
        const active = tab.id === current;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-2 rounded-full border px-5 py-2 text-sm font-semibold transition-colors ${
              active
                ? 'border-brand-300 bg-brand-50 text-brand-700'
                : 'border-line bg-white text-ink-700 hover:border-brand-200'
            }`}
          >
            {tab.icon}
            {LABELS[tab.id]}
          </button>
        );
      })}
    </>
  );
}

function AppointmentRow({ appointment }: { appointment: UpcomingAppointment }) {
  const when = new Date(appointment.starts_at);

  return (
    <article className="flex flex-wrap items-center gap-4 rounded-card border border-line bg-white p-4">
      <div className="flex h-[68px] w-[62px] shrink-0 flex-col items-center justify-center rounded-field bg-brand-50 text-brand-700">
        <span className="text-[0.625rem] font-bold uppercase tracking-wide">
          {when.toLocaleString(undefined, { month: 'short' })}
        </span>
        <span className="text-xl font-extrabold leading-tight text-ink-900">{when.getDate()}</span>
        <span className="text-[0.5625rem] uppercase tracking-wide">
          {when.toLocaleString(undefined, { weekday: 'short' })}
        </span>
      </div>

      <Avatar name={appointment.provider?.name ?? 'Provider'} className="h-12 w-12 text-sm" />

      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-brand-600">
          {when.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
        </p>
        <p className="mt-0.5 truncate text-sm font-bold text-ink-900">
          {appointment.provider?.name ?? 'Provider to be assigned'}
        </p>
        {appointment.provider?.specialty ? (
          <p className="mt-0.5 text-xs text-ink-500">{appointment.provider.specialty}</p>
        ) : null}
        {appointment.facility ? (
          <p className="mt-1 truncate text-xs text-ink-500">
            {appointment.facility.name}
            {appointment.facility.address ? ` · ${appointment.facility.address}` : ''}
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
        <StatusBadge tone={appointmentStatusTone(appointment.status)}>
          {appointmentStatusLabel(appointment.status)}
        </StatusBadge>
        <p className="text-xs text-ink-500">
          Booking ID: <span className="font-semibold text-ink-700">#{appointment.reference}</span>
        </p>
      </div>

      <button
        type="button"
        className="flex shrink-0 items-center gap-1.5 rounded-field border border-brand-200 px-4 py-2 text-sm font-semibold text-brand-600 transition-colors hover:border-brand-400"
      >
        View Details
        <ChevronRight className="h-4 w-4" />
      </button>
    </article>
  );
}

function NotYetAvailable({ tab }: { tab: Tab }) {
  return (
    <div className="rounded-card border border-dashed border-line bg-white p-8 text-center">
      <p className="text-sm font-semibold text-ink-900">{LABELS[tab]} visits are not available yet</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-ink-500">
        The appointments endpoint returns upcoming visits only. Filtering by status is the next
        piece of work on it.
      </p>
    </div>
  );
}

function NothingHere({ hasQuery }: { hasQuery: boolean }) {
  return (
    <div className="rounded-card border border-dashed border-line bg-white p-8 text-center">
      <p className="text-sm font-semibold text-ink-900">
        {hasQuery ? 'Nothing matches that search' : 'No appointments booked yet'}
      </p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-ink-500">
        {hasQuery
          ? 'Try a doctor, a practice, or a booking ID.'
          : 'When you book a visit it will appear here.'}
      </p>
      {hasQuery ? null : (
        <Link
          href="/book"
          className="mt-4 inline-flex items-center gap-1.5 rounded-field bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
        >
          Book New appointment
          <ChevronRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}
