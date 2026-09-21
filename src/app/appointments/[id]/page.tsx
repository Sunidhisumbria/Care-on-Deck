'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { toast } from 'sonner';

import { Avatar } from '@/components/ui/avatar';
import { ChevronLeft, PinIcon, StarIcon, StethoscopeIcon } from '@/components/ui/icons';
import { StatusBadge } from '@/components/ui/status-badge';
import { AccountHero } from '@/features/patient/components/account-hero';
import { useAppointmentDetail, useCancelAppointment } from '@/features/patient/hooks';
import { appointmentStatusLabel, appointmentStatusTone } from '@/features/patient/lib/appointment-status';
import type { AppointmentDetail } from '@/features/patient/types';
import { clinicDateParts, clinicZoneName, formatClinicDate, formatClinicTime } from '@/lib/clinic-time';
import { Busy, LoadingPanel } from '@/components/ui/spinner';

/**
 * IA: 3. Appointments > View Details.
 *
 * Laid out from the Figma "Appointment Details" frame: a summary card, then the
 * booking, the problem, insurance and the patient's own details, with
 * Direction, Reschedule and Cancel underneath.
 *
 * Every time is the clinic's and labelled with its zone -- this is the screen
 * someone checks on the morning of the visit. Rating is left out until a
 * patient has reviewed the provider; the design's "4.95 · 73 reviews" is a
 * placeholder, and inventing one for a real doctor is not.
 */
export default function AppointmentDetailPage() {
  const params = useParams<{ id: string }>();
  const { data, isPending, error } = useAppointmentDetail(params.id);

  return (
    <>
      <AccountHero
        title="Appointment Details"
        subtitle="Review your appointment details and stay updated with your upcoming schedule."
      />

      <div className="mx-auto max-w-4xl px-5 py-8 lg:px-8">
        <Link
          href="/appointments"
          className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline"
        >
          <ChevronLeft className="h-4 w-4" />
          All appointments
        </Link>

        <div className="mt-4 space-y-5">
          {isPending ? (
            <LoadingPanel label="Loading your appointment…" rows={6} />
          ) : error || !data ? (
            <div className="rounded-card border border-line bg-white p-8 text-center">
              <p className="text-sm font-semibold text-ink-900">That appointment could not be found.</p>
              <p className="mt-1 text-sm text-ink-500">
                It may have been removed, or it belongs to a different account.
              </p>
            </div>
          ) : (
            <Details appointment={data} />
          )}
        </div>
      </div>
    </>
  );
}

function Details({ appointment }: { appointment: AppointmentDetail }) {
  const { provider, facility, payment, patient } = appointment;
  const zone = facility?.timezone ?? 'UTC';
  const badge = clinicDateParts(appointment.starts_at, zone, 'long');
  const [cancelling, setCancelling] = useState(false);

  const address = facility
    ? [facility.address_line1, facility.address_line2, facility.city, facility.state, facility.postal_code]
        .filter(Boolean)
        .join(', ')
    : '';

  return (
    <>
      {/* Summary */}
      <section className="flex flex-wrap items-center gap-5 rounded-card border border-line bg-white p-5 shadow-[0_1px_2px_rgba(28,17,25,.04)]">
        <div className="flex h-[118px] w-[106px] shrink-0 flex-col items-center justify-center rounded-card bg-[#F4F2FD]">
          <span className="text-xs font-bold uppercase tracking-wide text-brand-600">{badge.month}</span>
          <span className="mt-1 text-[1.75rem] font-bold leading-none text-ink-900">{badge.day}</span>
          <span className="mt-2 text-[0.625rem] font-semibold uppercase tracking-wide text-ink-700">
            {badge.weekday}
          </span>
        </div>

        <Avatar name={provider?.name ?? 'Provider'} className="h-[104px] w-[104px] text-2xl" />

        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm font-bold text-brand-600">
            {formatClinicTime(appointment.starts_at, zone)}{' '}
            <span className="text-xs font-semibold text-ink-500">
              {clinicZoneName(appointment.starts_at, zone)}
            </span>
          </p>
          <p className="text-base font-bold text-ink-900">{provider?.name ?? 'Provider to be assigned'}</p>
          {provider?.specialty ? (
            <p className="flex items-center gap-1.5 text-xs text-ink-500">
              <StethoscopeIcon className="h-3.5 w-3.5" />
              {provider.specialty}
            </p>
          ) : null}
          {provider?.rating_average !== null && provider?.rating_average !== undefined ? (
            <p className="flex items-center gap-1 text-xs text-ink-500">
              <StarIcon className="h-3.5 w-3.5 text-amber-400" />
              <span className="font-semibold text-ink-700">{provider.rating_average.toFixed(2)}</span>
              <span className="px-0.5 text-ink-300">&bull;</span>
              {provider.rating_count} reviews
            </p>
          ) : null}
          {address ? (
            <p className="flex items-start gap-1.5 text-xs text-ink-700">
              <PinIcon className="mt-px h-3.5 w-3.5 shrink-0" />
              <span className="min-w-0">{address}</span>
            </p>
          ) : null}
        </div>

        <StatusBadge tone={appointmentStatusTone(appointment.status)}>
          {appointmentStatusLabel(appointment.status)}
        </StatusBadge>
      </section>

      {/* Details */}
      <section className="rounded-card border border-line bg-white p-5 shadow-[0_1px_2px_rgba(28,17,25,.04)]">
        <h2 className="text-base font-bold text-ink-900">Scheduled Appointment</h2>
        <dl className="mt-4 space-y-3.5">
          <Row label="Date">{formatClinicDate(appointment.starts_at, zone, 'medium')}</Row>
          <Row label="Time">
            {formatClinicTime(appointment.starts_at, zone)} &ndash; {formatClinicTime(appointment.ends_at, zone)}
          </Row>
          <Row label="Booking for">{appointment.booking_for === 'self' ? 'Self' : 'Dependent'}</Row>
          <Row label="Booking ID">#{appointment.reference}</Row>
        </dl>

        <Divider />

        <h3 className="text-sm font-bold text-ink-900">Problem</h3>
        <p className="mt-1.5 text-sm text-ink-700">{appointment.visit_reason ?? 'Not given'}</p>
        {appointment.patient_note ? (
          <p className="mt-1 text-sm text-ink-500">{appointment.patient_note}</p>
        ) : null}

        <Divider />

        <h3 className="text-sm font-bold text-ink-900">Insurance Information</h3>
        <p className="mt-1.5 text-sm text-ink-700">
          {payment.kind === 'self_pay' ? (
            'Self-pay (insurance will not be billed)'
          ) : (
            <>
              {payment.carrier ?? 'Insurance'}
              {payment.member_id_last4 ? (
                <span className="text-ink-500"> &middot; card ending {payment.member_id_last4}</span>
              ) : null}
            </>
          )}
        </p>

        {patient ? (
          <>
            <Divider />
            <h3 className="text-sm font-bold text-ink-900">Your Info</h3>
            <dl className="mt-3 space-y-3.5">
              <Row label="Full name">{patient.full_name}</Row>
              <Row label="Gender">{genderLabel(patient.gender)}</Row>
              <Row label="Age">{patient.age ?? 'Not given'}</Row>
            </dl>
          </>
        ) : null}

        {appointment.status === 'cancelled' ? (
          <p className="mt-5 rounded-field bg-red-50 px-3 py-2.5 text-xs text-red-700">
            This appointment was cancelled. The time has been released.
          </p>
        ) : null}

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {address ? (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${facility?.name}, ${address}`)}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 rounded-field border border-brand-600 py-3 text-sm font-semibold text-brand-600 transition-colors hover:bg-brand-50"
            >
              <PinIcon className="h-4 w-4" />
              Direction
            </a>
          ) : null}

          {appointment.can_change ? (
            <>
              <Link
                href={`/appointments/${appointment.id}/reschedule`}
                className="flex items-center justify-center rounded-field border border-brand-600 py-3 text-sm font-semibold text-brand-600 transition-colors hover:bg-brand-50"
              >
                Reschedule
              </Link>
              <button
                type="button"
                onClick={() => setCancelling(true)}
                className="rounded-field bg-[#E5484D] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#D13438]"
              >
                Cancel
              </button>
            </>
          ) : null}
        </div>
      </section>

      {cancelling ? (
        <CancelDialog appointment={appointment} onClose={() => setCancelling(false)} />
      ) : null}
    </>
  );
}

/**
 * "Are you sure?" before a cancellation. A real `<dialog>`, like the booking
 * confirmation, so focus, the backdrop and Escape are the browser's job.
 */
function CancelDialog({ appointment, onClose }: { appointment: AppointmentDetail; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState('');
  const { mutateAsync, isPending, error } = useCancelAppointment(appointment.id);
  const zone = appointment.facility?.timezone ?? 'UTC';

  useEffect(() => {
    const node = dialog.current;
    if (node && !node.open) node.showModal();
  }, []);

  async function confirm() {
    await mutateAsync(reason.trim() || null);
    toast.success('Appointment cancelled.');
    dialog.current?.close();
  }

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      aria-labelledby="cancel-appointment-title"
      className="m-auto w-[min(440px,calc(100vw-32px))] rounded-card border border-line bg-white p-6 text-ink-900 backdrop:bg-ink-900/40"
    >
      <h2 id="cancel-appointment-title" className="text-lg font-extrabold">
        Cancel this appointment?
      </h2>
      <p className="mt-1.5 text-sm text-ink-500">
        {appointment.provider?.name ?? 'Your appointment'} on{' '}
        {formatClinicDate(appointment.starts_at, zone, 'medium')} at{' '}
        {formatClinicTime(appointment.starts_at, zone)}. The time will be released for other patients.
      </p>

      <label className="mt-4 block text-[0.8125rem] font-semibold text-ink-700" htmlFor="cancel-reason">
        Reason (optional)
      </label>
      <textarea
        id="cancel-reason"
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        maxLength={300}
        rows={3}
        placeholder="Let the practice know why, if you like."
        className="mt-1.5 w-full rounded-field border border-line px-3.5 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
      />

      {error ? (
        <p className="mt-3 rounded-field bg-red-50 px-3 py-2 text-xs text-red-700">
          {error instanceof Error ? error.message : 'That could not be cancelled. Try again.'}
        </p>
      ) : null}

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => dialog.current?.close()}
          className="rounded-field border border-line py-3 text-sm font-semibold text-ink-700 transition-colors hover:border-brand-300"
        >
          Keep appointment
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => void confirm()}
          className="rounded-field bg-[#E5484D] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#D13438] disabled:opacity-60"
        >
          {isPending ? <Busy>Cancelling…</Busy> : 'Cancel appointment'}
        </button>
      </div>
    </dialog>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <dt className="text-ink-500">{label}</dt>
      <dd className="text-right font-medium text-ink-900">{children}</dd>
    </div>
  );
}

function Divider() {
  return <hr className="my-5 border-line" />;
}

function genderLabel(gender: string | null): string {
  if (!gender) return 'Not given';
  if (gender === 'prefer_not_to_say') return 'Prefer not to say';
  return gender.charAt(0).toUpperCase() + gender.slice(1);
}
