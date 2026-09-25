'use client';

import { useId, useState } from 'react';
import { toast } from 'sonner';

import { PhoneField } from '@/components/ui/field';
import { LockIcon } from '@/components/ui/icons';
import { Busy } from '@/components/ui/spinner';
import { PhotoUpload } from '@/features/uploads/components/photo-upload';
import type { UploadedFile } from '@/features/uploads/types';
import { toApiError } from '@/lib/http/errors';
import { formatUsPhone } from '@/lib/practice';

import { useConfirmContactChange, useRequestContactChange, useUpdateProviderPhoto } from '../hooks';
import type { ProviderProfile } from '../types';
import { Dialog } from './shared';

/**
 * Personal details: the photo patients see, the name, and the email and phone
 * used to sign in.
 *
 * The name is shown but not editable. It is what the reviewer matched against
 * the NPI registry; changing it here would quietly undo that check, so a
 * change goes through support. Email and phone change only once a code sent
 * to the new address has been entered.
 */
export function PersonalDetailsDialog({ profile, onClose }: { profile: ProviderProfile; onClose: () => void }) {
  return (
    <Dialog title="Personal Details" subtitle="How patients see you, and how you sign in." onClose={onClose} wide>
      <div className="space-y-5">
        <PhotoSection profile={profile} />

        <div>
          <p className="mb-1.5 text-[0.8125rem] font-semibold text-ink-700">Name</p>
          <div className="flex items-center gap-2.5 rounded-field border border-line bg-canvas px-3.5 py-3 text-[0.9375rem] text-ink-900">
            <span className="min-w-0 flex-1 truncate">
              {profile.name}
              {profile.credentials ? `, ${profile.credentials}` : ''}
            </span>
            <LockIcon className="h-4 w-4 shrink-0 text-ink-300" />
          </div>
          <p className="mt-1.5 text-xs text-ink-500">
            Matches your NPI record, so it can&rsquo;t be changed here. Contact support if it is wrong.
          </p>
        </div>

        <ContactRow channel="email" label="Email Address" current={profile.email} />
        <ContactRow channel="sms" label="Phone Number" current={profile.phone} />
      </div>
    </Dialog>
  );
}

/** Saved as soon as it is uploaded or removed; every new headshot goes to photo review. */
function PhotoSection({ profile }: { profile: ProviderProfile }) {
  const save = useUpdateProviderPhoto();
  const value: UploadedFile | null = profile.headshot
    ? { media_id: profile.headshot.media_id, purpose: 'provider_headshot', content_type: profile.headshot.content_type, byte_size: 0 }
    : null;

  function onChange(file: UploadedFile | null) {
    save.mutate(file?.media_id ?? null, {
      onSuccess: () =>
        toast.success(file ? 'Photo updated. Patients see it once it passes photo review.' : 'Photo removed.'),
      onError: (error) => toast.error(toApiError(error).message),
    });
  }

  return (
    <div className="flex flex-col items-center">
      <PhotoUpload name={profile.name} value={value} onChange={onChange} purpose="provider_headshot" />
      {save.isPending ? (
        <p className="mt-1 text-xs text-ink-500">
          <Busy>Saving photo…</Busy>
        </p>
      ) : null}
    </div>
  );
}

/**
 * One sign-in contact: shown, then changed in two steps -- the new address,
 * then the code sent to it. Nothing changes until the code checks out.
 */
function ContactRow({ channel, label, current }: { channel: 'sms' | 'email'; label: string; current: string | null }) {
  const request = useRequestContactChange();
  const confirm = useConfirmContactChange();
  const [stage, setStage] = useState<'view' | 'enter' | 'code'>('view');
  const [destination, setDestination] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string>();
  const inputId = useId();
  const codeId = useId();
  const noun = channel === 'sms' ? 'phone number' : 'email address';

  function reset() {
    setStage('view');
    setDestination('');
    setCode('');
    setError(undefined);
  }

  function send() {
    const value = destination.trim();
    if (!value) return setError(`Enter the new ${noun}.`);
    setError(undefined);
    request.mutate(
      { channel, destination: channel === 'email' ? value.toLowerCase() : value },
      {
        onSuccess: (sent) => {
          setStage('code');
          toast.success(`We sent a code to ${sent.destination}.`);
        },
        onError: (failure) => setError(toApiError(failure).message),
      },
    );
  }

  function verify() {
    if (!/^\d{6}$/.test(code)) return setError('Enter the 6-digit code.');
    setError(undefined);
    confirm.mutate(
      { channel, destination: channel === 'email' ? destination.trim().toLowerCase() : destination.trim(), code },
      {
        onSuccess: () => {
          toast.success(`Your ${noun} has been updated.`);
          reset();
        },
        onError: (failure) => setError(toApiError(failure).message),
      },
    );
  }

  const shown = current ? (channel === 'sms' ? formatUsPhone(current) : current) : 'Not set';

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <p className="text-[0.8125rem] font-semibold text-ink-700">{label}</p>
        {stage === 'view' ? (
          <button
            type="button"
            onClick={() => setStage('enter')}
            className="text-sm font-semibold text-brand-600 underline underline-offset-2 hover:text-brand-700"
          >
            Change
          </button>
        ) : (
          <button type="button" onClick={reset} className="text-sm font-semibold text-ink-500 hover:text-ink-900">
            Cancel
          </button>
        )}
      </div>

      {stage === 'view' ? (
        <p className="rounded-field border border-line bg-white px-3.5 py-3 text-[0.9375rem] text-ink-900">{shown}</p>
      ) : null}

      {stage === 'enter' ? (
        <div className="space-y-2">
          {channel === 'sms' ? (
            <PhoneField
              label={`New ${noun}`}
              defaultValue=""
              onChange={(event) => setDestination(event.target.value)}
              error={error}
            />
          ) : (
            <>
              <label htmlFor={inputId} className="sr-only">
                New {noun}
              </label>
              <input
                id={inputId}
                type="email"
                autoComplete="email"
                value={destination}
                onChange={(event) => setDestination(event.target.value)}
                placeholder="New email address"
                aria-invalid={error ? true : undefined}
                className="w-full rounded-field border border-line bg-white px-3.5 py-3 text-[0.9375rem] text-ink-900 outline-none placeholder:text-ink-300 focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
              />
              {error ? <p className="text-xs text-red-600">{error}</p> : null}
            </>
          )}
          <button
            type="button"
            onClick={send}
            disabled={request.isPending}
            className="w-full rounded-field bg-brand-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
          >
            {request.isPending ? <Busy>Sending code…</Busy> : 'Send code'}
          </button>
        </div>
      ) : null}

      {stage === 'code' ? (
        <div className="space-y-2">
          <label htmlFor={codeId} className="block text-xs text-ink-500">
            Enter the 6-digit code sent to <span className="font-semibold text-ink-700">{destination.trim()}</span>
          </label>
          <input
            id={codeId}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            aria-invalid={error ? true : undefined}
            className="w-full rounded-field border border-line bg-white px-3.5 py-3 text-center text-lg tracking-[0.4em] text-ink-900 outline-none placeholder:text-ink-300 focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
          />
          {error ? <p className="text-xs text-red-600">{error}</p> : null}
          <button
            type="button"
            onClick={verify}
            disabled={confirm.isPending}
            className="w-full rounded-field bg-brand-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
          >
            {confirm.isPending ? <Busy>Verifying…</Busy> : `Verify and update`}
          </button>
          <button
            type="button"
            onClick={send}
            disabled={request.isPending}
            className="w-full py-1 text-xs font-semibold text-brand-600 hover:underline disabled:opacity-60"
          >
            Send a new code
          </button>
        </div>
      ) : null}
    </div>
  );
}
