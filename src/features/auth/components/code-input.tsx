'use client';

import { forwardRef, useState, type InputHTMLAttributes } from 'react';

/**
 * Six boxes that behave like one input.
 *
 * A single real input holds the value and is laid invisibly over the boxes,
 * so paste, autofill and the browser's SMS one-time-code suggestion all work
 * -- the boxes are only how it looks. `forwardRef` so react-hook-form's
 * `register` can reach the input it is actually managing.
 */
interface CodeInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  value: string;
  error?: string;
}

export const CodeInput = forwardRef<HTMLInputElement, CodeInputProps>(function CodeInput(
  { label = 'Verification Code', value, error, ...input },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const active = Math.min(value.length, 5);

  return (
    <div>
      <label htmlFor="otp-code" className="mb-1.5 block text-[0.8125rem] font-semibold text-ink-700">
        {label}
      </label>

      {/* The input covers the boxes, so a tap anywhere on them focuses it. */}
      <div className="relative">
        <input
          id="otp-code"
          ref={ref}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          aria-label={label}
          aria-invalid={error ? true : undefined}
          className="absolute inset-0 h-full w-full opacity-0"
          {...input}
          onFocus={(event) => {
            setFocused(true);
            input.onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            input.onBlur?.(event);
          }}
        />
        <div aria-hidden="true" className="grid grid-cols-6 gap-2">
          {Array.from({ length: 6 }, (_, index) => (
            <span
              key={index}
              className={[
                'flex h-14 items-center justify-center rounded-field border bg-white text-xl font-bold text-ink-900',
                error ? 'border-red-400' : focused && index === active ? 'border-brand-500' : 'border-line',
              ].join(' ')}
            >
              {value[index] ?? ''}
            </span>
          ))}
        </div>
      </div>

      {error ? <p className="mt-1.5 text-xs text-red-600">{error}</p> : null}
    </div>
  );
});
