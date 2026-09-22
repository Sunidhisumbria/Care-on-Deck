'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { SearchIcon } from '@/components/ui/icons';

/** The Figma welcome band and its primary care search. */
export function WelcomeHero({ firstName }: { firstName: string }) {
  const router = useRouter();
  const [query, setQuery] = useState('');

  return (
    <section className="relative min-h-[256px] overflow-hidden rounded-card px-6 pb-9 pt-7 text-ink-900 sm:px-8 sm:pt-[1.875rem]">
      <SatinBackdrop />

      <div className="relative z-10 max-w-[580px] lg:max-w-[52%]">
        <p className="text-xs font-bold uppercase tracking-[0.1em] text-brand-600">Welcome back</p>
        <h1 className="mt-1.5 text-[1.75rem] font-bold tracking-tight sm:text-[2rem]">
          {greeting()}, {firstName}{' '}
          <span aria-hidden="true" className="text-[0.9em]">
            {'\u{1F44B}'}
          </span>
        </h1>
        <p className="mt-3.5 max-w-[430px] text-sm leading-[1.45] text-[#5b5158]">
          Manage your healthcare appointments and information in one place.
        </p>

        <form
          className="mt-[1.125rem] flex max-w-[580px] items-center gap-2 rounded-[0.625rem] bg-white p-1.5 shadow-[0_8px_22px_rgba(116,35,79,0.10)]"
          onSubmit={(event) => {
            event.preventDefault();
            const trimmed = query.trim();
            router.push(trimmed ? `/?q=${encodeURIComponent(trimmed)}` : '/');
          }}
        >
          <span className="pl-2.5 text-ink-500">
            <SearchIcon className="h-4 w-4" />
          </span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={'Condition, Provider, Practice…'}
            aria-label="Search for care"
            className="min-w-0 flex-1 bg-transparent py-2 text-sm text-ink-900 outline-none placeholder:text-ink-300"
          />
          <button
            type="submit"
            className="h-10.5 shrink-0 rounded-[0.5rem] bg-brand-600 px-[1.125rem] text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          >
            Find Care
          </button>
        </form>
      </div>

      <Image
        src="/images/patient-welcome.webp"
        alt="Patient reviewing upcoming care on her phone"
        width={780}
        height={359}
        priority
        className="pointer-events-none absolute bottom-0 right-[2.6%] hidden h-auto w-[42.6%] max-w-[520px] select-none lg:block"
      />
    </section>
  );
}

/**
 * The satin-pink backdrop from the Figma: a pink wash with soft light and
 * shadow folds. Drawn rather than exported so it stays sharp at any width;
 * it stretches with the card, which suits blurred folds.
 *
 * The filters measure their region in the drawing's own units. Left to the
 * default -- a margin around each shape -- a blur this wide is cut off in
 * straight lines where that margin ends.
 */
function SatinBackdrop() {
  const region = {
    filterUnits: 'userSpaceOnUse',
    x: -200,
    y: -200,
    width: 1600,
    height: 660,
  } as const;

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 1200 260"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 h-full w-full"
    >
      <defs>
        <linearGradient id="welcome-hero-wash" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#f8e6ef" />
          <stop offset="0.42" stopColor="#f3d5e3" />
          <stop offset="0.66" stopColor="#eec5d8" />
          <stop offset="1" stopColor="#f3d8e4" />
        </linearGradient>
        <filter id="welcome-hero-soft" {...region}>
          <feGaussianBlur stdDeviation="16" />
        </filter>
        <filter id="welcome-hero-softer" {...region}>
          <feGaussianBlur stdDeviation="28" />
        </filter>
        <filter id="welcome-hero-crisp" {...region}>
          <feGaussianBlur stdDeviation="7" />
        </filter>
      </defs>

      <rect width="1200" height="260" fill="url(#welcome-hero-wash)" />

      {/* Shadow folds: the deeper pink ahead of the illustration, and the bottom-left wave. */}
      <path
        d="M470 -20C540 60 560 150 470 290L780 290C750 180 710 80 650 -20Z"
        fill="#e3a9c3"
        opacity=".45"
        filter="url(#welcome-hero-softer)"
      />
      <path
        d="M-20 196C90 176 190 228 320 290L-20 290Z"
        fill="#e6b4ca"
        opacity=".55"
        filter="url(#welcome-hero-soft)"
      />

      {/* Light folds: the diagonal sheen through the middle, the top-right sweep, the lower-left edge. */}
      <g fill="none" stroke="#fff">
        <path d="M610 -30C590 90 560 170 520 300" strokeWidth="90" opacity=".4" filter="url(#welcome-hero-softer)" />
        <path d="M520 -30C470 60 400 160 300 300" strokeWidth="40" opacity=".8" filter="url(#welcome-hero-soft)" />
        <path d="M860 -40C930 60 1060 90 1240 40" strokeWidth="60" opacity=".5" filter="url(#welcome-hero-softer)" />
        <path d="M940 -30C1000 30 1100 50 1230 10" strokeWidth="22" opacity=".45" filter="url(#welcome-hero-crisp)" />
        <path d="M-30 214C80 190 190 232 290 300" strokeWidth="18" opacity=".6" filter="url(#welcome-hero-crisp)" />
      </g>
    </svg>
  );
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
