'use client';

import { AccountHero } from '@/features/patient/components/account-hero';
import { EditProfileScreen } from '@/features/patient/components/edit-profile-screen';

/** IA: 3. Patient Account > Edit Profile. */
export default function EditProfilePage() {
  return (
    <>
      <AccountHero title="Edit Profile" subtitle="Update your information to keep your profile accurate and up to date." />

      <div className="mx-auto max-w-xl px-5 py-10 lg:py-12">
        <EditProfileScreen />
      </div>
    </>
  );
}
