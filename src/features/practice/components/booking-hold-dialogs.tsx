'use client';

import { DateTime } from 'luxon';
import { useId, useState } from 'react';
import { toast } from 'sonner';

import { Busy } from '@/components/ui/spinner';
import { toApiError } from '@/lib/http/errors';

import { useCreateHold, useResumeBookings } from '../hooks';
import type { BookingHold, CreateHoldInput } from '../types';
import { Dialog } from './shared';

const PRESETS: { scope: Exclude<CreateHoldInput['scope'], 'custom'>; label: string }[] = [
  { scope: 'today', label: 'Hold Today' },
  { scope: 'this_week', label: 'Hold This Week' },
  { scope: 'this_month', label: 'Hold This Month' },
];

/**
 * IA: 7. Booking Holds. A preset pauses at once; Custom asks for the first and
 * last day. Existing appointments are untouched -- only new bookings stop.
 */
export function HoldDialog({ timezone, onClose }: { timezone: string; onClose: () => void }) {
  const create = useCreateHold();
  const [custom, setCustom] = useState(false);
  const [pending, setPending] = useState<CreateHoldInput['scope'] | null>(null);

  function hold(body: CreateHoldInput) {
    setPending(body.scope);
    create.mutate(body, {
      onSuccess: (created) => {
        toast.success(`Bookings paused through ${lastDay(created, timezone)}.`);
        onClose();
      },
      onError: (error) => toast.error(toApiError(error).message),
      onSettled: () => setPending(null),
    });
  }

  if (custom) {
    return <CustomHold timezone={timezone} pending={create.isPending} onBack={() => setCustom(false)} onClose={onClose} onHold={hold} />;
  }

  return (
    <Dialog
      title="Booking Holds"
      subtitle="Temporarily pause new patient bookings for a period."
      onClose={onClose}
      wide
    >
      <div className="grid grid-cols-2 gap-3">
        {PRESETS.map((preset) => (
          <Pill key={preset.scope} disabled={create.isPending} onClick={() => hold({ scope: preset.scope })}>
            {pending === preset.scope ? <Busy>Pausing…</Busy> : preset.label}
          </Pill>
        ))}
        <Pill disabled={create.isPending} onClick={() => setCustom(true)}>
          Custom Hold
        </Pill>
      </div>
    </Dialog>
  );
}

function CustomHold({
  timezone,
  pending,
  onBack,
  onClose,
  onHold,
}: {
  timezone: string;
  pending: boolean;
  onBack: () => void;
  onClose: () => void;
  onHold: (body: CreateHoldInput) => void;
}) {
  const today = DateTime.now().setZone(timezone).toISODate()!;
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string>();
  const fromId = useId();
  const toId = useId();
  const reasonId = useId();

  function submit() {
    if (!from || !to) return setError('Choose the first and last day.');
    if (from < today) return setError('A hold cannot start in the past.');
    if (to < from) return setError('The last day comes before the first.');
    setError(undefined);
    onHold({ scope: 'custom', from, to, reason: reason.trim() || null });
  }

  const input =
    'w-full rounded-field border border-line bg-white px-3.5 py-3 text-sm text-ink-900 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100';

  return (
    <Dialog title="Custom Hold" subtitle="Pause new bookings from the first day to the last, both included." onClose={onClose} wide>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor={fromId} className="mb-1.5 block text-[0.8125rem] font-semibold text-ink-700">
              First day
            </label>
            <input
              id={fromId}
              type="date"
              min={today}
              value={from}
              onChange={(event) => {
                setFrom(event.target.value);
                if (to < event.target.value) setTo(event.target.value);
              }}
              className={input}
            />
          </div>
          <div>
            <label htmlFor={toId} className="mb-1.5 block text-[0.8125rem] font-semibold text-ink-700">
              Last day
            </label>
            <input id={toId} type="date" min={from || today} value={to} onChange={(event) => setTo(event.target.value)} className={input} />
          </div>
        </div>
        <div>
          <label htmlFor={reasonId} className="mb-1.5 block text-[0.8125rem] font-semibold text-ink-700">
            Reason <span className="font-normal text-ink-500">(optional)</span>
          </label>
          <input
            id={reasonId}
            value={reason}
            maxLength={200}
            onChange={(event) => setReason(event.target.value)}
            placeholder="e.g. Conference, vacation"
            className={input}
          />
        </div>
        {error ? (
          <p role="alert" className="text-xs text-red-600">
            {error}
          </p>
        ) : null}

        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="w-full rounded-field bg-brand-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
        >
          {pending ? <Busy>Pausing…</Busy> : 'Hold Bookings'}
        </button>
        <button type="button" onClick={onBack} className="w-full py-1 text-sm font-semibold text-ink-700 hover:text-brand-600">
          Back
        </button>
      </div>
    </Dialog>
  );
}

/** IA: 7. Booking Holds > Resume Bookings. Releases every active hold. */
export function ResumeDialog({ holds, onClose }: { holds: BookingHold[]; onClose: () => void }) {
  const resume = useResumeBookings();

  function onResume() {
    resume.mutate(holds, {
      onSuccess: () => {
        toast.success('Bookings resumed. Patients can book again.');
        onClose();
      },
      onError: (error) => toast.error(toApiError(error).message),
    });
  }

  return (
    <Dialog
      icon={
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-rose-400 to-rose-600 shadow-[0_6px_16px_rgba(225,29,72,.35)]">
          <svg viewBox="0 0 20 20" className="ml-0.5 h-6 w-6 text-white" fill="currentColor" aria-hidden="true">
            <path d="M6 4.2v11.6a.8.8 0 0 0 1.2.7l9.3-5.8a.8.8 0 0 0 0-1.4L7.2 3.5A.8.8 0 0 0 6 4.2Z" />
          </svg>
        </span>
      }
      title="Resume accepting appointments?"
      subtitle="Appointments can become available for booking again immediately."
      onClose={onClose}
      wide
    >
      <button
        type="button"
        onClick={onResume}
        disabled={resume.isPending}
        className="w-full rounded-field bg-brand-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
      >
        {resume.isPending ? <Busy>Resuming…</Busy> : 'Resume Bookings'}
      </button>
      <button type="button" onClick={onClose} className="mt-2 w-full py-1 text-sm font-semibold text-ink-700 hover:text-brand-600">
        Cancel
      </button>
    </Dialog>
  );
}

function Pill({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-full border border-brand-200 bg-white px-4 py-3 text-sm font-semibold text-ink-700 transition-colors hover:border-brand-400 hover:bg-brand-50 hover:text-brand-700 focus-visible:bg-brand-50 disabled:cursor-wait disabled:opacity-60"
    >
      {children}
    </button>
  );
}

/** The last day a hold covers, e.g. "Sun, Sep 27" -- its end is exclusive, so a moment before. */
export function lastDay(hold: Pick<BookingHold, 'ends_at'>, timezone: string): string {
  return DateTime.fromISO(hold.ends_at).setZone(timezone).minus({ milliseconds: 1 }).toFormat('ccc, LLL d');
}
