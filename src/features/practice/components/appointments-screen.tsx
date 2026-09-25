'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';

import { Avatar } from '@/components/ui/avatar';
import { CalendarIcon, CheckIcon, ClockIcon, CrossIcon, EyeOffIcon, SearchIcon } from '@/components/ui/icons';
import { LoadingPanel } from '@/components/ui/spinner';
import { formatClinicDate, formatClinicTime } from '@/lib/clinic-time';

import { usePracticeAppointments, usePracticeReady } from '../hooks';
import type { PracticeTab } from '../types';
import { AppointmentStatusBadge } from './shared';

const TABS: { value: PracticeTab; label: string; title: string; icon: ReactNode }[] = [
  { value: 'upcoming', label: 'Upcoming', title: 'Upcoming Appointments', icon: <CalendarIcon className="h-4 w-4" /> },
  { value: 'pending', label: 'Pending', title: 'Pending Requests', icon: <ClockIcon className="h-4 w-4" /> },
  { value: 'completed', label: 'Completed', title: 'Completed Appointments', icon: <CheckIcon className="h-4 w-4" /> },
  { value: 'canceled', label: 'Canceled', title: 'Canceled Appointments', icon: <CrossIcon className="h-4 w-4" /> },
  { value: 'no_show', label: 'No-Show', title: 'No-Show Appointments', icon: <EyeOffIcon className="h-4 w-4" /> },
];

/**
 * IA: 6. Appointments. The tab lives in the URL, so a link from the dashboard
 * ("Pending Requests") opens the right one and Back returns to it.
 */
export function AppointmentsScreen() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const tab = TABS.find((entry) => entry.value === params.get('tab')) ?? TABS[0]!;

  const [term, setTerm] = useState('');
  const q = useDebounced(term.trim(), 300);
  const { noPractice } = usePracticeReady();
  const list = usePracticeAppointments(tab.value, q);
  const rows = list.data ?? [];

  function choose(next: PracticeTab) {
    router.replace(`${pathname}?tab=${next}` as Route, { scroll: false });
  }

  return (
    <div className="space-y-6">
      <label className="flex items-center gap-2.5 rounded-field border border-line bg-white px-4 py-3">
        <SearchIcon className="h-4 w-4 shrink-0 text-ink-500" />
        <input
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Search by patient name or booking ID…"
          aria-label="Search appointments"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-300"
        />
      </label>

      <div role="tablist" aria-label="Appointment status" className="flex flex-wrap gap-2">
        {TABS.map((entry) => {
          const active = entry.value === tab.value;
          return (
            <button
              key={entry.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => choose(entry.value)}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                active
                  ? 'border-brand-300 bg-brand-50 text-brand-700'
                  : 'border-line bg-white text-ink-700 hover:border-brand-200'
              }`}
            >
              {entry.icon}
              {entry.label}
            </button>
          );
        })}
      </div>

      <section>
        <h2 className="text-lg font-bold text-ink-900">
          {tab.title} {list.data ? <span className="text-brand-600">({rows.length})</span> : null}
        </h2>

        <div className="mt-3 overflow-x-auto rounded-card border border-line bg-white">
          {noPractice ? (
            <Empty>Your account is not part of a practice yet.</Empty>
          ) : !list.data ? (
            list.error ? (
              <Empty>Appointments could not be loaded. Refresh to try again.</Empty>
            ) : (
              <div className="p-5">
                <LoadingPanel label="Loading appointments…" rows={5} />
              </div>
            )
          ) : rows.length === 0 ? (
            <Empty>{q ? 'No appointments match that search.' : 'Nothing here yet.'}</Empty>
          ) : (
            <table className="w-full min-w-[56rem] text-left text-[0.8125rem]">
              <thead className="border-b border-line text-xs text-ink-500">
                <tr>
                  {['Patient name', 'Date', 'Time', 'Booking for', 'Problem', 'Status', 'Insurance information', 'Action'].map(
                    (heading) => (
                      <th key={heading} scope="col" className="px-4 py-3 font-medium">
                        {heading}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-2.5 font-semibold text-ink-900">
                        <Avatar name={row.patient.name} className="h-7 w-7 text-[0.625rem]" />
                        {row.patient.name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink-700">{formatClinicDate(row.starts_at, row.timezone, 'medium')}</td>
                    <td className="px-4 py-3 text-ink-700">{formatClinicTime(row.starts_at, row.timezone)}</td>
                    <td className="px-4 py-3 text-ink-700">{row.booking_for === 'self' ? 'Self' : 'Family member'}</td>
                    <td className="px-4 py-3 text-ink-700">{row.problem ?? '—'}</td>
                    <td className="px-4 py-3">
                      <AppointmentStatusBadge status={row.status} />
                    </td>
                    <td className="px-4 py-3 text-ink-700">{row.insurance ?? 'Self-pay'}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/provider/appointments/${row.id}` as Route}
                        className="font-semibold text-brand-600 hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="px-6 py-12 text-center text-sm text-ink-500">{children}</p>;
}

function useDebounced<T>(value: T, ms: number): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return settled;
}
