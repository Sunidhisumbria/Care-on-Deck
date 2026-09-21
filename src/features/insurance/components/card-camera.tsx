'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { AlertTriangleIcon, CrossIcon, ScanFrameIcon } from '@/components/ui/icons';

import type { InsuranceType } from '../types';
import { PrimaryButton, SecondaryButton } from './buttons';

type Stage = 'intro' | 'starting' | 'live' | 'unavailable';

/**
 * Photographing the front of an insurance card with the device camera.
 *
 * Follows the client's handoff: an explanation before the browser asks for the
 * camera, a card-shaped guide with the rest of the view dimmed, a shutter that
 * works without edge detection, and a way to upload or type the details
 * whenever the camera cannot be used.
 *
 * The photo never leaves the device. It is handed back as a Blob for the review
 * screen and nothing more.
 */
export function CardCamera({
  insuranceType,
  onPhoto,
  onCancel,
  onUpload,
  onManual,
}: {
  insuranceType: InsuranceType;
  onPhoto: (photo: Blob) => void;
  onCancel: () => void;
  onUpload: () => void;
  onManual: () => void;
}) {
  const [stage, setStage] = useState<Stage>('intro');
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);

  const stop = useCallback(() => {
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
  }, []);

  // The camera light goes off whenever this screen does.
  useEffect(() => stop, [stop]);

  async function start() {
    setStage('starting');
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera not supported');
      stream.current = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      setStage('live');
    } catch {
      // Denied, no camera, or not a secure page. All mean the same to the patient.
      stop();
      setStage('unavailable');
    }
  }

  // The stream is attached once the <video> it plays in has rendered.
  useEffect(() => {
    if (stage !== 'live' || !video.current || !stream.current) return;
    video.current.srcObject = stream.current;
    void video.current.play().catch(() => undefined);
  }, [stage]);

  function capture() {
    const element = video.current;
    if (!element?.videoWidth) return;

    const canvas = document.createElement('canvas');
    canvas.width = element.videoWidth;
    canvas.height = element.videoHeight;
    canvas.getContext('2d')?.drawImage(element, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        stop();
        onPhoto(blob);
      },
      'image/jpeg',
      0.92,
    );
  }

  if (stage === 'intro') {
    return <IntroDialog insuranceType={insuranceType} onContinue={start} onClose={onCancel} />;
  }

  if (stage === 'unavailable') {
    return (
      <div className="rounded-card border border-line bg-white p-5">
        <p className="text-sm font-bold text-ink-900">Camera access is unavailable.</p>
        <p className="mt-1 text-xs text-ink-500">
          You can upload a photo of your card or enter your insurance information manually.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <SecondaryButton onClick={onUpload}>Upload a photo</SecondaryButton>
          <PrimaryButton onClick={onManual}>Enter information manually</PrimaryButton>
        </div>
      </div>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="card-camera-title"
      className="fixed inset-0 z-50 flex flex-col bg-black text-white"
    >
      <div className="px-5 pt-6 text-center">
        <p id="card-camera-title" className="text-base font-bold">
          Scan the front of your insurance card
        </p>
        <p className="mt-1 text-xs text-white/75">
          Place the card inside the frame. Make sure the card is well lit and all text is readable.
        </p>
      </div>

      <div className="relative my-4 flex flex-1 items-center justify-center overflow-hidden">
        <video ref={video} playsInline muted className="absolute inset-0 h-full w-full object-cover" />
        {/* The guide: a card-shaped window with everything around it dimmed. */}
        <div
          aria-hidden="true"
          className="relative aspect-[1.586] w-[82%] max-w-xl rounded-2xl border-[3px] border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]"
        />
        {stage === 'starting' ? (
          <p className="absolute text-sm" role="status">
            Starting camera&hellip;
          </p>
        ) : null}
      </div>

      <p className="px-5 text-center text-[0.6875rem] text-white/70">
        Avoid glare from lights, hold steady, and fill the frame with the card.
      </p>

      <div className="flex items-center justify-between px-8 pb-8 pt-4">
        <button
          type="button"
          onClick={() => {
            stop();
            onCancel();
          }}
          className="w-16 text-left text-sm font-semibold"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={capture}
          disabled={stage !== 'live'}
          aria-label="Take photo"
          className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-white/20 transition-opacity disabled:opacity-40"
        >
          <span className="h-11 w-11 rounded-full bg-white" />
        </button>
        <span className="w-16" aria-hidden="true" />
      </div>
    </div>
  );
}

/** Why the camera is needed, asked before the browser's own permission prompt. */
function IntroDialog({
  insuranceType,
  onContinue,
  onClose,
}: {
  insuranceType: InsuranceType;
  onContinue: () => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const continuing = useRef(false);

  useEffect(() => {
    const node = dialog.current;
    if (node && !node.open) node.showModal();
  }, []);

  return (
    <dialog
      ref={dialog}
      onClose={() => {
        if (!continuing.current) onClose();
      }}
      aria-labelledby="scan-intro-title"
      className="m-auto w-[min(440px,calc(100vw-32px))] rounded-card border border-line bg-white p-0 text-ink-900 backdrop:bg-ink-900/40"
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

        <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-brand-600 text-white">
          <ScanFrameIcon className="h-9 w-9" />
        </span>

        <h2 id="scan-intro-title" className="mt-4 text-xl font-extrabold">
          Scan your insurance card
        </h2>
        <p className="mt-2 text-sm text-ink-500">
          Take a clear photo of the front of your {insuranceType} insurance card. We&rsquo;ll use it to help fill
          in your insurance information.
        </p>

        <p className="mt-4 flex gap-2 rounded-field border border-amber-300 bg-amber-50 px-3 py-2.5 text-left text-xs text-amber-900">
          <AlertTriangleIcon className="mt-px h-4 w-4 shrink-0" />
          <span>
            Your card photo is used only to read your insurance information. Review everything before saving
            &mdash; reading your card does not verify your coverage or benefits.
          </span>
        </p>

        <PrimaryButton
          className="mt-5"
          onClick={() => {
            continuing.current = true;
            dialog.current?.close();
            onContinue();
          }}
        >
          Continue
        </PrimaryButton>
      </div>
    </dialog>
  );
}
