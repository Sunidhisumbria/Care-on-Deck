'use client';

import { z } from 'zod';

import { Field, PhoneField, SelectField } from '@/components/ui/field';
import { CalendarIcon, ChevronRight, GenderIcon, UserIcon } from '@/components/ui/icons';
import { isValidUsPhone, PHONE_RULE } from '@/lib/phone';
import { LoadingPanel } from '@/components/ui/spinner';
import { usePatientProfile } from '@/features/patient/hooks';
import type { PatientProfile } from '@/features/patient/types';
import { GENDERS } from '@/lib/patient-profile';
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
  gender: z.enum(['male', 'female'], { errorMap: () => ({ message: 'Select your sex assigned at birth.' }) }),
  phone: z
    .string()
    .trim()
    .min(1, 'Enter a phone number we can reach you on.')
    .refine(isValidUsPhone, PHONE_RULE),
});

/**
 * Starts from this booking's answers, else the profile -- so a patient who
 * completed Create Profile only confirms, and one who skipped it fills in
 * what is missing, once. Date of birth and gender are saved with the booking.
 */
export function YourDetailsStep() {
  const { draft } = useBooking();
  const profile = usePatientProfile();

  if (!draft.details && profile.isPending) return <LoadingPanel label="Loading your details…" rows={4} />;

  return <DetailsForm profile={profile.data ?? null} />;
}

function DetailsForm({ profile }: { profile: PatientProfile | null }) {
  const { draft, set, next } = useBooking();
  const { register, formState, submit, error } = useApiForm(detailsSchema, {
    first_name: draft.details?.first_name ?? profile?.first_name ?? '',
    last_name: draft.details?.last_name ?? profile?.last_name ?? '',
    date_of_birth: draft.details?.date_of_birth ?? profile?.date_of_birth ?? '',
    gender: (draft.details?.gender ?? (profile?.gender === 'male' || profile?.gender === 'female' ? profile.gender : '')) as 'male',
    phone: draft.details?.phone ?? profile?.phone ?? '',
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
            label="Sex Assigned at Birth"
            icon={<GenderIcon />}
            placeholder="Male or Female"
            // The same field and values as the profile: the server takes these two only.
            options={GENDERS.map((option) => ({ value: option.value, label: option.label }))}
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
