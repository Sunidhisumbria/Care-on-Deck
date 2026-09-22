import type { ReactNode } from 'react';

export type StatusTone = 'success' | 'warning' | 'danger' | 'brand' | 'neutral';

const TONES: Record<StatusTone, string> = {
  success: 'bg-emerald-50 text-emerald-700',
  warning: 'bg-amber-50 text-amber-700',
  danger: 'bg-red-50 text-red-700',
  brand: 'bg-brand-50 text-brand-700',
  neutral: 'bg-line text-ink-700',
};

/**
 * A small status pill: "Confirmed", "Due", "Under review".
 *
 * The label is always text, never colour alone, so the state reads the same
 * without colour vision. The insurance handoff calls that out explicitly; it
 * applies to every status on the site.
 */
export function StatusBadge({
  tone = 'neutral',
  icon,
  children,
}: {
  tone?: StatusTone;
  /** A small glyph before the label, as the dashboard's Due / Completed pills have. */
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[0.6875rem] font-bold ${TONES[tone]}`}
    >
      {icon}
      {children}
    </span>
  );
}
