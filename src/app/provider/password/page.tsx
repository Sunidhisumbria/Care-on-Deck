'use client';

import { ChangePasswordForm } from '@/features/auth/components/change-password-form';
import { AccountHero } from '@/features/patient/components/account-hero';

/** IA: 6. Account Menu > Change Password. The same form patients use, in the practice's frame. */
export default function ProviderChangePasswordPage() {
  return (
    <>
      <AccountHero title="Change Password" subtitle="Update your password to keep your account secure." />
      <div className="mx-auto max-w-lg px-5 py-10 lg:py-12">
        <ChangePasswordForm />
      </div>
    </>
  );
}
