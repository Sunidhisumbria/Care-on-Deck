import type { ButtonHTMLAttributes } from 'react';
import { Spinner } from '@/components/ui/spinner';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Full width by default, as the designs draw most buttons. */
  wide?: boolean;
  /** Working: shows the spinner before the label and stops a second press. */
  pending?: boolean;
};

const BASE =
  'flex items-center justify-center gap-1.5 rounded-field py-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60';

export function PrimaryButton({ wide = true, pending = false, className = '', children, ...button }: ButtonProps) {
  return (
    <button
      type="button"
      {...button}
      disabled={pending || button.disabled}
      aria-busy={pending || undefined}
      className={`${BASE} ${wide ? 'w-full' : 'px-6'} bg-brand-600 text-white hover:bg-brand-700 ${className}`}
    >
      {pending ? <Spinner className="h-4 w-4" /> : null}
      {children}
    </button>
  );
}

export function SecondaryButton({ wide = true, pending = false, className = '', children, ...button }: ButtonProps) {
  return (
    <button
      type="button"
      {...button}
      disabled={pending || button.disabled}
      aria-busy={pending || undefined}
      className={`${BASE} ${wide ? 'w-full' : 'px-6'} border border-brand-600 bg-white text-brand-600 hover:bg-brand-50 ${className}`}
    >
      {pending ? <Spinner className="h-4 w-4" /> : null}
      {children}
    </button>
  );
}
