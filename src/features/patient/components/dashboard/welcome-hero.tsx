'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { SearchIcon } from '@/components/ui/icons';


/**
 * The greeting band, and the search that is the screen's primary action.
 *
 * The greeting is computed from the browser's clock rather than the server's.
 * It only renders once the session has resolved -- which happens on the client
 * anyway -- so there is no server pass to disagree with, and no "Good evening"
 * flashing to "Good morning" on hydration.
 */
export function WelcomeHero({ firstName }: { firstName: string }) {
  const router = useRouter();
  const [query, setQuery] = useState('');

  return (
    <section className="relative overflow-hidden rounded-card bg-gradient-to-br from-brand-300 via-brand-400 to-brand-600 px-6 py-8 text-white sm:px-10 sm:py-10">
      <Petals />

      <div className="relative max-w-xl">
        <p className="text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-white/85">
          Welcome back
        </p>
        <h1 className="mt-2 text-[1.75rem] font-extrabold tracking-tight sm:text-[2rem]">
          {greeting()}, {firstName} <span aria-hidden="true">👋</span>
        </h1>
        <p className="mt-2 max-w-md text-sm text-white/85">
          Manage your healthcare appointments and information in one place.
        </p>

        <form
          className="mt-6 flex items-center gap-2 rounded-field bg-white p-1.5 shadow-lg"
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
            placeholder="Condition, Provider, Practice…"
            aria-label="Search for care"
            className="min-w-0 flex-1 bg-transparent py-2 text-sm text-ink-900 outline-none placeholder:text-ink-300"
          />
          <button
            type="submit"
            className="shrink-0 rounded-[0.5rem] bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          >
            Find Care
          </button>
        </form>
      </div>
    </section>
  );
}

/** Decoration only. The approved design has an illustration here; this holds
 *  its space with something that reads as deliberate until the asset lands. */
function Petals() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -right-16 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute -bottom-28 right-24 h-64 w-64 rounded-full bg-brand-200/25 blur-3xl" />
      <svg
        viewBox="0 0 220 200"
        className="absolute -right-6 bottom-0 hidden h-full w-auto opacity-90 lg:block"
        fill="none"
      >
        <path d="M150 190c-30-14-52-42-52-76 0-36 28-66 64-70 20-2 38 6 50 20" stroke="rgba(255,255,255,.28)" strokeWidth="8" strokeLinecap="round" />
        <circle cx="168" cy="58" r="30" fill="rgba(255,255,255,.16)" />
        <rect x="108" y="96" width="74" height="62" rx="10" fill="rgba(255,255,255,.18)" />
        <path d="M120 118h50M120 132h34" stroke="rgba(255,255,255,.5)" strokeWidth="5" strokeLinecap="round" />
      </svg>
    </div>
  );
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
