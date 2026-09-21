'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { toast } from 'sonner';

import { ChevronRight } from '@/components/ui/icons';

import { PrimaryButton, SecondaryButton } from './buttons';

const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

/**
 * The device photo picker behind "Upload a photo".
 *
 * `open` has to run inside the click that asked for it, because browsers only
 * show a file picker in response to a user gesture. So it is a function the
 * button calls, not something that happens on render.
 */
export function usePhotoPicker(onPhoto: (photo: Blob) => void) {
  const input = useRef<HTMLInputElement>(null);

  const element = (
    <input
      ref={input}
      type="file"
      accept="image/*"
      tabIndex={-1}
      aria-hidden="true"
      className="sr-only"
      onChange={(event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        // Cleared so choosing the same photo again still counts as a change.
        event.target.value = '';
        if (!file) return;
        if (!file.type.startsWith('image/')) {
          toast.error('Choose a photo of your insurance card.');
          return;
        }
        if (file.size > MAX_PHOTO_BYTES) {
          toast.error('That photo is too large. Choose one under 10 MB.');
          return;
        }
        onPhoto(file);
      }}
    />
  );

  return { element, open: () => input.current?.click() };
}

/**
 * A viewable URL for a photo held in memory, released when the photo changes
 * or the screen closes.
 *
 * Created inside the effect rather than in a memo: Strict Mode runs effect
 * cleanups once on mount, and a memoised URL would be revoked there and never
 * recreated -- a broken image, only in development.
 */
export function usePhotoUrl(photo: Blob | null): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!photo) {
      setUrl(null);
      return;
    }
    const next = URL.createObjectURL(photo);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [photo]);

  return url;
}

/** "Is the card clear and easy to read?" -- before anything is done with the photo. */
export function PhotoReview({ photo, onRetake, onUse }: { photo: Blob; onRetake: () => void; onUse: () => void }) {
  const url = usePhotoUrl(photo);

  return (
    <div>
      <h2 className="text-base font-bold text-ink-900">Is the card clear and easy to read?</h2>
      <p className="mt-1 text-xs text-ink-500">
        Make sure all text &mdash; including the Member ID and carrier name &mdash; is fully visible.
      </p>

      <CardImage url={url} className="mt-4 max-h-80" />

      <p className="mt-2 text-xs text-ink-500">If the text is blurred, cut off, dark or covered, retake the photo.</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <SecondaryButton onClick={onRetake}>Retake photo</SecondaryButton>
        <PrimaryButton onClick={onUse}>
          Use Photo
          <ChevronRight className="h-4 w-4" />
        </PrimaryButton>
      </div>
    </div>
  );
}

/**
 * Shown above the fields after "Use photo". Card reading is not switched on
 * (it needs Textract under a signed AWS BAA), so the patient copies the details
 * from their own photo. Saying so plainly beats a spinner that fails.
 */
export function PhotoForReference({ photo }: { photo: Blob }) {
  const url = usePhotoUrl(photo);

  return (
    <div className="rounded-card border border-line bg-white p-3">
      <CardImage url={url} className="max-h-44" />
      <p className="mt-3 rounded-field bg-brand-50 px-3 py-2 text-xs text-ink-700">
        Automatic card reading isn&rsquo;t available yet, so please copy the details from your card below. Your
        photo stays on this device and isn&rsquo;t uploaded.
      </p>
    </div>
  );
}

function CardImage({ url, className }: { url: string | null; className: string }) {
  return (
    <div className="overflow-hidden rounded-field border border-line bg-canvas">
      {url ? (
        // A local object URL: next/image has nothing to optimise, and it never leaves the device.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="Your insurance card" className={`mx-auto w-full object-contain ${className}`} />
      ) : (
        <div aria-hidden="true" className="aspect-[1.586] w-full animate-pulse" />
      )}
    </div>
  );
}
