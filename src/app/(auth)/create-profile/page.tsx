import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { Logo } from '@/components/brand/logo';
import { CreateProfileScreen } from '@/features/patient/components/create-profile-screen';
import { resolveSession } from '@/server/auth/session';

export const metadata: Metadata = { title: 'Create Your Profile | CareOndeck' };

/**
 * IA: 2. Account Creation > Create Profile -- signup's second step, reached
 * once the account is verified. Patients only: a provider's next screen is
 * their application.
 */
export default async function CreateProfilePage() {
  const requestHeaders = await headers();
  const session = await resolveSession(
    new Request('http://careondeck.local/create-profile', { headers: requestHeaders }),
  );
  if (!session) redirect('/login?role=patient');
  if (session.userType === 'provider') redirect('/onboarding');

  return (
    <div>
      <Logo />

      <h1 className="mt-8 text-[1.75rem] font-extrabold tracking-tight text-ink-900">Create Your Profile</h1>
      <p className="mt-2 text-sm text-ink-500">
        A few details so practices can register your visits. You can skip this and add them later.
      </p>

      <CreateProfileScreen />
    </div>
  );
}
