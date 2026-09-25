'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';

import { Avatar } from '@/components/ui/avatar';
import { ChevronLeft, PinIcon } from '@/components/ui/icons';
import { Busy, LoadingPanel } from '@/components/ui/spinner';
import { formatClinicDate, formatClinicTime } from '@/lib/clinic-time';
import { toApiError } from '@/lib/http/errors';

import { useConfirmAppointment, useMarkNoShow, usePracticeAppointment } from '../hooks';
import type { PracticeAppointmentDetail } from '../types';
import { CancelDialog, RescheduleDialog } from './appointment-dialogs';
import { AppointmentStatusBadge } from './shared';

/**
 * IA: 6. Appointments > View Details.
 *
 * Confirm appears only for a request; Reschedule and Cancel only while the
 * visit is still ahead; No-show only once its time has come. The server
 * enforces the same rules, so a stale page gets a clear refusal, not a change.
 */
export function AppointmentDetailScreen({ id }: { id: string }) {
  const appointment = usePracticeAppointment(id);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link
        href="/provider/appointments"
        className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline"
      >
        <ChevronLeft className="h-4 w-4" />
        All appointments
      </Link>

      {appointment.data ? (
        <Details appointment={appointment.data} />
      ) : appointment.error ? (
        <p className="rounded-card border border-line bg-white px-6 py-10 text-center text-sm text-ink-500">
          That appointment could not be found.
        </p>
      ) : (
        <LoadingPanel label="Loading appointment…" rows={6} />
      )}
    </div>
  );
}

function Details({ appointment }: { appointment: PracticeAppointmentDetail }) {
  const router = useRouter();
  const confirm = useConfirmAppointment();
  const noShow = useMarkNoShow();
  const [dialog, setDialog] = useState<'cancel' | 'reschedule' | null>(null);
  const { patient } = appointment;
  const zone = appointment.timezone;
  const when = `${formatClinicDate(appointment.starts_at, zone, 'medium')} · ${formatClinicTime(appointment.starts_at, zone)}`;

  function onConfirm() {
    confirm.mutate(appointment.id, {
      onSuccess: () => toast.success('Appointment confirmed. The patient has been notified.'),
      onError: (error) => toast.error(toApiError(error).message),
    });
  }

  function onNoShow() {
    noShow.mutate(appointment.id, {
      onSuccess: () => toast.success('Marked as a no-show.'),
      onError: (error) => toast.error(toApiError(error).message),
    });
  }

  return (
    <>
      <section className="flex flex-wrap items-center gap-5 rounded-card border border-line bg-white p-5">
        <Avatar name={patient.name} className="h-20 w-20 text-xl" />
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="text-base font-bold text-ink-900">{patient.name}</p>
          {patient.email ? <p className="text-xs text-ink-500">{patient.email}</p> : null}
          {patient.address ? (
            <p className="flex items-start gap-1.5 text-xs text-ink-700">
              <PinIcon className="mt-px h-3.5 w-3.5 shrink-0" />
              {patient.address}
            </p>
          ) : null}
        </div>
        <AppointmentStatusBadge status={appointment.status} />
      </section>

      <section className="rounded-card border border-line bg-white p-5">
        <h2 className="text-sm font-bold text-ink-900">Patient Info</h2>
        <dl className="mt-3 space-y-3">
          <Row label="Full name">{patient.name}</Row>
          <Row label="Gender">{patient.gender ? patient.gender[0]!.toUpperCase() + patient.gender.slice(1) : 'Not given'}</Row>
          <Row label="Age">{patient.age ?? 'Not given'}</Row>
          {patient.phone ? <Row label="Phone">{patient.phone}</Row> : null}
        </dl>

        <h2 className="mt-6 text-sm font-bold text-ink-900">Scheduled Appointment</h2>
        <dl className="mt-3 space-y-3">
          <Row label="Date">{formatClinicDate(appointment.starts_at, zone, 'medium')}</Row>
          <Row label="Time">
            {formatClinicTime(appointment.starts_at, zone)} &ndash; {formatClinicTime(appointment.ends_at, zone)}
          </Row>
          <Row label="Booking for">{appointment.booking_for === 'self' ? 'Self' : 'Family member'}</Row>
          <Row label="Booking ID">#{appointment.reference}</Row>
        </dl>

        <Divider />
        <h3 className="text-sm font-bold text-ink-900">Problem</h3>
        <p className="mt-1.5 text-sm text-ink-700">{appointment.problem ?? 'Not given'}</p>
        {appointment.patient_note ? <p className="mt-1 text-sm text-ink-500">{appointment.patient_note}</p> : null}

        <Divider />
        <h3 className="text-sm font-bold text-ink-900">Insurance information</h3>
        <p className="mt-1.5 text-sm text-ink-700">{appointment.insurance ?? 'Self-pay'}</p>

        {appointment.can_confirm || appointment.can_change || appointment.can_mark_no_show ? (
          <>
            <Divider />
            <div className="flex flex-wrap justify-end gap-3">
              {appointment.can_confirm ? (
                <ActionButton tone="primary" onClick={onConfirm} pending={confirm.isPending}>
                  Confirm
                </ActionButton>
              ) : null}
              {appointment.can_change ? (
                <>
                  <ActionButton tone="outline" onClick={() => setDialog('reschedule')}>
                    Reschedule
                  </ActionButton>
                  <ActionButton tone="danger" onClick={() => setDialog('cancel')}>
                    Cancel
                  </ActionButton>
                </>
              ) : null}
              {appointment.can_mark_no_show ? (
                <ActionButton tone="outline" onClick={onNoShow} pending={noShow.isPending}>
                  Mark No-Show
                </ActionButton>
              ) : null}
            </div>
          </>
        ) : null}
      </section>

      {dialog === 'cancel' ? (
        <CancelDialog appointmentId={appointment.id} subtitle={`${patient.name} · ${when}`} onClose={() => setDialog(null)} />
      ) : null}
      {dialog === 'reschedule' ? (
        <RescheduleDialog
          appointment={appointment}
          onClose={() => setDialog(null)}
          onRescheduled={(movedId) => {
            setDialog(null);
            // The move is a new appointment; its page is the one that is now true.
            router.replace(`/provider/appointments/${movedId}` as Route);
          }}
        />
      ) : null}
    </>
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

const TONES = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700',
  outline: 'border border-brand-600 bg-white text-brand-600 hover:bg-brand-50',
  danger: 'bg-red-500 text-white hover:bg-red-600',
} as const;

function ActionButton({
  tone,
  onClick,
  pending,
  children,
}: {
  tone: keyof typeof TONES;
  onClick: () => void;
  pending?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className={`min-w-[9rem] flex-1 rounded-field py-3 text-sm font-semibold transition-colors disabled:opacity-60 sm:flex-none sm:px-10 ${TONES[tone]}`}
    >
      {pending ? <Busy>Please wait…</Busy> : children}
    </button>
  );
}
