'use client';

import { useEffect, useRef, type ReactNode } from 'react';

import { CrossIcon } from '@/components/ui/icons';
import { StatusBadge, type StatusTone } from '@/components/ui/status-badge';

import type { AppointmentStatus } from '../types';

const STATUS: Record<AppointmentStatus, { label: string; tone: StatusTone }> = {
  requested: { label: 'Pending', tone: 'warning' },
  confirmed: { label: 'Confirmed', tone: 'success' },
  checked_in: { label: 'Checked in', tone: 'brand' },
  completed: { label: 'Completed', tone: 'neutral' },
  rescheduled: { label: 'Rescheduled', tone: 'neutral' },
  cancelled: { label: 'Cancelled', tone: 'danger' },
  declined: { label: 'Declined', tone: 'danger' },
  no_show: { label: 'No-show', tone: 'danger' },
};

export function AppointmentStatusBadge({ status }: { status: AppointmentStatus }) {
  const { label, tone } = STATUS[status];
  return <StatusBadge tone={tone}>{label}</StatusBadge>;
}

/**
 * A centred dialog over a dimmed page. Escape and the cross close it; focus
 * moves into it on open so a keyboard user is not left on the page behind.
 */
export function Dialog({
  title,
  subtitle,
  onClose,
  children,
  wide = false,
  icon,
}: {
  /** Shown above the title, as the Resume dialog does. */
  icon?: ReactNode;
  title: string;
  subtitle?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const panel = useRef<HTMLDivElement>(null);
  // The latest onClose, without re-running the effect: callers pass a new arrow
  // each render, and re-running would pull focus out of whatever is being typed in.
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    panel.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    // The scroller holds a min-full-height centring box, so a dialog taller than
    // the screen scrolls from its top rather than overflowing off the top edge.
    <div className="fixed inset-0 z-[60] overflow-y-auto">
      <div aria-hidden="true" className="fixed inset-0 bg-ink-900/50 backdrop-blur-sm" onClick={onClose} />
      {/* A click on the empty space around the panel closes it, as a click on the backdrop would. */}
      <div
        className="flex min-h-full items-center justify-center p-4"
        onClick={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        <div
          ref={panel}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          tabIndex={-1}
          className={`relative w-full rounded-card bg-[#fdf9fa] p-6 shadow-xl outline-none ${wide ? 'max-w-md' : 'max-w-sm'}`}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 rounded-full p-1 text-ink-500 transition-colors hover:bg-brand-50 hover:text-ink-900"
          >
            <CrossIcon className="h-4 w-4" />
          </button>
          {icon ? <div className="mb-3 flex justify-center">{icon}</div> : null}
          <h2 className="text-center text-xl font-bold text-ink-900">{title}</h2>
          {subtitle ? <p className="mt-1 text-center text-sm text-ink-500">{subtitle}</p> : null}
          <div className="mt-5">{children}</div>
        </div>
      </div>
    </div>
  );
}

/** "Just now", "5m ago", "3h ago", "2d ago". */
export function timeAgo(iso: string): string {
  const minutes = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}
