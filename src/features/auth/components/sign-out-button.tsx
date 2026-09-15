'use client';

import { useSignOut } from '../hooks/use-sign-out';

/**
 * Sign out, as a bare button.
 *
 * Carries no styling of its own so each interface can dress it in its own
 * header -- the landing screen's hand-written CSS, a Tailwind header, whatever
 * comes next. What it does own is the part that is easy to get wrong and
 * annoying to debug twice: disabling itself mid-request so a second click
 * cannot fire a second sign-out, and saying so while it waits.
 */
export function SignOutButton({
  className,
  label = 'Log out',
}: {
  className?: string;
  label?: string;
}) {
  const signOut = useSignOut();

  return (
    <button
      type="button"
      onClick={() => signOut.mutate()}
      disabled={signOut.isPending}
      className={className}
    >
      {signOut.isPending ? 'Signing out…' : label}
    </button>
  );
}
