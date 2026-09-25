'use client';

import type { ReactNode } from 'react';
import type { UseFormRegister } from 'react-hook-form';

import { Field, SelectField } from '@/components/ui/field';
import { CalendarIcon, GenderIcon, GlobeIcon, PinIcon } from '@/components/ui/icons';
import { GENDER_IDENTITIES, GENDERS, LANGUAGES } from '@/lib/patient-profile';
import { stateOptions } from '@/lib/us-states';

import type { EditProfileFormValues } from '../schemas/edit-profile.schema';

/**
 * The profile fields Create Profile and Edit Profile share, so the step after
 * signup and the screen that later changes its answers cannot drift apart.
 */
interface FieldsProps {
  register: UseFormRegister<EditProfileFormValues>;
  error: (name: keyof EditProfileFormValues) => string | undefined;
}

/** Date of birth, sex assigned at birth, language and (optional) gender identity -- the spec's "About You". */
export function PersonalFields({ register, error }: FieldsProps) {
  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Date of Birth"
          type="date"
          icon={<CalendarIcon />}
          max={new Date().toISOString().slice(0, 10)}
          error={error('date_of_birth')}
          {...register('date_of_birth')}
        />
        <SelectField
          label="Sex Assigned at Birth"
          placeholder="Male or Female"
          icon={<GenderIcon />}
          options={GENDERS.map((option) => ({ value: option.value, label: option.label }))}
          error={error('gender')}
          {...register('gender')}
        />
      </div>

      <SelectField
        label="Language"
        placeholder="Select a language"
        icon={<GlobeIcon />}
        options={LANGUAGES.map((language) => ({ value: language, label: language }))}
        error={error('language')}
        {...register('language')}
      />
      <SelectField
        label="Gender Identity (optional)"
        placeholder="Select an option"
        icon={<GenderIcon />}
        options={[{ value: '', label: 'Not given' }, ...GENDER_IDENTITIES.map((option) => ({ value: option.value, label: option.label }))]}
        error={error('gender_identity')}
        {...register('gender_identity')}
      />
    </>
  );
}

/** Street to ZIP. Optional as a whole; see the form schema's address rule. */
export function AddressFields({ register, error }: FieldsProps) {
  return (
    <Section title="Address Details">
      <Field
        label="Street Address"
        placeholder="Street address"
        icon={<PinIcon />}
        autoComplete="address-line1"
        error={error('line1')}
        {...register('line1')}
      />
      <Field
        label="Apartment"
        placeholder="Apartment, suite, unit (optional)"
        icon={<PinIcon />}
        autoComplete="address-line2"
        error={error('line2')}
        {...register('line2')}
      />
      <Field
        label="City"
        placeholder="City"
        icon={<PinIcon />}
        autoComplete="address-level2"
        error={error('city')}
        {...register('city')}
      />
      <SelectField
        label="State"
        placeholder="State"
        icon={<GlobeIcon />}
        options={stateOptions()}
        error={error('state')}
        {...register('state')}
      />
      <Field
        label="ZIP Code"
        placeholder="ZIP code"
        inputMode="numeric"
        autoComplete="postal-code"
        error={error('postal_code')}
        {...register('postal_code')}
      />
    </Section>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-5 pt-2">
      <h2 className="text-lg font-bold text-ink-900">{title}</h2>
      {children}
    </section>
  );
}
