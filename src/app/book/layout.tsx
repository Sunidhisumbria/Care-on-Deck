import type { ReactNode } from 'react';

import { SiteFooter } from '@/components/marketing/site-footer';
import { SiteHeader } from '@/components/marketing/site-header';

/** Same chrome as the rest of the patient interface. */
export default function BookLayout({ children }: { children: ReactNode }) {
  return (
    <div className="patient-account flex min-h-screen flex-col bg-canvas">
      <SiteHeader patientNavigation />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
