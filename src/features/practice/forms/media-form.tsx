'use client';

import { useState } from 'react';

import { Field, SubmitButton, TextAreaField } from '@/components/ui/field';
import { DocumentUpload } from '@/features/uploads/components/document-upload';
import { PhotoUpload } from '@/features/uploads/components/photo-upload';
import type { UploadedFile } from '@/features/uploads/types';
import { useApiForm } from '@/lib/forms/use-api-form';
import { profileSchema, type ProfileValues } from '@/lib/profile';

/**
 * Bio, years of experience and up to two certificates -- plus the headshot
 * when `headshot` is given. Onboarding's Upload Profile step asks for the
 * photo here; Personal Information saves it on its own, from Personal Details.
 */
export function MediaForm({
  bio,
  yearsExperience,
  certificates: initialCertificates,
  headshot,
  submitLabel,
  onSubmit,
}: {
  bio: string;
  yearsExperience: number | undefined;
  certificates: UploadedFile[];
  headshot?: { name: string; value: UploadedFile | null };
  submitLabel: string;
  onSubmit: (values: ProfileValues) => Promise<unknown>;
}) {
  const [photo, setPhoto] = useState<UploadedFile | null>(headshot?.value ?? null);
  const [certificates, setCertificates] = useState<Array<UploadedFile | null>>([
    initialCertificates[0] ?? null,
    initialCertificates[1] ?? null,
  ]);

  const { register, setValue, formState, submit, error } = useApiForm(profileSchema, {
    headshot_media_id: headshot?.value?.media_id ?? null,
    bio,
    years_experience: yearsExperience,
    certificate_media_ids: initialCertificates.map((certificate) => certificate.media_id),
  });

  function onHeadshot(file: UploadedFile | null) {
    setPhoto(file);
    setValue('headshot_media_id', file?.media_id ?? null, { shouldDirty: true });
  }

  function onCertificate(slot: number, file: UploadedFile | null) {
    const next = certificates.map((existing, index) => (index === slot ? file : existing));
    setCertificates(next);
    setValue(
      'certificate_media_ids',
      next.filter((entry): entry is UploadedFile => entry !== null).map((entry) => entry.media_id),
      { shouldDirty: true },
    );
  }

  return (
    // Validation has passed by the time this runs, so the values are the schema's full output.
    <form noValidate onSubmit={submit((values) => onSubmit(values as ProfileValues))} className="space-y-4">
      {headshot ? (
        <PhotoUpload name={headshot.name} value={photo} onChange={onHeadshot} error={error('headshot_media_id')} />
      ) : null}

      <TextAreaField
        label="Bio"
        placeholder="Enter bio"
        rows={4}
        hint="What patients should know about you and how you practise."
        error={error('bio')}
        {...register('bio')}
      />

      <Field
        label="Years of Experience"
        type="number"
        inputMode="numeric"
        min={0}
        max={70}
        placeholder="Enter years of experience"
        error={error('years_experience')}
        {...register('years_experience')}
      />

      <div>
        <p className="mb-1.5 text-[0.8125rem] font-semibold text-ink-700">
          Certificates <span className="font-normal text-ink-500">(optional)</span>
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {[0, 1].map((slot) => (
            <DocumentUpload
              key={slot}
              purpose="certificate"
              value={certificates[slot] ?? null}
              onChange={(file) => onCertificate(slot, file)}
            />
          ))}
        </div>
        {error('certificate_media_ids') ? (
          <p className="mt-2 text-xs text-red-600">{error('certificate_media_ids')}</p>
        ) : null}
      </div>

      <SubmitButton pending={formState.isSubmitting}>{submitLabel}</SubmitButton>
    </form>
  );
}
