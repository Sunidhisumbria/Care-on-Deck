import type { ReactNode } from 'react';

import { Logo } from '@/components/brand/logo';
import { SignOutButton } from '@/features/auth/components/sign-out-button';

/**
 * Onboarding has its own chrome. The designs show the logo and the stepper and
 * nothing else -- no marketing navigation to wander off through halfway
 * through an application.
 *
 * Sign out is the one addition. Stopping and coming back later is the normal
 * way through seven steps that need an NPI and a license document to hand, and
 * that needs a way out.
 */
export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas">
      <header className="relative mx-auto flex max-w-4xl items-center justify-center px-5 pb-8 pt-8">
        <Logo className="w-44" />
        <SignOutButton className="absolute right-5 top-1/2 -translate-y-1/2 text-sm font-medium text-ink-500 transition-colors hover:text-brand-600" />
      </header>
      <main>{children}</main>
    </div>
  );
}
