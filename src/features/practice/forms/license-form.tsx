'use client';

import { useState, type ReactNode } from 'react';

import { Field, SelectField, SubmitButton } from '@/components/ui/field';
import { DocumentUpload } from '@/features/uploads/components/document-upload';
import type { UploadedFile } from '@/features/uploads/types';
import { useApiForm } from '@/lib/forms/use-api-form';
import { licenseMatchesRegistry, licenseSchema, type LicenseValues } from '@/lib/license';
import { stateOptions } from '@/lib/us-states';

type Registry = Parameters<typeof licenseMatchesRegistry>[1];

/**
 * State, number, expiry and the uploaded license. Shared by onboarding's
 * License step and Personal Information > Documents License. When the NPI
 * record lists a license, a number that differs from it is allowed and
 * explained, not refused.
 */
export function LicenseForm({
  defaultValues,
  document: initialDocument,
  registry = null,
  notice,
  submitLabel,
  onSubmit,
}: {
  defaultValues: Partial<LicenseValues>;
  document: UploadedFile | null;
  registry?: Registry;
  /** Shown above the fields, e.g. that the license goes back to review. */
  notice?: ReactNode;
  submitLabel: string;
  onSubmit: (values: LicenseValues) => Promise<unknown>;
}) {
  const [document, setDocument] = useState<UploadedFile | null>(initialDocument);
  const { register, formState, submit, error, watch, setValue } = useApiForm(licenseSchema, {
    ...defaultValues,
    document_media_id: initialDocument?.media_id ?? null,
  });

  const [state, licenseNumber] = watch(['state', 'license_number']);
  const differsFromRecord =
    Boolean(registry && state && licenseNumber) &&
    licenseMatchesRegistry({ state: state ?? '', license_number: licenseNumber ?? '' }, registry) === false;

  function onDocument(file: UploadedFile | null) {
    setDocument(file);
    setValue('document_media_id', file?.media_id ?? null, { shouldDirty: true });
  }

  return (
    <form noValidate onSubmit={submit(onSubmit)} className="space-y-4">
      {notice}

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
          This differs from the license on your NPI record ({registry.license}, {registry.state}). That&rsquo;s
          fine if your record is out of date &mdash; our team checks every license with the state board during
          review.
        </p>
      ) : null}

      <DocumentUpload purpose="license_document" value={document} onChange={onDocument} error={error('document_media_id')} />

      <SubmitButton pending={formState.isSubmitting}>{submitLabel}</SubmitButton>
    </form>
  );
}
