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
export default async function BookPage() {
  const requestHeaders = await headers();
  const session = await resolveSession(
    new Request('http://careondeck.local/book', { headers: requestHeaders }),
  );
  if (!session) redirect('/login?role=patient');

  return (
    <Suspense fallback={<div aria-hidden="true" className="h-screen animate-pulse bg-brand-50/40" />}>
      <BookingFlow />
    </Suspense>
  );
}
