'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  BellIcon,
  ChatIcon,
  ClipboardIcon,
  DependentsIcon,
  LockIcon,
  LogoutIcon,
  PersonCardIcon,
  PhoneIcon,
  ShieldCheckIcon,
  StarOutlineIcon,
  TrendIcon,
} from '@/components/ui/icons';
import { Spinner } from '@/components/ui/spinner';

import { useNotifications } from '@/features/notifications/hooks';

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
  const practice = user.type === 'provider' || user.type === 'staff';
  return (
    <div className="flex items-center gap-3 sm:gap-5">
      <NotificationBell href={practice ? '/provider/notifications' : '/account/notifications'} />
      <AccountMenu user={user} />
    </div>
  );
}

/** The bell: opens Notifications, with the unread count from the list (refreshed each minute). */
function NotificationBell({ href }: { href: Route }) {
  const count = useNotifications().data?.unread ?? 0;
  return (
    <Link
      href={href}
      aria-label={count > 0 ? `Notifications, ${count} unread` : 'Notifications'}
      className="relative rounded-full p-1.5 text-ink-900 transition-colors hover:bg-brand-50"
    >
      <BellIcon className="h-6 w-6" />
      {count > 0 ? (
        <span className="absolute right-1 top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-brand-600 px-0.5 text-[0.5625rem] font-bold leading-none text-white ring-2 ring-[#fffdfd]">
          {count > 9 ? '9+' : count}
        </span>
      ) : null}
    </Link>
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
  // Providers and practice staff get the practice's menu; patients their own.
  // Sending a provider to the patient screens only ever ends in "no patient record".
  const practice = user.type === 'provider' || user.type === 'staff';

  return (
    <div ref={wrapper} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex h-10.5 items-center gap-2.5 rounded-lg border border-[#e6dfe3] bg-white px-4 text-[0.9375rem] font-semibold text-ink-900 transition-colors hover:border-brand-300"
      >
        <span className="max-w-[9rem] truncate">{name}</span>
        <svg
          viewBox="0 0 20 20"
          aria-hidden="true"
          className={`h-4 w-4 shrink-0 text-ink-900 transition-transform ${open ? 'rotate-180' : ''}`}
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
          {practice ? (
            <div className="py-1.5">
              <MenuItem href="/provider/profile" label="Personal information" icon={<PersonCardIcon />} />
              <MenuItem href="/provider/campaigns" label="Campaigns & Analytics" icon={<TrendIcon />} />
              <MenuItem href="/provider/notifications" label="Notification" icon={<ChatIcon />} />
              <MenuItem href="/provider/contact" label="Contact Us" icon={<PhoneIcon />} />
              <MenuItem href="/provider/password" label="Change password" icon={<LockIcon />} />
              <MenuItem href="/provider/reviews" label="Reviews" icon={<StarOutlineIcon />} />
              <MenuItem href="/provider/reports" label="Report" icon={<ClipboardIcon />} />
            </div>
          ) : (
            <>
              <div className="border-b border-line px-4 py-3">
                <p className="truncate text-sm font-semibold text-ink-900">{name}</p>
                <p className="truncate text-xs text-ink-500">{user.email ?? user.phone ?? ''}</p>
              </div>

              <MenuItem href="/account" label="Personal information" icon={<PersonCardIcon />} />
              <MenuItem href="/account/dependents" label="Dependents" icon={<DependentsIcon />} />
              <MenuItem href="/account/insurance" label="Insurance" icon={<ShieldCheckIcon />} />
              <MenuItem href="/account/contact" label="Contact Us" icon={<PhoneIcon />} />
              <MenuItem href="/account/password" label="Change password" icon={<LockIcon />} />
            </>
          )}

          <button
            type="button"
            role="menuitem"
            onClick={() => signOut.mutate()}
            disabled={signOut.isPending}
            className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-ink-700 transition-colors hover:bg-brand-50 hover:text-brand-700 disabled:opacity-60 ${
              practice ? '' : 'border-t border-line'
            }`}
          >
            {signOut.isPending ? (
              <Spinner className="h-[1.125rem] w-[1.125rem] text-brand-600" />
            ) : (
              <LogoutIcon className="h-[1.125rem] w-[1.125rem] text-ink-500" />
            )}
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
  href: Route;
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

/** The name they asked to be called, else their first name; otherwise something recognisable, never blank. */
function displayName(user: Account): string {
  if (user.preferred_name) return user.preferred_name;
  if (user.first_name) return user.first_name;
  if (user.email) return user.email.split('@')[0] ?? user.email;
  return user.phone ?? 'Account';
}
