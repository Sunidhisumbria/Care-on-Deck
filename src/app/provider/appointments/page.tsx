import { Suspense } from 'react';

import { AccountHero } from '@/features/patient/components/account-hero';
import { AppointmentsScreen } from '@/features/practice/components/appointments-screen';

/** IA: 6. Appointments. `useSearchParams` inside needs a Suspense boundary. */
export default function ProviderAppointmentsPage() {
  return (
    <>
      <AccountHero title="Appointments" subtitle="View and manage all your past and upcoming appointments." />
      <div className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
        {/* Nothing while the route resolves; the screen shows the loader while it fetches. */}
        <Suspense fallback={null}>
          <AppointmentsScreen />
        </Suspense>
      </div>
    </>
  );
}
