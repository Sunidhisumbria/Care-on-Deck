'use client';

import { z } from 'zod';

import { Field, PhoneField, SelectField } from '@/components/ui/field';
import { CalendarIcon, ChevronRight, GenderIcon, UserIcon } from '@/components/ui/icons';
import { isValidUsPhone, PHONE_RULE } from '@/lib/phone';
import { useApiForm } from '@/lib/forms/use-api-form';

import { useBooking } from '../booking-state';
import { ProviderSummary } from '../components/provider-summary';

/**
 * Step four: who the visit is for.
 *
 * Validated with the same `useApiForm` every other form on the site uses, so
 * the error placement, the field styling and the submit behaviour match --
 * and so the server's field errors will land in the right place unchanged
 * when `booking.requestAppointment` exists.
 */
const detailsSchema = z.object({
  first_name: z.string().trim().min(1, 'Enter your first name.').max(100),
  last_name: z.string().trim().min(1, 'Enter your last name.').max(100),
  date_of_birth: z
    .string()
    .min(1, 'Enter your date of birth.')
    .refine((value) => {
      const date = new Date(value);
      return !Number.isNaN(date.getTime()) && date <= new Date();
    }, 'That date is in the future.'),
  gender: z.string().min(1, 'Select an option.'),
  phone: z
    .string()
    .trim()
    .min(1, 'Enter a phone number we can reach you on.')
    .refine(isValidUsPhone, PHONE_RULE),
});

export function YourDetailsStep() {
  const { draft, set, next } = useBooking();
  const { register, formState, submit, error } = useApiForm(detailsSchema, {
    first_name: draft.details?.first_name ?? '',
    last_name: draft.details?.last_name ?? '',
    date_of_birth: draft.details?.date_of_birth ?? '',
    gender: draft.details?.gender ?? '',
    phone: draft.details?.phone ?? '',
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
            set('details', values);
            next();
          })}
          className="space-y-4"
        >
          <Field
            label="First Name"
            icon={<UserIcon />}
            placeholder="First name"
            autoComplete="given-name"
            error={error('first_name')}
            {...register('first_name')}
          />
          <Field
            label="Last Name"
            icon={<UserIcon />}
            placeholder="Last name"
            autoComplete="family-name"
            error={error('last_name')}
            {...register('last_name')}
          />
          <Field
            label="Date of Birth"
            icon={<CalendarIcon />}
            type="date"
            placeholder="Date of birth"
            autoComplete="bday"
            error={error('date_of_birth')}
            {...register('date_of_birth')}
          />
          <SelectField
            label="Gender"
            icon={<GenderIcon />}
            placeholder="Enter gender"
            options={[
              { value: 'female', label: 'Female' },
              { value: 'male', label: 'Male' },
              { value: 'other', label: 'Other' },
              { value: 'prefer_not_to_say', label: 'Prefer not to say' },
            ]}
            error={error('gender')}
            {...register('gender')}
          />
          <PhoneField
            label="Phone"
            error={error('phone')}
            {...register('phone')}
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
