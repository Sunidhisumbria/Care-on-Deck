'use client';

import {
  useEffect,
  useId,
  useRef,
  useState,
  type FocusEvent,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { localPhoneDigits, PHONE_LOCAL_MAX } from '@/lib/phone';

import { LockIcon, UsFlagIcon } from './icons';
import { SelectMenu } from './select-menu';
import { Busy } from './spinner';

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

/**
 * A select whose list is drawn by the app rather than by the operating system.
 *
 * The real `<select>` is still here, hidden. It is what react-hook-form
 * registers, what `reset()` writes to, and what a plain form submit reads --
 * so nothing calling this had to change. Picking a row writes the value back
 * to it and fires its change event, which is exactly what the browser would
 * have done, and the form cannot tell the difference.
 *
 * The visible control is `SelectMenu`, because an open `<select>` is painted
 * by the OS and ignores every style on this page.
 */
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
  const labelId = `${id}-label`;
  const { onChange, defaultValue, value: given, disabled, ...rest } = select;

  const node = useRef<HTMLSelectElement | null>(null);
  const [value, setValue] = useState(String(given ?? defaultValue ?? ''));

  /*
   * react-hook-form writes straight to the DOM node on reset() and setValue(),
   * and neither fires an event. Reading the node back after each render is
   * what keeps the button's label from drifting away from the form's value.
   */
  // Deliberately every render: the DOM node can change without this component's
  // state changing, which is the case being caught. The check stops it looping.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const current = node.current?.value ?? '';
    if (current !== value) setValue(current);
  });

  function choose(next: string) {
    const element = node.current;
    if (!element) return;

    element.value = next;
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }

  return (
    <div className={className}>
      <span id={labelId} className={labelClass()}>
        {label}
      </span>
      <div className={shellClass(Boolean(error))}>
        {icon ? <span className="shrink-0 text-ink-300">{icon}</span> : null}

        <select
          {...rest}
          id={id}
          ref={(element) => {
            node.current = element;
            const forwarded = (select as { ref?: unknown }).ref;
            if (typeof forwarded === 'function') forwarded(element);
            else if (forwarded && typeof forwarded === 'object') {
              (forwarded as { current: HTMLSelectElement | null }).current = element;
            }
          }}
          defaultValue={String(given ?? defaultValue ?? '')}
          disabled={disabled}
          onChange={(event) => {
            setValue(event.target.value);
            onChange?.(event);
          }}
          /*
           * A form that focuses its first invalid field would otherwise send
           * focus into a control nobody can see. Hand it to the button that
           * replaced it instead.
           */
          onFocus={(event) => {
            const trigger = event.currentTarget.parentElement?.querySelector<HTMLButtonElement>(
              'button[role="combobox"]',
            );
            trigger?.focus();
          }}
          tabIndex={-1}
          aria-hidden
          className="sr-only"
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

        <SelectMenu
          options={options}
          value={value}
          onSelect={choose}
          placeholder={placeholder}
          disabled={disabled}
          invalid={Boolean(error)}
          labelledBy={labelId}
          describedBy={error ? errorId : undefined}
          triggerClassName="text-[0.9375rem]"
        />
      </div>
      <ErrorText id={errorId}>{error}</ErrorText>
    </div>
  );
}

interface PhoneFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  error?: string;
  hint?: string;
}

/**
 * A US phone number: the flag and +1 are fixed, and the person types the rest.
 *
 * The visible box holds only the digits after +1 -- 8 to 14 of them, see
 * lib/phone. Typing or pasting anything else is reduced to digits, so
 * "(503) 555-0142" and "+1 503 555 0142" both land as 5035550142.
 *
 * A hidden input carries the whole number, "+1" and all. That is what
 * react-hook-form registers and submits, so forms and the server receive the
 * same "+15035550142" they always did, and nothing downstream changed.
 */
export function PhoneField({
  label,
  error,
  hint,
  className = '',
  placeholder = 'Enter phone number',
  ...input
}: PhoneFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const { onChange, onBlur, name, defaultValue, value: given, disabled, ...others } = input;
  const { ref: forwarded, ...rest } = others as typeof others & { ref?: unknown };

  const hidden = useRef<HTMLInputElement | null>(null);
  const visible = useRef<HTMLInputElement | null>(null);
  const [local, setLocal] = useState(localPhoneDigits(String(given ?? defaultValue ?? '')));

  /*
   * react-hook-form writes straight to the hidden input on reset() and when it
   * applies default values, and neither fires an event. Reading it back after
   * each render keeps the box in step -- except while someone is typing in it.
   */
  // Deliberately every render; the comparison stops it looping.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (typeof document !== 'undefined' && document.activeElement === visible.current) return;
    const digits = localPhoneDigits(hidden.current?.value ?? '');
    if (digits !== local) setLocal(digits);
  });

  function type(raw: string) {
    const trimmed = raw.trim();
    // A pasted "+1 503 555 0142" keeps its +1 out of the local part.
    const digits = (trimmed.startsWith('+1') ? trimmed.slice(2) : trimmed)
      .replace(/\D/g, '')
      .slice(0, PHONE_LOCAL_MAX);
    setLocal(digits);

    const element = hidden.current;
    if (!element) return;
    // Through the native setter, so React notices the change and the form hears it.
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(
      element,
      digits ? `+1${digits}` : '',
    );
    element.dispatchEvent(new Event('input', { bubbles: true }));
  }

  return (
    <div className={className}>
      <label htmlFor={id} className={labelClass()}>
        {label}
      </label>
      <div className={shellClass(Boolean(error))}>
        <span className="flex shrink-0 items-center gap-2 border-r border-line pr-3 text-[0.9375rem] font-semibold text-ink-700">
          <UsFlagIcon className="h-[14px] w-5 shrink-0 rounded-[3px] shadow-[0_0_0_1px_rgba(28,17,25,0.08)]" />
          +1
        </span>
        <input
          {...rest}
          ref={visible}
          id={id}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          placeholder={placeholder}
          disabled={disabled}
          value={local}
          onChange={(event) => type(event.target.value)}
          onBlur={() => {
            // The form tracks "touched" by the registered input, which is the hidden one.
            if (hidden.current) {
              onBlur?.({ target: hidden.current, type: 'blur' } as unknown as FocusEvent<HTMLInputElement>);
            }
          }}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          className="w-full bg-transparent text-[0.9375rem] text-ink-900 outline-none placeholder:text-ink-300"
        />
        <input
          ref={(element) => {
            hidden.current = element;
            if (typeof forwarded === 'function') forwarded(element);
            else if (forwarded && typeof forwarded === 'object') {
              (forwarded as { current: HTMLInputElement | null }).current = element;
            }
          }}
          name={name}
          defaultValue={String(given ?? defaultValue ?? '')}
          disabled={disabled}
          onChange={onChange}
          // A form that focuses its first invalid field lands on the box people can see.
          onFocus={() => visible.current?.focus()}
          tabIndex={-1}
          aria-hidden
          className="sr-only"
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

export function SubmitButton({ children, pending }: { children: ReactNode; pending?: boolean }) {
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending || undefined}
      className="w-full rounded-field bg-brand-600 py-3.5 text-[0.9375rem] font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? <Busy>Please wait…</Busy> : children}
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

function EyeIcon({ crossed }: { crossed: boolean }) {
  return (
    <svg viewBox="0 0 20 20" className="h-[1.125rem] w-[1.125rem]" {...stroke}>
      <path d="M1.8 10S4.9 4.8 10 4.8 18.2 10 18.2 10 15.1 15.2 10 15.2 1.8 10 1.8 10Z" />
      <circle cx="10" cy="10" r="2.3" />
      {crossed ? <path d="M3.5 16.5 16.5 3.5" /> : null}
    </svg>
  );
}
