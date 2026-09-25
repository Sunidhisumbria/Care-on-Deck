import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { BookingFlow } from '@/features/booking/booking-flow';
import { resolveSession } from '@/server/auth/session';

export const metadata: Metadata = { title: 'Book Appointment | CareOndeck' };

/**
 * IA: 2. Booking Flow.
 *
 * The session is checked on the server so an anonymous visitor never sees the
 * first step. `useSearchParams` inside needs a Suspense boundary.
 */
export default async function BookPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const requestHeaders = await headers();
  const session = await resolveSession(
    new Request('http://careondeck.local/book', { headers: requestHeaders }),
  );
  if (!session) {
    // Come back here after signing in -- a campaign link's ?provider= included.
    const provider = (await searchParams).provider;
    const back = typeof provider === 'string' ? `/book?provider=${encodeURIComponent(provider)}` : '/book';
    redirect(`/login?role=patient&next=${encodeURIComponent(back)}`);
  }

  return (
    <Suspense
      fallback={null}
    >
      <BookingFlow />
    </Suspense>
  );
}
