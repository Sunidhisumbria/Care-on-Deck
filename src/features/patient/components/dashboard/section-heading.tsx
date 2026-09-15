import type { ReactNode } from 'react';

/** The icon-plus-title-plus-caption heading the lower sections share. */
export function SectionHeading({
  icon,
  title,
  caption,
}: {
  icon: ReactNode;
  title: string;
  caption: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-field bg-brand-50 text-brand-600">
        {icon}
      </span>
      <div>
        <h2 className="text-lg font-bold text-ink-900 sm:text-xl">{title}</h2>
        <p className="text-xs text-ink-500">{caption}</p>
      </div>
    </div>
  );
}
