'use client';

import type { ReactNode } from 'react';

/**
 * A two-or-more way choice, styled as the pill switch from the design.
 *
 * Radio semantics rather than tabs: picking one changes what the form
 * submits, not which panel is visible, and a screen reader should announce it
 * as a choice. Arrow keys work because the browser gives that to radios for
 * free -- which is the whole reason for using them.
 */
export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

export function Segmented<T extends string>({
  label,
  value,
  onChange,
  options,
  className = '',
}: {
  /** Announced as the group's name. Not shown. */
  label: string;
  value: T;
  onChange: (next: T) => void;
  options: ReadonlyArray<SegmentedOption<T>>;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`flex gap-1 rounded-field bg-brand-50 p-1 ${className}`}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={[
              'flex flex-1 items-center justify-center gap-2 rounded-[0.625rem] py-2.5',
              'text-[0.875rem] font-semibold transition-colors',
              active
                ? 'bg-white text-brand-700 shadow-sm'
                : 'text-ink-500 hover:text-ink-700',
            ].join(' ')}
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
