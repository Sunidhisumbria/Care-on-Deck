'use client';

import { useQuery } from '@tanstack/react-query';
import { useRef, type ChangeEvent } from 'react';

import { initials } from '@/components/ui/avatar';
import { UploadIcon } from '@/components/ui/icons';
import { uploadKeys } from '@/lib/query/keys';
import { acceptAttribute, formatsHint } from '@/lib/uploads';

import { uploadsApi } from '../api/uploads.api';
import { useDocumentUpload } from '../hooks/use-document-upload';
import type { UploadedFile } from '../types';

/**
 * The round profile photo from the Upload Profile design: initials until there
 * is a photo, and a small upload button on its edge.
 *
 * The photo is private until the application is approved, so the preview comes
 * through a short-lived link from the server rather than a public address. The
 * link is refetched before it expires if the screen stays open.
 */
export function PhotoUpload({
  name,
  value,
  onChange,
  error,
}: {
  name: string;
  value: UploadedFile | null;
  onChange: (file: UploadedFile | null) => void;
  error?: string;
}) {
  const picker = useRef<HTMLInputElement>(null);
  const { state, upload } = useDocumentUpload('provider_headshot');

  const preview = useQuery({
    queryKey: uploadKeys.view(value?.media_id ?? 'none'),
    queryFn: () => uploadsApi.viewLink(value!.media_id),
    enabled: Boolean(value),
    staleTime: 4 * 60 * 1000,
    refetchInterval: 4 * 60 * 1000,
  });

  async function onPick(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const stored = await upload(file);
    if (stored) onChange(stored);
  }

  const busy = state.status === 'uploading';

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        {value && preview.data ? (
          // eslint-disable-next-line @next/next/no-img-element -- a signed, expiring link; next/image would cache it
          <img src={preview.data.url} alt="" className="h-24 w-24 rounded-full object-cover" />
        ) : (
          <span
            aria-hidden="true"
            className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-3xl font-bold text-white"
          >
            {initials(name)}
          </span>
        )}

        <button
          type="button"
          onClick={() => picker.current?.click()}
          disabled={busy || state.status === 'unavailable'}
          aria-label={value ? 'Change profile photo' : 'Upload profile photo'}
          className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border border-line bg-white text-brand-600 shadow transition-colors hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <UploadIcon className="h-4 w-4" />
        </button>
      </div>

      <input
        ref={picker}
        type="file"
        accept={acceptAttribute('provider_headshot')}
        onChange={onPick}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />

      <p className="mt-2 text-xs text-ink-500" aria-live="polite">
        {busy ? `Uploading… ${state.progress}%` : value ? 'Photo uploaded' : formatsHint('provider_headshot')}
      </p>

      {value ? (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="mt-1 text-xs font-semibold text-ink-500 transition-colors hover:text-red-600"
        >
          Remove photo
        </button>
      ) : null}

      {state.status === 'error' ? (
        <p role="alert" className="mt-1 text-center text-xs text-red-600">
          {state.message}
        </p>
      ) : null}

      {state.status === 'unavailable' ? (
        <p role="status" className="mt-2 max-w-xs rounded-field bg-brand-50 px-3 py-2 text-center text-xs text-ink-700">
          Photo upload isn&rsquo;t set up yet. You can continue and add a photo later.
        </p>
      ) : null}

      {error ? <p className="mt-1 text-center text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
