'use client';

import { ChangePasswordForm } from '@/features/auth/components/change-password-form';
import { AccountHero } from '@/features/patient/components/account-hero';

/**
 * IA: 3. Patient Account > Change Password.
 *
 * The patient interface's frame around the shared form. Everything that is
 * actually about changing a password lives in `ChangePasswordForm`, so when
 * the provider interface grows the same screen it renders that component
 * inside its own shell rather than copying anything from here.
 */
export default function ChangePasswordPage() {
  return (
    <>
      <AccountHero title="Change Password" subtitle="Update the password you use to sign in." />

      <div className="mx-auto max-w-lg px-5 py-10 lg:py-12">
        <div className="rounded-card border border-line bg-white p-6 sm:p-8">
          <ChangePasswordForm />
        </div>
      </div>
    </>
  );
}
