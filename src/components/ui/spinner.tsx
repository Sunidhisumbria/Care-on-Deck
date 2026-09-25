import type { ReactNode } from 'react';

/**
 * The app's loading indicators, drawn in the brand rather than as a stock ring.
 *
 *   Spinner        a plain ring in the current text colour -- white on a pink
 *                  button, pink on a white one. For inside buttons.
 *   BrandSpinner   the "orbit": a pale pink track and a magenta arc that fades
 *                  in, echoing the swoosh in the CareOndeck logo.
 *   Busy           Spinner + words, for a button that is working ("Saving…").
 *   SectionLoader  a soft pink pill, in place of a list or panel.
 *   AppLoader      the app icon in a ring with an arc running round it.
 *   LoadingPanel   AppLoader and a label, in place of a screen's data.
 *
 * Colours come from the theme tokens in globals.css, not hex copies, so a
 * change to the brand palette reaches these too. Everything spins only for
 * people who have not asked their device to reduce motion; for them the ring
 * stands still and the words carry the message.
 */
export function Spinner({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={`shrink-0 motion-safe:animate-spin ${className}`}
    >
      <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path
        d="M21.5 12A9.5 9.5 0 0 0 12 2.5"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** The brand's orbit. Decorative: whatever sits beside it says what is loading. */
export function BrandSpinner({ className = 'h-10 w-10' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      className={`shrink-0 motion-safe:animate-spin motion-safe:[animation-duration:900ms] ${className}`}
    >
      <defs>
        {/*
          Runs from the comet's tail to its head, so the arc fades in along its
          length. One fixed id is fine: every copy defines the same gradient.
        */}
        <linearGradient
          id="careondeck-orbit"
          x1="10.57"
          y1="10.57"
          x2="43"
          y2="24"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" style={{ stopColor: 'var(--color-brand-400)', stopOpacity: 0 }} />
          <stop offset="0.5" style={{ stopColor: 'var(--color-brand-400)' }} />
          <stop offset="1" style={{ stopColor: 'var(--color-brand-600)' }} />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="19" strokeWidth="5" className="stroke-brand-100" />
      {/* A 135° comet, top-left round to its head at three o'clock. */}
      <path
        d="M10.57 10.57A19 19 0 0 1 43 24"
        stroke="url(#careondeck-orbit)"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <circle cx="43" cy="24" r="3.6" className="fill-brand-600" />
    </svg>
  );
}

/** What a busy button shows: `<Busy>Saving…</Busy>`. Works in any button, flex or not. */
export function Busy({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center justify-center gap-2">
      <Spinner className="h-4 w-4" />
      {children}
    </span>
  );
}

/**
 * In place of a section that is still loading: a list, a calendar, a filter group.
 * The spinning mark alone, smaller; `label` is read to screen readers only.
 * `className` positions it; it is centred unless told otherwise.
 */
export function SectionLoader({ label = 'Loading…', className = '' }: { label?: string; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={`flex justify-center py-2 ${className}`}>
      <AppLoader className="h-10 w-10" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

/**
 * The app icon inside a ring, with an arc running round it: the loader for a
 * screen's data. Only the arc moves; the icon holds still, the way an app's
 * splash mark does.
 *
 * The icon is the one in app/icon.svg -- the favicon -- drawn in the theme's
 * colours, so the thing on screen while waiting is the thing in the browser tab.
 */
export function AppLoader({ className = 'h-16 w-16' }: { className?: string }) {
  return (
    <span aria-hidden="true" className={`relative inline-flex shrink-0 items-center justify-center ${className}`}>
      <svg viewBox="0 0 64 64" fill="none" className="absolute inset-0 h-full w-full">
        <circle cx="32" cy="32" r="29.5" strokeWidth="3" className="stroke-brand-100" />
      </svg>
      <svg
        viewBox="0 0 64 64"
        fill="none"
        className="absolute inset-0 h-full w-full motion-safe:animate-spin motion-safe:[animation-duration:1100ms]"
      >
        <path d="M32 2.5A29.5 29.5 0 0 1 61.5 32" strokeWidth="3" strokeLinecap="round" className="stroke-brand-600" />
      </svg>
      <svg viewBox="0 0 64 64" className="relative h-[54%] w-[54%] drop-shadow-sm">
        <rect width="64" height="64" rx="16" className="fill-brand-600" />
        <path d="M44 20a18 18 0 1 0 0 24" fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" />
        <path d="M41 26v12m-6-6h12" strokeWidth="4" strokeLinecap="round" className="stroke-brand-200" />
      </svg>
    </span>
  );
}

/**
 * In place of a screen's content while its data loads: the spinning mark
 * alone, with no card around it. `label` says what is on its way to screen
 * readers only.
 *
 * `rows` is roughly how many lines of content it stands in for. It sets the
 * height, so the page does not jump when the real content arrives.
 */
export function LoadingPanel({
  label = 'Loading…',
  rows = 4,
  className = '',
}: {
  label?: string;
  rows?: number;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{ minHeight: `${7 + rows * 1.75}rem` }}
      className={`flex items-center justify-center p-8 ${className}`}
    >
      <AppLoader className="h-16 w-16" />
      <span className="sr-only">{label}</span>
    </div>
  );
}
