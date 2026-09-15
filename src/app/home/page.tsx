import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { SiteFooter } from '@/components/marketing/site-footer';
import { SiteHeader } from '@/components/marketing/site-header';
import { PatientDashboard } from '@/features/patient/components/dashboard/patient-dashboard';
import { resolveSession } from '@/server/auth/session';

export const metadata: Metadata = { title: 'Your Home | CareOndeck' };

/**
 * The signed-in patient home screen.
 *
 * The session is resolved on the server so an anonymous visitor is redirected
 * before any of this renders, rather than seeing a dashboard skeleton resolve
 * into a login redirect.
 */
export default async function PatientHome() {
  const requestHeaders = await headers();
  const session = await resolveSession(
    new Request('http://careondeck.local/home', { headers: requestHeaders }),
  );
  if (!session) redirect('/login?role=patient');
  // A provider has no patient home; their next screen is their application.
  if (session.userType === 'provider') redirect('/onboarding');

  return (
    <div className="patient-account flex min-h-screen flex-col bg-canvas">
      <SiteHeader patientNavigation />
      <main className="flex-1">
        <PatientDashboard />
      </main>
      <SiteFooter />
    </div>
  );
}
