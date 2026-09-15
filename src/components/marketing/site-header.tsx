'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { Logo } from '@/components/brand/logo';
import { StethoscopeIcon, UserIcon } from '@/components/ui/icons';
import { UserMenu } from '@/features/auth/components/user-menu';
import { useCurrentUser } from '@/features/auth/hooks';

/**
 * The header, on every public screen.
 *
 * The right-hand side is the only part that knows whether anyone is signed in:
 * the notification bell and account menu when they are, Sign In / Sign Up when
 * they are not. Everything else -- and every screen underneath -- is the same
 * either way, which is why the home screen is the landing screen.
 *
 * Signed out, Sign In and Sign Up both open the same Doctor / Patient chooser.
 * The choice travels as `?role=`, and the server checks it against the account
 * before it means anything.
 */
export function SiteHeader({ patientNavigation = false }: { patientNavigation?: boolean }) {
  return (
    /*
      relative z-50 is load-bearing, not decoration. `backdrop-blur` makes this
      header its own stacking context, and at `z-index: auto` a positioned
      sibling later in the document -- AccountHero is `relative` -- paints over
      everything inside it, including the open account menu. The menu's own
      z-10 cannot help: it only orders things within this header.
    */
    <header className="relative z-50 border-b border-line bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-5 py-4 lg:px-8">
        <Link href="/" aria-label="CareOndeck home">
          <Logo />
        </Link>

        <div className="flex items-center gap-3 sm:gap-5">
          {patientNavigation && <PatientNav />}
          <Link
            href="/signup?role=doctor"
            className="hidden text-sm font-medium text-ink-700 transition-colors hover:text-brand-600 sm:block"
          >
            CareOndeck for Providers
          </Link>

          <AccountArea />
        </div>
      </div>
    </header>
  );
}

/**
 * The signed-in patient's navigation.
 *
 * Styled here rather than in a stylesheet, because this is the header's markup
 * and it renders on every patient screen. It used to live in dependents.css,
 * which only the dependents screen imports -- so anywhere else the links ran
 * together with no gap at all.
 *
 * The current section is marked with `aria-current`, and the styling hangs off
 * that rather than a parallel `className` condition, so the two cannot
 * disagree about which tab is active.
 */
function PatientNav() {
  const pathname = usePathname();

  const links = [
    { href: '/home', label: 'Home' },
    { href: '/appointments', label: 'Appointments' },
    { href: '/saved-providers', label: 'Saved Providers' },
  ] as const;

  return (
    <nav
      className="mr-2 hidden items-center gap-4 text-[0.6875rem] sm:flex lg:mr-4 lg:gap-8 lg:text-[0.8125rem] [&_[aria-current]]:font-semibold [&_[aria-current]]:text-brand-600"
      aria-label="Patient"
    >
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          aria-current={pathname === link.href ? 'page' : undefined}
          className="whitespace-nowrap text-ink-700 transition-colors hover:text-brand-600"
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}

/**
 * Whichever half of the header applies.
 *
 * Exported because the landing screen draws its own header markup and has to
 * render the same thing here. It used to hand-roll a bell and a `<details>`
 * menu of its own, which drifted: the account screens grew an avatar, a
 * different set of links and different wording, and the two headers stopped
 * looking like the same site. One component means they cannot drift again.
 *
 * While the session is still being resolved this renders a placeholder the
 * same width as the buttons, rather than Sign In / Sign Up -- otherwise every
 * signed-in visitor sees the signed-out header flash before it corrects
 * itself, which reads as being logged out.
 */
export function AccountArea() {
  const { user, isLoading } = useCurrentUser();

  if (isLoading) {
    return (
      <div aria-hidden="true" className="h-10 w-40 animate-pulse rounded-field bg-brand-50" />
    );
  }
  if (user) return <UserMenu user={user} />;

  return (
    <>
      <RoleMenu
        label="Sign In"
        tone="outline"
        doctorHref="/login?role=provider"
        patientHref="/login?role=patient"
      />
      <RoleMenu
        label="Sign Up"
        tone="solid"
        doctorHref="/signup?role=doctor"
        patientHref="/signup?role=patient"
      />
    </>
  );
}

/**
 * A button that drops open a Doctor / Patient choice.
 *
 * One component for both doors so the two menus cannot drift apart -- same
 * keyboard handling, same dismissal, same wording.
 */
export function RoleMenu({
  label,
  tone,
  doctorHref,
  patientHref,
  triggerClassName,
}: {
  label: string;
  tone: 'solid' | 'outline';
  doctorHref: Route;
  patientHref: Route;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);

  // Close on a click elsewhere or on Escape -- the two ways people expect to
  // dismiss a menu, and neither is free.
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

  return (
    <div ref={wrapper} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={triggerClassName ?? [
          'flex items-center gap-2 rounded-field px-5 py-2.5 text-sm font-semibold transition-colors',
          tone === 'solid'
            ? 'bg-brand-600 text-white hover:bg-brand-700'
            : 'border border-brand-200 text-ink-700 hover:border-brand-400 hover:text-brand-600',
        ].join(' ')}
      >
        {label}
        <svg
          viewBox="0 0 20 20"
          aria-hidden="true"
          className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
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
          aria-label={`${label} interface`}
          className="absolute right-0 z-10 mt-2 w-44 overflow-hidden rounded-field border border-line bg-white py-1.5 shadow-lg"
        >
          <MenuLink href={doctorHref} label="Doctor" icon={<StethoscopeIcon />} />
          <MenuLink href={patientHref} label="Patient" icon={<UserIcon />} />
        </div>
      ) : null}
    </div>
  );
}

function MenuLink({ href, label, icon }: { href: Route; label: string; icon: React.ReactNode }) {
  return (
    <Link
      href={href}
      role="menuitem"
      className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-ink-700 transition-colors hover:bg-brand-50 hover:text-brand-700"
    >
      <span className="text-ink-500">{icon}</span>
      {label}
    </Link>
  );
}
