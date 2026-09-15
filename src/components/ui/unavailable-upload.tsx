'use client';

import { useState } from 'react';

import { UploadIcon } from './icons';

/**
 * Where a file upload will go, before there is anywhere to put the file.
 *
 * There is no storage service yet. A control that let someone choose a file and
 * then quietly dropped it would be worse than one that says it is not ready, so
 * this says so when pressed -- while keeping the space the design gives it, so
 * the real upload drops in later without moving anything around it.
 *
 * Used for the license document, the insurance card and, later, certificates
 * and the headshot. `row` is the single-line version the booking design uses;
 * `block` is the taller drop area onboarding uses.
 */
export function UnavailableUpload({
  label,
  note,
  formats,
  layout = 'block',
}: {
  label: string;
  note: string;
  formats?: string;
  layout?: 'row' | 'block';
}) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        className={`flex w-full items-center justify-center rounded-field border border-dashed border-line bg-white text-sm font-medium text-ink-700 transition-colors hover:border-brand-300 hover:text-brand-600 ${
          layout === 'row' ? 'gap-2 py-3' : 'flex-col gap-1 px-4 py-6'
        }`}
      >
        <UploadIcon className="h-4 w-4" />
        <span>{label}</span>
        {formats && layout === 'block' ? (
          <span className="text-xs font-normal text-ink-500">{formats}</span>
        ) : null}
      </button>

      {open ? (
        <p role="status" className="mt-2 rounded-field bg-brand-50 px-3.5 py-2.5 text-[0.8125rem] text-ink-700">
          {note}
        </p>
      ) : null}
    </div>
  );
}
