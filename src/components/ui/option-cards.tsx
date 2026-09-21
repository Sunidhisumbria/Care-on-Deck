'use client';

import type { ReactNode } from 'react';

export interface OptionCard<T extends string> {
  value: T;
  title: string;
  caption?: string;
  icon?: ReactNode;
}

/**
 * One choice from a short list, drawn as cards: icon, title, caption, tick.
 *
 * The visit reason in booking and the provider type in onboarding are drawn
 * identically in the designs, so they share this.
 *
 * Built on real radio inputs rather than clickable divs, so arrow keys move
 * between options and a screen reader announces "3 of 5". The inputs are
 * visually hidden, which would also hide keyboard focus -- so each card draws
 * its own ring from the input's `:focus-visible`. The booking version this
 * replaces had no visible focus at all, which made it unusable from a keyboard.
 */
export function OptionCards<T extends string>({
  name,
  label,
  options,
  value,
  onChange,
  iconFrame = true,
}: {
  name: string;
  label: string;
  options: OptionCard<T>[];
  value: T | null;
  onChange: (next: T) => void;
  /** The tinted square behind each icon. Off for full-colour illustrations, which bring their own colour. */
  iconFrame?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="space-y-3">
      {options.map((option) => {
        const active = option.value === value;

        return (
          <label
            key={option.value}
            className={`flex cursor-pointer items-center gap-3.5 rounded-card border p-4 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-300 ${
              active ? 'border-brand-300 bg-brand-50/60' : 'border-line bg-white hover:border-brand-200'
            }`}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={active}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />

            {option.icon ? (
              <span
                aria-hidden="true"
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-field ${
                  !iconFrame ? '' : active ? 'bg-brand-100 text-brand-700' : 'bg-brand-50 text-brand-600'
                }`}
              >
                {option.icon}
              </span>
            ) : null}

            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-ink-900">{option.title}</span>
              {option.caption ? (
                <span className="mt-0.5 block text-xs text-ink-500">{option.caption}</span>
              ) : null}
            </span>

            <span
              aria-hidden="true"
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                active ? 'border-brand-600 bg-brand-600 text-white' : 'border-line'
              }`}
            >
              {active ? (
                <svg
                  viewBox="0 0 20 20"
                  className="h-3 w-3"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m5 10.4 3.4 3.4L15 7" />
                </svg>
              ) : null}
            </span>
          </label>
        );
      })}
    </div>
  );
}
