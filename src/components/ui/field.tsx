'use client';

import {
  useId,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { LockIcon } from './icons';

/**
 * Form controls for the auth screens.
 *
 * Each one owns its own label, icon and error slot, so a screen is a list of
 * fields rather than a pile of divs. `error` takes the message the API sent
 * back for that field, which is why the shape matches `details[].path`.
 */

function labelClass() {
  return 'mb-1.5 block text-[0.8125rem] font-semibold text-ink-700';
}

function shellClass(hasError: boolean) {
  return [
    'field-shell flex items-center gap-2.5 rounded-field border bg-white px-3.5 py-3',
    'transition-[color,background-color,border-color,box-shadow]',
    'focus-within:ring-4',
    hasError
      ? 'border-red-400 focus-within:ring-red-100'
      : 'border-line focus-within:border-brand-500 focus-within:ring-brand-100',
  ].join(' ');
}

/**
 * A date input carries its own calendar button, which would sit next to ours.
 * Stretching that button over the whole field and hiding it keeps one icon
 * and makes a tap anywhere open the picker. The empty value also renders as
 * `mm/dd/yyyy` in full contrast, so it is greyed to read as a placeholder.
 */
const DATE_INPUT = [
  '[&::-webkit-calendar-picker-indicator]:absolute',
  '[&::-webkit-calendar-picker-indicator]:inset-0',
  '[&::-webkit-calendar-picker-indicator]:h-full',
  '[&::-webkit-calendar-picker-indicator]:w-full',
  '[&::-webkit-calendar-picker-indicator]:cursor-pointer',
  '[&::-webkit-calendar-picker-indicator]:opacity-0',
  '[&:not(:valid)]:text-ink-300',
].join(' ');

function ErrorText({ id, children }: { id: string; children?: string }) {
  if (!children) return null;
  return (
    <p id={id} className="mt-1.5 text-xs text-red-600">
      {children}
    </p>
  );
}

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: ReactNode;
  error?: string;
  /**
   * What the field expects, shown under it. Replaced by `error` when there is
   * one -- two lines saying different things about the same input is noise,
   * and the error is the more urgent of the two.
   */
  hint?: string;
  /** Rendered inside the field on the right -- the eye toggle, the locate pin. */
  trailing?: ReactNode;
}

export function Field({ label, icon, error, hint, trailing, className = '', ...input }: FieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  return (
    <div className={className}>
      <label htmlFor={id} className={labelClass()}>
        {label}
      </label>
      <div className={`relative ${shellClass(Boolean(error))}`}>
        {icon ? <span className="shrink-0 text-ink-300">{icon}</span> : null}
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          className={[
            'w-full bg-transparent text-[0.9375rem] text-ink-900 outline-none placeholder:text-ink-300',
            input.type === 'date' ? DATE_INPUT : '',
          ].join(' ')}
          {...input}
        />
        {trailing}
      </div>
      {error ? (
        <ErrorText id={errorId}>{error}</ErrorText>
      ) : hint ? (
        <p id={hintId} className="mt-1.5 text-xs text-ink-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  hint?: string;
}

export function TextAreaField({ label, error, hint, className = '', rows = 4, ...textarea }: TextAreaFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  return (
    <div className={className}>
      <label htmlFor={id} className={labelClass()}>
        {label}
      </label>
      <div className={shellClass(Boolean(error))}>
        <textarea
          id={id}
          rows={rows}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          className="w-full resize-y bg-transparent text-[0.9375rem] text-ink-900 outline-none placeholder:text-ink-300"
          {...textarea}
        />
      </div>
      {error ? (
        <ErrorText id={errorId}>{error}</ErrorText>
      ) : hint ? (
        <p id={hintId} className="mt-1.5 text-xs text-ink-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** What every new password on the site has to satisfy. */
export const PASSWORD_HINT =
  'At least 8 characters, including a capital letter and a special character.';

/** A password field with the show/hide eye from the design. */
export function PasswordField({ label, error, hint, className = '', ...input }: FieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <Field
      {...input}
      label={label}
      error={error}
      hint={hint}
      className={className}
      type={visible ? 'text' : 'password'}
      icon={<LockIcon />}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="shrink-0 rounded p-0.5 text-ink-300 transition-colors hover:text-ink-500"
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          <EyeIcon crossed={visible} />
        </button>
      }
    />
  );
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  icon?: ReactNode;
  error?: string;
  placeholder: string;
  options: Array<{ value: string; label: string }>;
}

export function SelectField({
  label,
  icon,
  error,
  placeholder,
  options,
  className = '',
  ...select
}: SelectFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div className={className}>
      <label htmlFor={id} className={labelClass()}>
        {label}
      </label>
      <div className={shellClass(Boolean(error))}>
        {icon ? <span className="shrink-0 text-ink-300">{icon}</span> : null}
        <select
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          defaultValue=""
          className="w-full appearance-none bg-transparent text-[0.9375rem] text-ink-900 outline-none [&:invalid]:text-ink-300"
          required
          {...select}
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronIcon />
      </div>
      <ErrorText id={errorId}>{error}</ErrorText>
    </div>
  );
}

export function SubmitButton({ children, pending }: { children: ReactNode; pending?: boolean }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-field bg-brand-600 py-3.5 text-[0.9375rem] font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? 'Please wait…' : children}
    </button>
  );
}

/** The API's top-level error, shown above the form. */
export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-field border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700"
    >
      {message}
    </p>
  );
}

// --- icons -----------------------------------------------------------------
// The shared line icons live in ./icons. This chevron stays because it is part of
// the select's own chrome, not something a caller chooses.

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

function ChevronIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0 text-ink-500" {...stroke}>
      <path d="m6 8 4 4 4-4" />
    </svg>
  );
}

function EyeIcon({ crossed }: { crossed: boolean }) {
  return (
    <svg viewBox="0 0 20 20" className="h-[1.125rem] w-[1.125rem]" {...stroke}>
      <path d="M1.8 10S4.9 4.8 10 4.8 18.2 10 18.2 10 15.1 15.2 10 15.2 1.8 10 1.8 10Z" />
      <circle cx="10" cy="10" r="2.3" />
      {crossed ? <path d="M3.5 16.5 16.5 3.5" /> : null}
    </svg>
  );
}
