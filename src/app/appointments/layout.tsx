import type { ReactNode } from 'react';

import { SiteFooter } from '@/components/marketing/site-footer';
import { SiteHeader } from '@/components/marketing/site-header';

/** Same chrome as the account screens. */
export default function AppointmentsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="patient-account flex min-h-screen flex-col bg-canvas">
      <SiteHeader patientNavigation />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
