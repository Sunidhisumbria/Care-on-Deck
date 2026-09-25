import { Suspense } from 'react';

import { AccountHero } from '@/features/patient/components/account-hero';
import { CampaignsScreen } from '@/features/pulse/components/campaigns-screen';

/** IA: 9. Pulse. `useSearchParams` inside needs a Suspense boundary. */
export default function CampaignsPage() {
  return (
    <>
      <AccountHero title="Campaigns & Analytics" subtitle="See how your campaigns turn into appointments." />
      <div className="mx-auto max-w-5xl px-5 py-8 lg:px-8">
        <Suspense fallback={null}>
          <CampaignsScreen />
        </Suspense>
      </div>
    </>
  );
}
