'use client';

import { useEffect, useRef } from 'react';

import { useRequestVerification } from '../hooks/use-request-verification';
import type { Contacts, InterfaceRole } from '../types';

/**
 * "How should we verify you?" -- shown once the account exists.
 *
 * The number and address were both collected on the form, so this only asks
 * which one to use. Text is the default because it arrives faster and is
 * harder to lose in a spam folder; email is there because a mistyped number,
 * a landline or a patchy signal would otherwise be a dead end.
 *
 * Deliberately not dismissible: the account exists but cannot be signed into
 * until one of these is done, so a close button would only produce accounts
 * their owners cannot reach.
 */
export function VerifyMethodDialog({
  contacts,
  role,
}: {
  contacts: Contacts;
  role?: InterfaceRole;
}) {
  const request = useRequestVerification(role);
  const dialog = useRef<HTMLDivElement>(null);

  // Move focus into the dialog so a keyboard or screen-reader user is not left
  // behind on the form underneath.
  useEffect(() => {
    dialog.current?.focus();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div aria-hidden="true" className="absolute inset-0 bg-ink-900/50 backdrop-blur-sm" />

      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="verify-method-title"
        tabIndex={-1}
        className="relative w-full max-w-md rounded-card bg-white p-7 shadow-2xl outline-none sm:p-8"
      >
        <h2
          id="verify-method-title"
          className="text-[1.375rem] font-extrabold tracking-tight text-ink-900"
        >
          Verify your account
        </h2>
        <p className="mt-2 text-sm text-ink-500">
          Your account is created. Confirm one of your contacts to finish signing in.
        </p>

        <div className="mt-6 grid gap-3">
          {contacts.phone ? (
            <button
              type="button"
              onClick={() =>
                request.mutate({ channel: 'sms', destination: contacts.phone as string })
              }
              disabled={request.isPending}
              className="w-full rounded-field bg-brand-600 py-3.5 text-[0.9375rem] font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {request.isPending ? 'Please wait…' : 'Send verification text'}
            </button>
          ) : null}

          {contacts.phone ? (
            <p className="text-center text-xs text-ink-500">
              to <span className="font-semibold text-ink-700">{maskPhone(contacts.phone)}</span>
            </p>
          ) : null}

          {contacts.email ? (
            <button
              type="button"
              onClick={() =>
                request.mutate({ channel: 'email', destination: contacts.email as string })
              }
              disabled={request.isPending}
              className="mt-2 w-full text-[0.9375rem] font-semibold text-ink-900 transition-colors hover:text-brand-600 disabled:opacity-60"
            >
              Verify with email instead
            </button>
          ) : null}
        </div>

        <p className="mt-6 border-t border-line pt-5 text-center text-[0.6875rem] leading-relaxed text-ink-500">
          By continuing you agree to receive account updates and appointment reminders from
          CareOndeck. Message frequency varies; message and data rates may apply. Reply STOP to
          cancel.
        </p>
      </div>
    </div>
  );
}

/** `+15551234567` -> `(•••) •••-4567`. Enough to recognise, not to read out. */
function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 4 ? `(•••) •••-${digits.slice(-4)}` : phone;
}
