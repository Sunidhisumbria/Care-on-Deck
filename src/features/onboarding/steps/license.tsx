'use client';

import { useState } from 'react';

import { Field, SelectField, SubmitButton } from '@/components/ui/field';
import { DocumentUpload } from '@/features/uploads/components/document-upload';
import type { UploadedFile } from '@/features/uploads/types';
import { useApiForm } from '@/lib/forms/use-api-form';
import { licenseMatchesRegistry, licenseSchema, type LicenseValues } from '@/lib/license';
import type { NpiLookupAnswer } from '@/lib/npi';
import { isUsStateCode, stateOptions } from '@/lib/us-states';
import { pushSamePage } from '@/lib/same-page-navigation';

import { useSaveStep } from '../hooks';
import type { OnboardingSession } from '../types';

type SavedLicense = Partial<LicenseValues> & { document?: UploadedFile | null };

/**
 * IA: 4. Provider Onboarding > License Verification.
 *
 * Pre-filled from the NPI record when it has a license, and left editable. The
 * registry's license field is typed in by the provider and often lags a renewal
 * or a move, so it is a starting point to confirm, not a fact to lock.
 *
 * A number that differs from the record is allowed. The applicant is told as
 * they type, and the server records the mismatch for the reviewer, who checks
 * the license against the state board either way.
 */
export function LicenseStep({ session }: { session: OnboardingSession }) {
  const save = useSaveStep(session.id);

  const saved = session.draft.license_verification as SavedLicense | undefined;
  const registry = (session.draft.npi_lookup as NpiLookupAnswer | undefined)?.profile?.primary_taxonomy ?? null;
  const registryState = isUsStateCode(registry?.state) ? (registry.state!.toUpperCase() as LicenseValues['state']) : undefined;
  const prefilled = !saved && Boolean(registry?.license);

  const [document, setDocument] = useState<UploadedFile | null>(saved?.document ?? null);

  const { register, formState, submit, error, watch, setValue } = useApiForm(licenseSchema, {
    state: saved?.state ?? registryState,
    license_number: saved?.license_number ?? registry?.license ?? '',
    expires_on: saved?.expires_on ?? '',
    document_media_id: saved?.document?.media_id ?? null,
  });

  const [state, licenseNumber] = watch(['state', 'license_number']);
  const differsFromRecord =
    Boolean(state && licenseNumber) &&
    licenseMatchesRegistry({ state: state ?? '', license_number: licenseNumber ?? '' }, registry) === false;

  function onDocument(file: UploadedFile | null) {
    setDocument(file);
    setValue('document_media_id', file?.media_id ?? null, { shouldDirty: true });
  }

  return (
    <>
      <h1 className="text-xl font-extrabold text-ink-900">License Verification</h1>
      <p className="mt-1 text-sm text-ink-500">
        Provide your state medical license information for verification.
      </p>

      {prefilled ? (
        <p className="mt-4 rounded-field bg-brand-50 px-3.5 py-2.5 text-[0.8125rem] text-ink-700">
          We filled this in from your NPI record. Check it against your license and correct anything
          that is out of date.
        </p>
      ) : null}

      <form
        noValidate
        onSubmit={submit(async (values) => {
          await save.mutateAsync({ step: 'license_verification', data: values });
          pushSamePage('/onboarding');
        })}
        className="mt-6 space-y-4"
      >
        <SelectField
          label="State"
          placeholder="Select state"
          options={stateOptions()}
          error={error('state')}
          {...register('state')}
        />

        <Field
          label="License Number"
          placeholder="Exactly as it appears on your license"
          autoComplete="off"
          error={error('license_number')}
          {...register('license_number')}
        />

        <Field
          label="Expiry Date"
          type="date"
          min={new Date().toISOString().slice(0, 10)}
          error={error('expires_on')}
          {...register('expires_on')}
        />

        {differsFromRecord && registry ? (
          <p className="rounded-field bg-amber-50 px-3.5 py-2.5 text-[0.8125rem] text-amber-900">
            This differs from the license on your NPI record ({registry.license}, {registry.state}).
            That&rsquo;s fine if your record is out of date &mdash; our team checks every license
            with the state board during review.
          </p>
        ) : null}

        <DocumentUpload
          purpose="license_document"
          value={document}
          onChange={onDocument}
          error={error('document_media_id')}
        />

        <SubmitButton pending={formState.isSubmitting}>Continue</SubmitButton>
      </form>
    </>
  );
}
