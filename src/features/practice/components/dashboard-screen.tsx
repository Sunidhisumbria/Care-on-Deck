'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';

import { AlertClockIcon, ArrowRight, CalendarIcon, ProgressIcon, UserIcon } from '@/components/ui/icons';
import { LoadingPanel } from '@/components/ui/spinner';
import { formatClinicDate, formatClinicTime } from '@/lib/clinic-time';
import { toApiError } from '@/lib/http/errors';

import { useActionItems, useConfirmAppointment, useDashboardSummary, usePracticeReady } from '../hooks';
import type { ActionItem, DashboardSummary } from '../types';
import { CancelDialog } from './appointment-dialogs';
import { AppointmentStatusBadge, timeAgo } from './shared';

/**
 * IA: 6. Unified Dashboard > Dashboard Home.
 *
 * Today at the clinic, in the clinic's own zone, and the requests waiting on
 * the practice. Revenue is shown as not tracked: payments are not recorded
 * yet, and a made-up figure on a doctor's home screen is worse than a dash.
 */
export function DashboardScreen() {
  const { noPractice } = usePracticeReady();
  const summary = useDashboardSummary();

  if (noPractice) return <NoPractice />;
  if (!summary.data) {
    return summary.error ? (
      <Problem>Your dashboard could not be loaded. Refresh to try again.</Problem>
    ) : (
      <LoadingPanel label="Loading your dashboard…" rows={6} />
    );
  }

  return <Dashboard summary={summary.data} />;
}

function Dashboard({ summary }: { summary: DashboardSummary }) {
  const zone = summary.facility?.timezone ?? 'UTC';
  const hour = Number(new Intl.DateTimeFormat('en-US', { timeZone: zone, hour: 'numeric', hour12: false }).format(new Date()));
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const today = formatClinicDate(`${summary.today}T12:00:00Z`, 'UTC', 'long');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">
          {greeting}
          {summary.greeting_name ? `, ${summary.greeting_name}` : ''} <span aria-hidden="true">👋</span>
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          {today}
          {summary.facility ? ` · ${summary.facility.name}` : ''}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          icon={<CalendarIcon className="h-4 w-4" />}
          tint="bg-brand-50 text-brand-600"
          value={summary.today_appointments.total}
          label="Today's Appointments"
          caption={`${summary.today_appointments.upcoming} upcoming`}
          href="/provider/appointments"
        />
        <Stat
          icon={<UserIcon className="h-4 w-4" />}
          tint="bg-emerald-50 text-emerald-600"
          value={summary.patients_today}
          label="Patients"
          caption="Seen or booked today"
        />
        <Stat
          icon={<ProgressIcon className="h-4 w-4" />}
          tint="bg-indigo-50 text-indigo-600"
          value={
            summary.revenue_this_month_cents === null
              ? '—'
              : `$${(summary.revenue_this_month_cents / 100).toLocaleString('en-US')}`
          }
          label="Revenue"
          caption={summary.revenue_this_month_cents === null ? 'Payments are not tracked yet' : 'Earned this month'}
        />
        <Stat
          icon={<AlertClockIcon className="h-4 w-4" />}
          tint="bg-amber-50 text-amber-600"
          value={summary.pending_requests}
          label="Pending Requests"
          caption="Awaiting your review"
          href="/provider/appointments?tab=pending"
        />
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section className="overflow-hidden rounded-card border border-line bg-white">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="text-base font-bold text-ink-900">Today&rsquo;s Appointments</h2>
            <Link
              href="/provider/appointments"
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline"
            >
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {summary.schedule.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-ink-500">Nothing booked for today.</p>
          ) : (
            <ul className="divide-y divide-line">
              {summary.schedule.map((row) => (
                <li key={row.id}>
                  <Link
                    href={`/provider/appointments/${row.id}` as Route}
                    className="grid grid-cols-[5.5rem_minmax(0,1fr)_auto_auto] items-center gap-4 px-5 py-3.5 transition-colors hover:bg-brand-50/40"
                  >
                    <span className="text-sm font-semibold text-brand-600">{formatClinicTime(row.starts_at, zone)}</span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-ink-900">{row.patient_name}</span>
                      <span className="block truncate text-xs text-ink-500">{row.problem ?? 'Visit'}</span>
                    </span>
                    <AppointmentStatusBadge status={row.status} />
                    <ArrowRight className="h-4 w-4 text-ink-500" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <ActionRequired />
      </div>
    </div>
  );
}

function Stat({
  icon,
  tint,
  value,
  label,
  caption,
  href,
}: {
  icon: ReactNode;
  tint: string;
  value: ReactNode;
  label: string;
  caption: string;
  href?: Route;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between">
        <span className={`flex h-9 w-9 items-center justify-center rounded-field ${tint}`}>{icon}</span>
        {href ? <ArrowRight className="h-4 w-4 -rotate-45 text-ink-500" /> : null}
      </div>
      <p className="mt-4 text-3xl font-extrabold text-ink-900">{value}</p>
      <p className="mt-1 text-sm font-semibold text-ink-900">{label}</p>
      <p className="text-xs text-ink-500">{caption}</p>
    </>
  );
  const box = 'block rounded-card border border-line bg-white p-5';

  return href ? (
    <Link href={href} className={`${box} transition-colors hover:border-brand-200`}>
      {body}
    </Link>
  ) : (
    <div className={box}>{body}</div>
  );
}

const KIND: Record<ActionItem['kind'], { badge: string; tone: string }> = {
  new_request: { badge: 'New Request', tone: 'bg-brand-50 text-brand-700' },
  reschedule: { badge: 'Reschedule', tone: 'bg-amber-50 text-amber-700' },
  no_show: { badge: 'No-Show', tone: 'bg-red-50 text-red-700' },
};

function ActionRequired() {
  const items = useActionItems();
  const list = items.data ?? [];

  return (
    <section>
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-ink-900">Action Required</h2>
        {list.length > 0 ? (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1.5 text-[0.6875rem] font-bold text-white">
            {list.length}
          </span>
        ) : null}
      </div>

      <div className="mt-3 space-y-3">
        {items.isPending ? <LoadingPanel label="Loading…" rows={3} /> : null}
        {!items.isPending && list.length === 0 ? (
          <p className="rounded-card border border-dashed border-line bg-white px-5 py-8 text-center text-sm text-ink-500">
            You&rsquo;re all caught up.
          </p>
        ) : null}
        {list.map((item) => (
          <ActionCard key={`${item.kind}-${item.appointment_id}`} item={item} />
        ))}
      </div>
    </section>
  );
}

function ActionCard({ item }: { item: ActionItem }) {
  const confirm = useConfirmAppointment();
  const [cancelling, setCancelling] = useState(false);
  const kind = KIND[item.kind];
  const when = `${formatClinicDate(item.starts_at, item.timezone, 'medium')} at ${formatClinicTime(item.starts_at, item.timezone)}`;

  const text =
    item.kind === 'new_request'
      ? `Requested an appointment for ${when}`
      : item.kind === 'reschedule'
        ? `Requested to move their visit to ${when}`
        : `Missed the ${formatClinicTime(item.starts_at, item.timezone)} appointment`;

  function onConfirm() {
    confirm.mutate(item.appointment_id, {
      onSuccess: () => toast.success(`Confirmed ${item.patient_name}'s appointment.`),
      onError: (error) => toast.error(toApiError(error).message),
    });
  }

  const view = (
    <Link
      href={`/provider/appointments/${item.appointment_id}` as Route}
      className="flex-1 rounded-field border border-line bg-white py-2 text-center text-xs font-semibold text-ink-700 transition-colors hover:border-brand-300"
    >
      View
    </Link>
  );

  return (
    <article className="rounded-card border border-line bg-white p-4">
      <div className="flex items-center justify-between">
        <span className={`rounded-full px-2.5 py-1 text-[0.6875rem] font-bold ${kind.tone}`}>{kind.badge}</span>
        <span className="text-xs text-ink-500">{timeAgo(item.occurred_at)}</span>
      </div>
      <p className="mt-2 text-sm font-bold text-ink-900">{item.patient_name}</p>
      <p className="mt-0.5 text-xs text-ink-500">{text}</p>

      <div className="mt-3 flex gap-2">
        {item.kind !== 'no_show' ? (
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirm.isPending}
            className="flex-1 rounded-field bg-brand-600 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
          >
            Confirm
          </button>
        ) : null}
        {item.kind === 'new_request' ? (
          <button
            type="button"
            onClick={() => setCancelling(true)}
            className="flex-1 rounded-field border border-line bg-white py-2 text-xs font-semibold text-ink-700 transition-colors hover:border-brand-300"
          >
            Cancel
          </button>
        ) : null}
        {view}
      </div>

      {cancelling ? (
        <CancelDialog
          appointmentId={item.appointment_id}
          subtitle={`${item.patient_name} · ${when}`}
          onClose={() => setCancelling(false)}
        />
      ) : null}
    </article>
  );
}

function NoPractice() {
  return (
    <Problem>
      Your account is not part of a practice yet. Once your application is approved, your dashboard appears here.
    </Problem>
  );
}

function Problem({ children }: { children: ReactNode }) {
  return <p className="rounded-card border border-line bg-white px-6 py-10 text-center text-sm text-ink-500">{children}</p>;
}
