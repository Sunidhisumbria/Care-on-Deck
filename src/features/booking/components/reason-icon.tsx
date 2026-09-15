import type { VisitReason } from '../placeholder-data';

const s = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

/** One glyph per visit reason, so the list reads at a glance. */
export function ReasonIcon({ name, className = 'h-5 w-5' }: { name: VisitReason['icon']; className?: string }) {
  if (name === 'checkup') {
    return (
      <svg viewBox="0 0 20 20" className={className} aria-hidden="true" {...s}>
        <rect x="4" y="3.6" width="12" height="13.6" rx="2" />
        <path d="M7.6 3.6V2.4h4.8v1.2M7.6 9.4h4.8M7.6 12.6h3" />
      </svg>
    );
  }
  if (name === 'cold') {
    return (
      <svg viewBox="0 0 20 20" className={className} aria-hidden="true" {...s}>
        <path d="M10 2.6v14.8M4.6 5.6l10.8 8.8M15.4 5.6 4.6 14.4" />
      </svg>
    );
  }
  if (name === 'chronic') {
    return (
      <svg viewBox="0 0 20 20" className={className} aria-hidden="true" {...s}>
        <path d="M2.6 10h3.2l1.6-3.4 2.6 7 1.8-3.6h5.6" />
      </svg>
    );
  }
  if (name === 'skin') {
    return (
      <svg viewBox="0 0 20 20" className={className} aria-hidden="true" {...s}>
        <circle cx="10" cy="10" r="7.2" />
        <path d="M7.4 8.2v.1M12.4 7.6v.1M9 12.4v.1M12.8 11.6v.1" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden="true" {...s}>
      <circle cx="10" cy="10" r="7.2" />
      <path d="M8.1 8a2 2 0 1 1 2.6 1.9c-.5.2-.7.6-.7 1.1v.4M10 14v.1" />
    </svg>
  );
}
