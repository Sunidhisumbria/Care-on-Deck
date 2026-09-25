import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { OnboardingFlow } from '@/features/onboarding/onboarding-flow';
import { resolveSession } from '@/server/auth/session';

export const metadata: Metadata = { title: 'Provider Onboarding | CareOndeck' };

/**
 * IA: 4. Provider Onboarding.
 *
 * Checked on the server so nobody sees a stepper resolve into a redirect: a
 * visitor goes to provider sign-in, and a patient goes home, before any of the
 * flow renders. `useSearchParams` inside the flow needs the Suspense boundary.
 */
export default async function OnboardingPage() {
  const requestHeaders = await headers();
  const session = await resolveSession(
    new Request('http://careondeck.local/onboarding', { headers: requestHeaders }),
  );

  if (!session) redirect('/login?role=provider');
  if (session.userType !== 'provider') redirect('/home');

  return (
    <Suspense fallback={null}>
      <OnboardingFlow />
    </Suspense>
  );
}
