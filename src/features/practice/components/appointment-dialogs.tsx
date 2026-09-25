'use client';

import { useId, useState } from 'react';
import { toast } from 'sonner';

import { SelectMenu } from '@/components/ui/select-menu';
import { Busy } from '@/components/ui/spinner';
import { SlotPicker } from '@/features/booking/components/slot-picker';
import type { Slot } from '@/features/booking/types';
import { formatClinicDate, formatClinicTime } from '@/lib/clinic-time';
import { toApiError } from '@/lib/http/errors';

import { useCancelPracticeAppointment, useReschedulePracticeAppointment } from '../hooks';
import { CANCEL_REASONS, type CancelReason, type PracticeAppointmentDetail } from '../types';
import { Dialog } from './shared';

/**
 * IA: 6. Appointment Details > Cancel.
 *
 * "Keep Appointment" is the prominent button, as the design has it: the
 * irreversible choice is the quieter one. The optional message goes to the
 * patient with the notification.
 */
export function CancelDialog({
  appointmentId,
  subtitle,
  onClose,
  onCancelled,
}: {
  appointmentId: string;
  subtitle: string;
  onClose: () => void;
  onCancelled?: () => void;
}) {
  const cancel = useCancelPracticeAppointment(appointmentId);
  const [reason, setReason] = useState<CancelReason | ''>('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string>();
  const reasonId = useId();
  const messageId = useId();

  function onCancel() {
    if (!reason) {
      setError('Select a reason.');
      return;
    }
    cancel.mutate(
      { reason, message: message.trim() || null },
      {
        onSuccess: () => {
          toast.success('Appointment cancelled. The patient has been notified.');
          onClose();
          onCancelled?.();
        },
        onError: (failure) => toast.error(toApiError(failure).message),
      },
    );
  }

  return (
    <Dialog title="Cancel this appointment?" subtitle={subtitle} onClose={onClose} wide>
      <div className="space-y-4">
        <div>
          <span id={reasonId} className="mb-1.5 block text-[0.8125rem] font-semibold text-ink-700">
            Reason
          </span>
          <div
            className={`rounded-field border bg-white px-3.5 py-3 ${error ? 'border-red-400' : 'border-line'}`}
          >
            <SelectMenu
              options={CANCEL_REASONS.map((value) => ({ value, label: value }))}
              value={reason}
              onSelect={(value) => {
                setReason(value as CancelReason);
                setError(undefined);
              }}
              placeholder="Select reason"
              labelledBy={reasonId}
              invalid={Boolean(error)}
              triggerClassName="text-[0.9375rem]"
            />
          </div>
          {error ? <p className="mt-1.5 text-xs text-red-600">{error}</p> : null}
        </div>

        <div>
          <label htmlFor={messageId} className="mb-1.5 block text-[0.8125rem] font-semibold text-ink-700">
            Optional message to patient
          </label>
          <textarea
            id={messageId}
            rows={4}
            maxLength={500}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="e.g. We apologize for the inconvenience…"
            className="w-full resize-none rounded-field border border-line bg-white px-3.5 py-3 text-sm text-ink-900 outline-none placeholder:text-ink-300 focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
          />
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-field bg-brand-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
        >
          Keep Appointment
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={cancel.isPending}
          className="w-full py-1 text-sm font-semibold text-ink-700 transition-colors hover:text-red-600 disabled:opacity-60"
        >
          {cancel.isPending ? <Busy>Cancelling…</Busy> : 'Cancel Appointment'}
        </button>
      </div>
    </Dialog>
  );
}

/**
 * IA: 7. Reschedule. Two steps, as designed: pick a time from the provider's
 * real openings, then confirm it with the old and new times side by side.
 */
export function RescheduleDialog({
  appointment,
  onClose,
  onRescheduled,
}: {
  appointment: PracticeAppointmentDetail;
  onClose: () => void;
  onRescheduled: (id: string) => void;
}) {
  const reschedule = useReschedulePracticeAppointment(appointment.id);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [zone, setZone] = useState(appointment.timezone);
  const [confirming, setConfirming] = useState(false);
  const [notify, setNotify] = useState(true);

  const current = `${formatClinicDate(appointment.starts_at, appointment.timezone, 'medium')} at ${formatClinicTime(appointment.starts_at, appointment.timezone)}`;

  if (!appointment.provider_id) {
    return (
      <Dialog title="Reschedule Appointment" onClose={onClose}>
        <p className="text-center text-sm text-ink-500">This appointment has no provider, so it cannot be moved here.</p>
      </Dialog>
    );
  }

  if (confirming && slot) {
    const next = `${formatClinicDate(slot.starts_at, zone, 'medium')} · ${formatClinicTime(slot.starts_at, zone)}`;

    function onConfirm() {
      reschedule.mutate(
        { starts_at: slot!.starts_at, notify },
        {
          onSuccess: (moved) => {
            toast.success(notify ? 'Appointment moved. The patient has been notified.' : 'Appointment moved.');
            onRescheduled(moved.id);
          },
          onError: (error) => toast.error(toApiError(error).message),
        },
      );
    }

    return (
      <Dialog title="Confirm Reschedule" onClose={onClose} wide>
        <dl className="space-y-3 rounded-card border border-line bg-white p-4 text-sm">
          <Row label="Patient">{appointment.patient.name}</Row>
          <Row label="Current">
            <span className="text-ink-500 line-through">{current}</span>
          </Row>
          <Row label="New Time">{next}</Row>
        </dl>

        <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-field border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-900">
          <input
            type="checkbox"
            checked={notify}
            onChange={(event) => setNotify(event.target.checked)}
            className="h-4 w-4 shrink-0 cursor-pointer accent-brand-600"
          />
          Notify patient about this schedule change
        </label>

        <button
          type="button"
          onClick={onConfirm}
          disabled={reschedule.isPending}
          className="mt-5 w-full rounded-field bg-brand-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
        >
          {reschedule.isPending ? <Busy>Saving…</Busy> : notify ? 'Confirm & Notify' : 'Confirm'}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="mt-2 w-full py-1 text-sm font-semibold text-ink-700 hover:text-brand-600"
        >
          Back
        </button>
      </Dialog>
    );
  }

  return (
    <Dialog title="Reschedule Appointment" subtitle={`Current: ${current}`} onClose={onClose} wide>
      <SlotPicker
        providerId={appointment.provider_id}
        fallbackTimezone={appointment.timezone}
        value={slot}
        onChange={(next, timezone) => {
          setSlot(next);
          setZone(timezone);
        }}
      />
      <button
        type="button"
        onClick={() => setConfirming(true)}
        disabled={!slot}
        className="mt-5 w-full rounded-field bg-brand-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Confirm New Time
      </button>
    </Dialog>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-ink-500">{label}</dt>
      <dd className="text-right font-semibold text-ink-900">{children}</dd>
    </div>
  );
}
