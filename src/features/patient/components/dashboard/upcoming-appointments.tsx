'use client';

import Link from 'next/link';
import { Avatar } from '@/components/ui/avatar';
import { ArrowRight, ChevronRight, ClockIcon, PinIcon, StarIcon, StethoscopeIcon } from '@/components/ui/icons';
import { StatusBadge } from '@/components/ui/status-badge';
import { appointmentStatusLabel, appointmentStatusTone } from '@/features/patient/lib/appointment-status';
import { formatClinicTime } from '@/lib/clinic-time';
import { LoadingPanel } from '@/components/ui/spinner';

import { useUpcomingAppointments } from '../../hooks';
import type { UpcomingAppointment } from '../../types';



/**
 * The one section on this screen reading real data.
 *
 * Empty is the common case for a new account, so it is a designed state rather
 * than an afterthought: a patient with nothing booked is exactly the person
 * who should be offered a way to book.
 */
export function UpcomingAppointments() {
  const { data, isPending, error } = useUpcomingAppointments();

  return (
    <section>
      <div className="flex items-end justify-between gap-4">
        <h2 className="text-lg font-bold text-ink-900 sm:text-xl">Upcoming Appointments</h2>
        {data && data.length > 0 ? (
          <Link
            href="/appointments"
            className="flex shrink-0 items-center gap-1.5 text-sm font-semibold text-brand-600 hover:underline"
          >
            View All Appointments
            <ArrowRight className="h-4 w-4" />
          </Link>
        ) : null}
      </div>

      <div className="mt-4">
        {isPending ? <CardSkeletons /> : null}
        {error ? (
          <p className="rounded-card border border-line bg-white p-6 text-sm text-ink-500">
            Your appointments could not be loaded. Refresh to try again.
          </p>
        ) : null}
        {data && data.length === 0 ? <NothingBooked /> : null}
        {data && data.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.slice(0, 3).map((appointment) => (
              <AppointmentCard key={appointment.id} appointment={appointment} />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function AppointmentCard({ appointment }: { appointment: UpcomingAppointment }) {
  const { provider, facility } = appointment;

  return (
    <article className="flex flex-col rounded-card border border-line bg-white p-4 shadow-[0_1px_2px_rgba(28,17,25,.04)]">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-1.5 text-sm font-bold text-brand-600">
          <ClockIcon className="h-4 w-4" />
          {formatClinicTime(appointment.starts_at, facility?.timezone ?? 'UTC')}
        </p>
        <StatusBadge tone={appointmentStatusTone(appointment.status)}>
          {appointmentStatusLabel(appointment.status)}
        </StatusBadge>
      </div>

      <div className="mt-3 flex items-start gap-3">
        <Avatar name={provider?.name ?? 'Provider'} className="h-11 w-11 text-sm" />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-ink-900">
            {provider?.name ?? 'Provider to be assigned'}
          </p>
          {provider?.specialty ? (
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-500">
              <StethoscopeIcon className="h-3.5 w-3.5" />
              {provider.specialty}
            </p>
          ) : null}
          <p className="mt-1 text-xs text-ink-500">
            Booking ID: <span className="font-semibold text-ink-700">#{appointment.reference}</span>
          </p>
          {provider && provider.rating_average !== null ? (
            <p className="mt-1 flex items-center gap-1 text-xs text-ink-500">
              <StarIcon className="h-3.5 w-3.5 text-amber-400" />
              <span className="font-semibold text-ink-700">
                {provider.rating_average.toFixed(2)}
              </span>
              ({provider.rating_count} reviews)
            </p>
          ) : null}
        </div>
      </div>

      {facility ? (
        <div className="mt-3 flex items-start gap-2 border-t border-line pt-3 text-xs text-ink-500">
          <PinIcon className="mt-px h-3.5 w-3.5 shrink-0 text-brand-600" />
          <span className="min-w-0">
            <span className="block font-semibold text-ink-700">{facility.name}</span>
            {facility.address ? <span className="block">{facility.address}</span> : null}
          </span>
        </div>
      ) : null}

      <Link
        href={`/appointments/${appointment.id}`}
        className="mt-4 flex items-center justify-center gap-1.5 rounded-field bg-brand-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
      >
        View Details
        <ChevronRight className="h-4 w-4" />
      </Link>
    </article>
  );
}

function NothingBooked() {
  return (
    <div className="rounded-card border border-dashed border-line bg-white p-8 text-center">
      <p className="text-sm font-semibold text-ink-900">No appointments booked yet</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-ink-500">
        When you book a visit it will appear here, with the time, the practice and how to get there.
      </p>
      <Link
        href="/book"
        className="mt-4 inline-flex items-center gap-1.5 rounded-field bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
      >
        Book an appointment
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

function CardSkeletons() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <LoadingPanel label="Loading your appointments…" rows={5} />
    </div>
  );
}


