'use client';

import { z } from 'zod';

import { Field, SelectField } from '@/components/ui/field';
import { ChevronRight, PinIcon } from '@/components/ui/icons';
import { useApiForm } from '@/lib/forms/use-api-form';
import { stateOptions } from '@/lib/us-states';

import { useBooking } from '../booking-state';
import { ProviderSummary } from '../components/provider-summary';

const addressSchema = z.object({
  line1: z.string().trim().min(1, 'Enter your street address.').max(200),
  line2: z.string().trim().max(200).optional().or(z.literal('')),
  city: z.string().trim().min(1, 'Enter your city.').max(120),
  state: z.string().trim().min(1, 'Select your state.'),
  postal_code: z
    .string()
    .trim()
    .regex(/^\d{5}(-\d{4})?$/, 'Enter a 5-digit ZIP code.'),
});

/** Step five: where they are, used to rank nearby locations. */
export function YourAddressStep() {
  const { draft, set, next } = useBooking();
  const { register, formState, submit, error } = useApiForm(addressSchema, {
    line1: draft.address?.line1 ?? '',
    line2: draft.address?.line2 ?? '',
    city: draft.address?.city ?? '',
    state: draft.address?.state ?? '',
    postal_code: draft.address?.postal_code ?? '',
  });

  if (!draft.provider) return null;

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 lg:px-8">
      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <ProviderSummary
          provider={draft.provider}
          reason={draft.reason}
          onEditReason={() => history.back()}
        />

        <form
          noValidate
          onSubmit={submit(async (values) => {
            set('address', { ...values, line2: values.line2 ?? '' });
            next();
          })}
          className="space-y-4"
        >
          <Field
            label="Street Address"
            icon={<PinIcon />}
            placeholder="123 main street"
            autoComplete="address-line1"
            error={error('line1')}
            {...register('line1')}
          />
          <Field
            label="Apartment / Suite (optional)"
            icon={<PinIcon />}
            placeholder="Apt 4B8"
            autoComplete="address-line2"
            error={error('line2')}
            {...register('line2')}
          />
          <Field
            label="City"
            icon={<PinIcon />}
            placeholder="New York"
            autoComplete="address-level2"
            error={error('city')}
            {...register('city')}
          />
          <SelectField
            label="State"
            icon={<PinIcon />}
            placeholder="State"
            options={stateOptions()}
            error={error('state')}
            {...register('state')}
          />
          <Field
            label="ZIP Code"
            icon={<PinIcon />}
            inputMode="numeric"
            placeholder="10001"
            autoComplete="postal-code"
            error={error('postal_code')}
            {...register('postal_code')}
          />

          <button
            type="submit"
            disabled={formState.isSubmitting}
            className="flex w-full items-center justify-center gap-1.5 rounded-field bg-brand-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
          >
            Continue
            <ChevronRight className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
