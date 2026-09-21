'use client';

import { useState, type ReactNode } from 'react';

import { ChevronRight } from '@/components/ui/icons';
import { OptionCards, type OptionCard } from '@/components/ui/option-cards';

import { PrimaryButton } from './buttons';

/**
 * A heading, a short list of cards, and Continue. Every choice in the
 * insurance flow is this: how to pay, which type of insurance, how to enter it.
 *
 * Nothing is pre-selected. Each choice decides something about the patient's
 * bill or record, and a default someone clicks straight through is an answer
 * they never gave.
 */
export function ChoiceStep<T extends string>({
  title,
  subtitle,
  name,
  options,
  value,
  onChange,
  onContinue,
  footer,
  iconFrame,
}: {
  title: string;
  subtitle: string;
  name: string;
  options: OptionCard<T>[];
  value: T | null;
  onChange: (next: T) => void;
  onContinue: (value: T) => void;
  footer?: ReactNode;
  /** Off when the options use full-colour illustrations. */
  iconFrame?: boolean;
}) {
  const [missing, setMissing] = useState(false);

  return (
    <div>
      <h2 className="text-base font-bold text-ink-900">{title}</h2>
      <p className="mt-1 text-xs text-ink-500">{subtitle}</p>

      <div className="mt-4">
        <OptionCards
          name={name}
          label={title}
          options={options}
          iconFrame={iconFrame}
          value={value}
          onChange={(next) => {
            setMissing(false);
            onChange(next);
          }}
        />
      </div>

      {missing ? (
        <p role="alert" className="mt-2 text-xs text-red-600">
          Choose an option to continue.
        </p>
      ) : null}

      {footer}

      <PrimaryButton className="mt-4" onClick={() => (value ? onContinue(value) : setMissing(true))}>
        Continue
        <ChevronRight className="h-4 w-4" />
      </PrimaryButton>
    </div>
  );
}
