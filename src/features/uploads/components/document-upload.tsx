'use client';

import { useRef, type ChangeEvent } from 'react';
import { toast } from 'sonner';

import { CheckCircleIcon, CrossIcon, UploadIcon } from '@/components/ui/icons';
import { toApiError } from '@/lib/http/errors';
import { acceptAttribute, formatBytes, formatsHint, UPLOAD_PURPOSES, type UploadPurpose } from '@/lib/uploads';

import { uploadsApi } from '../api/uploads.api';
import { useDocumentUpload } from '../hooks/use-document-upload';
import type { UploadedFile } from '../types';

/**
 * A document upload: the dashed drop area from the designs, a progress bar
 * while it sends, then the uploaded file with View, Replace and Remove.
 *
 * Remove detaches the file from the form; it does not delete it from storage.
 * Nothing references a detached file, and clearing those out is a scheduled
 * clean-up's job rather than a click's -- a click that deletes is one mistake
 * away from destroying the document someone meant to keep.
 */
export function DocumentUpload({
  purpose,
  value,
  onChange,
  error,
}: {
  purpose: UploadPurpose;
  value: UploadedFile | null;
  onChange: (file: UploadedFile | null) => void;
  error?: string;
}) {
  const label = UPLOAD_PURPOSES[purpose].label;
  const picker = useRef<HTMLInputElement>(null);
  const { state, upload, cancel } = useDocumentUpload(purpose);

  async function onPick(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Cleared so choosing the same file again, after an error, still fires.
    event.target.value = '';
    if (!file) return;

    const stored = await upload(file);
    if (stored) onChange(stored);
  }

  async function onView() {
    if (!value) return;
    // Opened inside the click, before the request, so the browser treats it as
    // the click's own window rather than blocking it as a pop-up.
    const tab = window.open('', '_blank');
    try {
      const { url } = await uploadsApi.viewLink(value.media_id);
      if (tab) {
        tab.opener = null;
        tab.location.href = url;
      } else {
        window.open(url, '_blank', 'noopener');
      }
    } catch (failure) {
      tab?.close();
      toast.error(toApiError(failure).message);
    }
  }

  return (
    <div>
      <input
        ref={picker}
        type="file"
        accept={acceptAttribute(purpose)}
        onChange={onPick}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />

      {state.status === 'uploading' ? (
        <div role="status" aria-live="polite" className="rounded-field border border-line bg-white px-4 py-4">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="min-w-0 truncate font-medium text-ink-900">{state.fileName}</span>
            <span className="shrink-0 text-ink-500">{state.progress}%</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full bg-brand-600 transition-[width]" style={{ width: `${state.progress}%` }} />
          </div>
          <button
            type="button"
            onClick={cancel}
            className="mt-2 text-xs font-semibold text-ink-500 transition-colors hover:text-brand-600"
          >
            Cancel upload
          </button>
        </div>
      ) : value ? (
        <div className="flex items-center justify-between gap-3 rounded-field border border-line bg-white px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="shrink-0 text-emerald-600">
              <CheckCircleIcon className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-ink-900">{value.file_name ?? label}</span>
              <span className="block text-xs text-ink-500">{formatBytes(value.byte_size)} &middot; uploaded</span>
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-3 text-xs font-semibold">
            <button type="button" onClick={onView} className="text-brand-600 hover:underline">
              View
            </button>
            <button
              type="button"
              onClick={() => picker.current?.click()}
              className="text-ink-700 transition-colors hover:text-brand-600"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={() => onChange(null)}
              aria-label={`Remove ${label.toLowerCase()}`}
              className="text-ink-500 transition-colors hover:text-red-600"
            >
              <CrossIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => picker.current?.click()}
          disabled={state.status === 'unavailable'}
          className="flex w-full flex-col items-center justify-center gap-1 rounded-field border border-dashed border-line bg-white px-4 py-6 text-sm font-medium text-ink-700 transition-colors hover:border-brand-300 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <UploadIcon className="h-4 w-4" />
          <span>Upload {label}</span>
          <span className="text-xs font-normal text-ink-500">{formatsHint(purpose)}</span>
        </button>
      )}

      {state.status === 'error' ? (
        <p role="alert" className="mt-2 text-xs text-red-600">
          {state.message}
        </p>
      ) : null}

      {state.status === 'unavailable' ? (
        <p role="status" className="mt-2 rounded-field bg-brand-50 px-3.5 py-2.5 text-[0.8125rem] text-ink-700">
          Document upload isn&rsquo;t set up yet. You can continue without it; our team will ask for a copy
          during review if they need one.
        </p>
      ) : null}

      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
