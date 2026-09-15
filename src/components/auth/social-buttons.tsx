'use client';

import { isFirebaseConfigured } from '@/lib/public-env';

/**
 * "Continue with Google" / "Continue with Apple".
 *
 * Disabled until the Firebase web config is present, because without it the
 * browser cannot complete the provider handshake and the endpoint has no
 * token to verify. A button that looks live but fails is worse than one that
 * visibly is not ready -- and this way they switch on by themselves the day
 * NEXT_PUBLIC_FIREBASE_* is filled in, with no code change.
 */
export function SocialButtons() {
  const disabled = !isFirebaseConfigured();

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <SocialButton disabled={disabled} label="Continue with Google" icon={<GoogleMark />} />
      <SocialButton disabled={disabled} label="Continue with Apple" icon={<AppleMark />} />
    </div>
  );
}

function SocialButton({
  label,
  icon,
  disabled,
}: {
  label: string;
  icon: React.ReactNode;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      title={disabled ? 'Available once the provider is connected' : undefined}
      className="flex items-center justify-center gap-2.5 rounded-field border border-line bg-white px-4 py-3 text-[0.875rem] font-semibold text-ink-700 transition-colors hover:border-ink-300 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {icon}
      <span className="truncate">{label}</span>
    </button>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 18 18" className="h-[1.125rem] w-[1.125rem] shrink-0" aria-hidden="true">
      <path fill="#4285F4" d="M17.6 9.2c0-.6-.1-1.2-.2-1.8H9v3.4h4.8a4.1 4.1 0 0 1-1.8 2.7v2.2h2.9c1.7-1.6 2.7-3.9 2.7-6.5Z" />
      <path fill="#34A853" d="M9 18c2.4 0 4.5-.8 6-2.2l-2.9-2.2c-.8.5-1.8.9-3.1.9-2.4 0-4.4-1.6-5.1-3.8H.9v2.3A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.9 10.7a5.4 5.4 0 0 1 0-3.4V5H.9a9 9 0 0 0 0 8l3-2.3Z" />
      <path fill="#EA4335" d="M9 3.6c1.3 0 2.5.5 3.4 1.3l2.6-2.6A9 9 0 0 0 .9 5l3 2.3C4.6 5.2 6.6 3.6 9 3.6Z" />
    </svg>
  );
}

function AppleMark() {
  return (
    <svg viewBox="0 0 18 18" className="h-[1.125rem] w-[1.125rem] shrink-0" aria-hidden="true">
      <path
        fill="currentColor"
        d="M13.6 9.5c0-1.9 1.5-2.8 1.6-2.9-.9-1.3-2.2-1.4-2.7-1.5-1.2-.1-2.3.7-2.9.7-.6 0-1.5-.7-2.4-.7-1.3 0-2.4.7-3 1.8-1.3 2.2-.3 5.5 1 7.3.6.9 1.3 1.9 2.3 1.8.9 0 1.3-.6 2.4-.6s1.4.6 2.4.6c1 0 1.6-.9 2.2-1.8.7-1 1-2 1-2.1 0 0-1.9-.7-1.9-2.6ZM11.7 3.9c.5-.6.8-1.5.7-2.4-.7 0-1.6.5-2.1 1.1-.5.6-.9 1.4-.7 2.3.8 0 1.6-.4 2.1-1Z"
      />
    </svg>
  );
}
