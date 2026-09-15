'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { DependentsIcon, LockIcon, LogoutIcon, PersonCardIcon } from '@/components/ui/icons';

import { useSignOut } from '../hooks/use-sign-out';
import type { CurrentUser } from '../types';

type Account = NonNullable<CurrentUser['user']>;

/**
 * The signed-in half of the header: notifications, and who you are.
 *
 * Replaces Sign In / Sign Up once a session resolves. Everything else on the
 * page stays exactly the same -- the home screen is the landing screen.
 */
export function UserMenu({ user }: { user: Account }) {
  return (
    <div className="flex items-center gap-3 sm:gap-4">
      <NotificationBell />
      <AccountMenu user={user} />
    </div>
  );
}

/**
 * The bell.
 *
 * No unread count yet: `GET /api/v1/notifications` still answers 501, and a
 * badge showing an invented number is worse than no badge. When that endpoint
 * lands, `count` comes from it and the dot below turns itself on.
 */
function NotificationBell({ count = 0 }: { count?: number }) {
  return (
    <button
      type="button"
      aria-label={count > 0 ? `Notifications, ${count} unread` : 'Notifications'}
      className="relative rounded-full p-2 text-brand-600 transition-colors hover:bg-brand-50"
    >
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M18 8a6 6 0 1 0-12 0c0 4.5-1.5 6-1.5 6h15S18 12.5 18 8Z" />
        <path d="M10.3 18a2 2 0 0 0 3.4 0" />
      </svg>
      {count > 0 ? (
        <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[0.625rem] font-bold text-white">
          {count > 9 ? '9+' : count}
        </span>
      ) : null}
    </button>
  );
}

function AccountMenu({ user }: { user: Account }) {
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const signOut = useSignOut();

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const name = displayName(user);

  return (
    <div ref={wrapper} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-field border border-brand-200 py-1.5 pl-1.5 pr-3 text-sm font-semibold text-ink-700 transition-colors hover:border-brand-400"
      >
        <Avatar name={name} url={user.avatar_url} className="h-7 w-7 text-xs" />
        <span className="max-w-[9rem] truncate">{name}</span>
        <svg
          viewBox="0 0 20 20"
          aria-hidden="true"
          className={`h-4 w-4 shrink-0 text-ink-500 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 8 4 4 4-4" />
        </svg>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-10 mt-2 w-60 overflow-hidden rounded-field border border-line bg-white shadow-lg"
        >
          <div className="border-b border-line px-4 py-3">
            <p className="truncate text-sm font-semibold text-ink-900">{name}</p>
            <p className="truncate text-xs text-ink-500">{user.email ?? user.phone ?? ''}</p>
          </div>

          <MenuItem href="/account" label="Personal information" icon={<PersonCardIcon />} />
          <MenuItem href="/account/dependents" label="Dependents" icon={<DependentsIcon />} />
          <MenuItem href="/account/password" label="Change password" icon={<LockIcon />} />

          <button
            type="button"
            role="menuitem"
            onClick={() => signOut.mutate()}
            disabled={signOut.isPending}
            className="flex w-full items-center gap-3 border-t border-line px-4 py-3 text-left text-sm font-medium text-ink-700 transition-colors hover:bg-brand-50 hover:text-brand-700 disabled:opacity-60"
          >
            <LogoutIcon className="h-[1.125rem] w-[1.125rem] text-ink-500" />
            {signOut.isPending ? 'Signing out…' : 'Logout'}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function MenuItem({
  href,
  label,
  icon,
}: {
  href: '/account' | '/account/dependents' | '/account/password';
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-ink-700 transition-colors hover:bg-brand-50 hover:text-brand-700"
    >
      <span className="text-ink-500">{icon}</span>
      {label}
    </Link>
  );
}

/** First name if we have one; otherwise something recognisable, never blank. */
function displayName(user: Account): string {
  if (user.first_name) return user.first_name;
  if (user.email) return user.email.split('@')[0] ?? user.email;
  return user.phone ?? 'Account';
}
