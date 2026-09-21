'use client';

import { useEffect, useRef } from 'react';

import { CrossIcon } from '@/components/ui/icons';
import { SuccessBurst } from '@/components/ui/success-burst';

import type { SavedInsurance } from '../types';
import { PrimaryButton } from './buttons';
import { InsuranceDetails, InsuranceHeading } from './insurance-card';

/**
 * "Insurance information saved successfully." What was saved, masked, and one
 * action for what comes next -- booking in the booking flow, Done elsewhere.
 *
 * The dialog closes before the action runs, so a booking confirmation opening
 * next never stacks on top of it.
 */
export function SavedDialog({
  saved,
  actionLabel,
  onAction,
  onClose,
}: {
  saved: SavedInsurance;
  actionLabel: string;
  onAction: () => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const acting = useRef(false);

  useEffect(() => {
    const node = dialog.current;
    if (node && !node.open) node.showModal();
  }, []);

  return (
    <dialog
      ref={dialog}
      onClose={() => (acting.current ? onAction() : onClose())}
      aria-labelledby="insurance-saved-title"
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

        <SuccessBurst tone="success" />

        <h2 id="insurance-saved-title" className="mt-4 text-xl font-extrabold">
          Insurance information saved successfully.
        </h2>

        <div className="mt-5 rounded-card border border-line bg-canvas p-4 text-left">
          <InsuranceHeading insurance={saved} />
          <InsuranceDetails insurance={saved} className="mt-4 border-t border-line pt-3" />
        </div>

        <PrimaryButton
          className="mt-5"
          onClick={() => {
            acting.current = true;
            dialog.current?.close();
          }}
        >
          {actionLabel}
        </PrimaryButton>
      </div>
    </dialog>
  );
}
