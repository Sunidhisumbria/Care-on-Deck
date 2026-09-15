'use client';

import { useRouter } from 'next/navigation';

import { Field, SelectField, SubmitButton } from '@/components/ui/field';
import { MailIcon, PhoneIcon, PinIcon } from '@/components/ui/icons';
import { useApiForm } from '@/lib/forms/use-api-form';
import type { NpiLookupAnswer } from '@/lib/npi';
import { OFFICE_TYPES, formatUsPhone, practiceSchema, type PracticeValues } from '@/lib/practice';
import { isUsStateCode, stateOptions } from '@/lib/us-states';

import { useSaveStep } from '../hooks';
import type { OnboardingSession } from '../types';

interface SavedPractice {
  name: string;
  office_type: PracticeValues['office_type'];
  phone: string;
  email: string;
  website: string | null;
  address: { line1: string; line2: string | null; city: string; state: PracticeValues['state']; postal_code: string };
}

/**
 * IA: 4. Provider Onboarding > Practice Setup.
 *
 * Creates a new practice. Joining an existing practice is not built yet -- it
 * needs someone at that practice to approve the request, which is still an open
 * question -- so every applicant here sets up their own.
 *
 * The phone and address are pre-filled from the NPI record's practice location
 * and left editable, because registry addresses are often out of date. The
 * address section is an addition to the design: the marketplace searches by
 * location, so a practice needs one to be found at all.
 */
export function PracticeStep({ session }: { session: OnboardingSession }) {
  const router = useRouter();
  const save = useSaveStep(session.id);

  const saved = session.draft.practice_setup as SavedPractice | undefined;
  const location = (session.draft.npi_lookup as NpiLookupAnswer | undefined)?.profile?.practice_location ?? null;
  const registryState = isUsStateCode(location?.state) ? (location.state.toUpperCase() as PracticeValues['state']) : undefined;
  const prefilled = !saved && Boolean(location);

  const { register, formState, submit, error } = useApiForm(practiceSchema, {
    name: saved?.name ?? '',
    office_type: saved?.office_type,
    phone: saved ? formatUsPhone(saved.phone) : (location?.phone ?? ''),
    email: saved?.email ?? '',
    website: saved?.website ?? '',
    address_line1: saved?.address.line1 ?? location?.line1 ?? '',
    address_line2: saved?.address.line2 ?? location?.line2 ?? '',
    city: saved?.address.city ?? location?.city ?? '',
    state: saved?.address.state ?? registryState,
    postal_code: saved?.address.postal_code ?? location?.postal_code ?? '',
  });

  return (
    <>
      <h1 className="text-xl font-extrabold text-ink-900">Your Practice</h1>
      <p className="mt-1 text-sm text-ink-500">Tell patients where to find you.</p>

      <form
        noValidate
        onSubmit={submit(async (values) => {
          await save.mutateAsync({ step: 'practice_setup', data: values });
          router.push('/onboarding');
        })}
        className="mt-6 space-y-4"
      >
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
        <Field
          label="Practice Phone"
          type="tel"
          icon={<PhoneIcon />}
          placeholder="Enter phone number"
          autoComplete="tel"
          error={error('phone')}
          {...register('phone')}
        />
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
          <p className="mt-0.5 text-xs text-ink-500">
            {prefilled
              ? 'From your NPI record. Correct it if your practice has moved.'
              : 'Where patients come to see you.'}
          </p>
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

        <SubmitButton pending={formState.isSubmitting}>Continue</SubmitButton>
      </form>
    </>
  );
}
