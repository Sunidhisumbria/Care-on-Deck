'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import type { BookableProvider, VisitReason } from './placeholder-data';

/** The wizard's steps, in order. The URL carries the current one. */
export const BOOKING_STEPS = [
  'provider',
  'reason',
  'when',
  'details',
  'address',
  'insurance',
] as const;

export type BookingStep = (typeof BOOKING_STEPS)[number];

export interface BookingDraft {
  provider: BookableProvider | null;
  reason: VisitReason | null;
  date: string | null;
  time: string | null;
  details: { first_name: string; last_name: string; date_of_birth: string; gender: string; phone: string } | null;
  address: { line1: string; line2: string; city: string; state: string; postal_code: string } | null;
  insurance: { carrier: string; member_id: string; group_number: string } | null;
}

const EMPTY: BookingDraft = {
  provider: null, reason: null, date: null, time: null,
  details: null, address: null, insurance: null,
};

interface BookingContextValue {
  step: BookingStep;
  draft: BookingDraft;
  set: <K extends keyof BookingDraft>(key: K, value: BookingDraft[K]) => void;
  goTo: (step: BookingStep) => void;
  next: () => void;
  back: () => void;
  reset: () => void;
}

const BookingContext = createContext<BookingContextValue | null>(null);

/**
 * The wizard's state.
 *
 * The step lives in the URL and the answers live in React state, on purpose.
 * The step in the URL means the browser's Back button walks the flow instead
 * of leaving it, which is what people expect from a six-screen form. The
 * answers stay in memory because they are a half-finished booking containing a
 * date of birth and an insurance member ID -- that does not belong in a URL,
 * in history, or in a referrer header sent to a third party.
 *
 * The cost is that a refresh loses the draft. That is the right trade for this
 * data; if it needs to survive, it needs to be a server-side draft with an id,
 * not query parameters.
 */
export function BookingProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const params = useSearchParams();
  const [draft, setDraft] = useState<BookingDraft>(EMPTY);

  const requested = params.get('step');
  const step: BookingStep = isStep(requested) ? requested : 'provider';

  const goTo = useCallback(
    (target: BookingStep) => router.push(target === 'provider' ? '/book' : `/book?step=${target}`),
    [router],
  );

  const value = useMemo<BookingContextValue>(() => {
    const index = BOOKING_STEPS.indexOf(step);
    return {
      step,
      draft,
      set: (key, next) => setDraft((current) => ({ ...current, [key]: next })),
      goTo,
      next: () => goTo(BOOKING_STEPS[Math.min(index + 1, BOOKING_STEPS.length - 1)]!),
      back: () => goTo(BOOKING_STEPS[Math.max(index - 1, 0)]!),
      reset: () => setDraft(EMPTY),
    };
  }, [step, draft, goTo]);

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}

export function useBooking(): BookingContextValue {
  const value = useContext(BookingContext);
  if (!value) throw new Error('useBooking must be used inside <BookingProvider>.');
  return value;
}

function isStep(value: string | null): value is BookingStep {
  return BOOKING_STEPS.includes((value ?? '') as BookingStep);
}
