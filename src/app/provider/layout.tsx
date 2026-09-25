import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { SiteFooter } from '@/components/marketing/site-footer';
import { SiteHeader } from '@/components/marketing/site-header';
import { resolveSession } from '@/server/auth/session';

export const metadata: Metadata = { title: 'Practice | CareOndeck' };

/**
 * The practice's side of the app: dashboard and appointments.
 *
 * The session is checked on the server, so a signed-out visitor goes to
 * sign-in and a patient to their own home before anything renders. What a
 * member may do inside is the API's decision, by their practice permissions.
 */
export default async function ProviderLayout({ children }: { children: ReactNode }) {
  const requestHeaders = await headers();
  const session = await resolveSession(new Request('http://careondeck.local/provider', { headers: requestHeaders }));
  if (!session) redirect('/login?role=provider');
  if (session.userType === 'patient') redirect('/home');

  return (
    <div className="patient-account flex min-h-screen flex-col bg-canvas">
      <SiteHeader providerNavigation />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
