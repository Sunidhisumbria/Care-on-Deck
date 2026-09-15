import type { Route } from 'next';
import Link from 'next/link';

import { Logo } from '@/components/brand/logo';

/** A dead-end screen: says what happened and offers the one way forward. */
export function AuthMessage({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action: { href: Route; label: string };
}) {
  return (
    <div>
      <Logo />
      <h1 className="mt-8 text-[1.75rem] font-extrabold tracking-tight text-ink-900">{title}</h1>
      <p className="mt-2 text-sm text-ink-500">{body}</p>
      <Link
        href={action.href}
        className="mt-6 block w-full rounded-field bg-brand-600 py-3.5 text-center text-[0.9375rem] font-semibold text-white transition-colors hover:bg-brand-700"
      >
        {action.label}
      </Link>
    </div>
  );
}
