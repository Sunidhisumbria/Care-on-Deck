'use client';

import type { DefaultValues } from 'react-hook-form';

import { Field, PhoneField, SelectField, SubmitButton } from '@/components/ui/field';
import { MailIcon, PinIcon } from '@/components/ui/icons';
import { useApiForm } from '@/lib/forms/use-api-form';
import { OFFICE_TYPES, practiceSchema, type PracticeValues } from '@/lib/practice';
import { stateOptions } from '@/lib/us-states';

/**
 * The practice's details and address. Shared by onboarding's Your Practice
 * step and Personal Information > Practice Details, so the two validate the
 * same way. The caller decides what submitting does.
 */
export function PracticeForm({
  defaultValues,
  addressNote,
  submitLabel,
  onSubmit,
}: {
  defaultValues: DefaultValues<PracticeValues>;
  /** Under "Practice address": where it came from, or what it is for. */
  addressNote: string;
  submitLabel: string;
  onSubmit: (values: PracticeValues) => Promise<unknown>;
}) {
  const { register, formState, submit, error } = useApiForm(practiceSchema, defaultValues);

  return (
    // Validation has passed by the time this runs, so the values are the schema's full output.
    <form noValidate onSubmit={submit((values) => onSubmit(values as PracticeValues))} className="space-y-4">
      <Field
        label="Practice Name"
        placeholder="Enter practice name"
        autoComplete="organization"
        error={error('name')}
        {...register('name')}
      />
      <SelectField
        label="Practice Type"
        placeholder="Select Type"
        options={OFFICE_TYPES.map((type) => ({ value: type.value, label: type.label }))}
        error={error('office_type')}
        {...register('office_type')}
      />
      <PhoneField label="Practice Phone" error={error('phone')} {...register('phone')} />
      <Field
        label="Practice Email"
        type="email"
        icon={<MailIcon />}
        placeholder="Enter practice email"
        autoComplete="email"
        error={error('email')}
        {...register('email')}
      />
      <Field
        label="Website (optional)"
        placeholder="https://"
        autoComplete="url"
        error={error('website')}
        {...register('website')}
      />

      <div className="border-t border-line pt-5">
        <p className="text-sm font-bold text-ink-900">Practice address</p>
        <p className="mt-0.5 text-xs text-ink-500">{addressNote}</p>
      </div>

      <Field
        label="Street Address"
        icon={<PinIcon />}
        placeholder="123 Main Street"
        autoComplete="address-line1"
        error={error('address_line1')}
        {...register('address_line1')}
      />
      <Field
        label="Suite (optional)"
        placeholder="Suite 200"
        autoComplete="address-line2"
        error={error('address_line2')}
        {...register('address_line2')}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="City" autoComplete="address-level2" error={error('city')} {...register('city')} />
        <Field
          label="ZIP Code"
          inputMode="numeric"
          autoComplete="postal-code"
          error={error('postal_code')}
          {...register('postal_code')}
        />
      </div>
      <SelectField
        label="State"
        placeholder="Select state"
        options={stateOptions()}
        error={error('state')}
        {...register('state')}
      />

      <SubmitButton pending={formState.isSubmitting}>{submitLabel}</SubmitButton>
    </form>
  );
}
