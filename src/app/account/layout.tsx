import type { ReactNode } from 'react';

import { SiteFooter } from '@/components/marketing/site-footer';
import { SiteHeader } from '@/components/marketing/site-header';

/**
 * The signed-in account screens sit on the same chrome as the public site --
 * same header, same footer. Only the middle changes.
 */
export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <div className="patient-account flex min-h-screen flex-col bg-canvas">
      <SiteHeader patientNavigation />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
