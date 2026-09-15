'use client';

/**
 * An on/off switch, as the Schedule design draws them.
 *
 * A real checkbox underneath with `role="switch"`, so it is focusable, toggled
 * with Space, and announced as "on" or "off" -- a styled div would be none of
 * those without re-implementing them.
 */
export function Toggle({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  /** Read by assistive technology; not shown, because the row already says what this switches. */
  label: string;
  disabled?: boolean;
}) {
  return (
    <label className="relative inline-flex shrink-0 cursor-pointer items-center">
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        aria-label={label}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className="h-6 w-11 rounded-full bg-line transition-colors peer-checked:bg-emerald-500 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-300 peer-disabled:opacity-50"
      />
      <span
        aria-hidden="true"
        className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5"
      />
    </label>
  );
}
