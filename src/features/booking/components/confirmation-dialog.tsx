'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { CrossIcon } from '@/components/ui/icons';
import { SuccessBurst } from '@/components/ui/success-burst';

import type { BookingDraft } from '../booking-state';
import { formatSlotDate, formatSlotTime } from '../format';
import type { BookingConfirmation } from '../types';

/**
 * The confirmation, shown once the last step is submitted.
 *
 * A real `<dialog>` element, so the browser handles the focus trap, the
 * backdrop and Escape rather than three hand-rolled effects that each miss an
 * edge. `showModal()` is called from an effect because it cannot run during
 * render.
 *
 * Everything shown comes back from the server that wrote the appointment --
 * the reference, the time it actually booked, and the clinic's zone. The
 * draft supplies only what the patient already chose on screen.
 */
export function ConfirmationDialog({
  draft,
  confirmation,
  onClose,
}: {
  draft: BookingDraft;
  confirmation: BookingConfirmation;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const node = dialog.current;
    if (node && !node.open) node.showModal();
  }, []);

  const zone = confirmation.timezone;

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      aria-labelledby="booking-confirmed-title"
      className="m-auto w-[min(420px,calc(100vw-32px))] rounded-card border border-line bg-white p-0 text-ink-900 backdrop:bg-ink-900/40"
    >
      <div className="relative p-6 text-center">
        <button
          type="button"
          aria-label="Close"
          onClick={() => dialog.current?.close()}
          className="absolute right-4 top-4 rounded-full p-1.5 text-ink-500 transition-colors hover:bg-brand-50 hover:text-brand-600"
        >
          <CrossIcon className="h-4 w-4" />
        </button>

        <SuccessBurst />

        <h2 id="booking-confirmed-title" className="mt-4 text-xl font-extrabold">
          Appointment Confirmed!
        </h2>
        <p className="mt-1 text-xs text-ink-500">
          You&rsquo;re all set. We&rsquo;ll send you a reminder 24 hours before.
        </p>

        <div className="mt-5 rounded-card border border-line bg-canvas p-4 text-left">
          <div className="flex items-center gap-3">
            <Avatar name={draft.provider?.name ?? 'Provider'} className="h-10 w-10 text-xs" />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{draft.provider?.name}</p>
              <p className="text-xs text-ink-500">{draft.provider?.specialty}</p>
            </div>
          </div>

          <dl className="mt-4 space-y-2 border-t border-line pt-3 text-xs">
            <Row label="Date">{formatSlotDate(confirmation.starts_at, zone)}</Row>
            <Row label="Time">{formatSlotTime(confirmation.starts_at, zone)}</Row>
            <Row label="Location">{confirmation.facility_name}</Row>
            <Row label="Visit Reason">{draft.reason?.name ?? '--'}</Row>
            <Row label="Confirmation #">
              <span className="font-bold text-brand-600">{confirmation.reference}</span>
            </Row>
          </dl>
        </div>

        <p className="mt-3 rounded-field bg-brand-50 px-3 py-2 text-left text-[0.6875rem] text-ink-700">
          The practice still has to confirm this request. You will hear from them before the visit.
        </p>

        <Link
          href="/appointments"
          className="mt-4 block rounded-field bg-brand-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
        >
          View Appointment
        </Link>
        <Link
          href="/home"
          className="mt-2 block py-2 text-sm font-medium text-ink-700 transition-colors hover:text-brand-600"
        >
          Back to Home
        </Link>
      </div>
    </dialog>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="shrink-0 text-ink-500">{label}</dt>
      <dd className="min-w-0 text-right font-semibold">{children}</dd>
    </div>
  );
}
