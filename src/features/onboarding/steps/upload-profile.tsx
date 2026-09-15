'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Field, SubmitButton, TextAreaField } from '@/components/ui/field';
import { useCurrentUser } from '@/features/auth/hooks';
import { DocumentUpload } from '@/features/uploads/components/document-upload';
import { PhotoUpload } from '@/features/uploads/components/photo-upload';
import type { UploadedFile } from '@/features/uploads/types';
import { useApiForm } from '@/lib/forms/use-api-form';
import type { NpiLookupAnswer } from '@/lib/npi';
import { profileSchema } from '@/lib/profile';

import { useSaveStep } from '../hooks';
import type { OnboardingSession } from '../types';

interface SavedProfile {
  headshot: UploadedFile | null;
  bio: string;
  years_experience: number;
  certificates: UploadedFile[];
}

/**
 * IA: 4. Provider Onboarding > Photo Uploads.
 *
 * Years of Experience lives here and only here. The Create Account design asked
 * for it too; it is profile information, and asking twice invites two different
 * answers.
 */
export function UploadProfileStep({ session }: { session: OnboardingSession }) {
  const router = useRouter();
  const save = useSaveStep(session.id);
  const { user } = useCurrentUser();

  const saved = session.draft.photo_uploads as SavedProfile | undefined;
  const record = (session.draft.npi_lookup as NpiLookupAnswer | undefined)?.profile;
  const name =
    [record?.first_name ?? user?.first_name, record?.last_name ?? user?.last_name].filter(Boolean).join(' ') ||
    'Provider';

  const [headshot, setHeadshot] = useState<UploadedFile | null>(saved?.headshot ?? null);
  const [certificates, setCertificates] = useState<Array<UploadedFile | null>>([
    saved?.certificates[0] ?? null,
    saved?.certificates[1] ?? null,
  ]);

  const { register, setValue, formState, submit, error } = useApiForm(profileSchema, {
    headshot_media_id: saved?.headshot?.media_id ?? null,
    bio: saved?.bio ?? '',
    years_experience: saved?.years_experience,
    certificate_media_ids: saved?.certificates.map((certificate) => certificate.media_id) ?? [],
  });

  function onHeadshot(file: UploadedFile | null) {
    setHeadshot(file);
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
    <>
      <h1 className="text-xl font-extrabold text-ink-900">Profile Photo</h1>
      <p className="mt-1 text-sm text-ink-500">Upload a professional headshot to complete your profile.</p>

      <form
        noValidate
        onSubmit={submit(async (values) => {
          await save.mutateAsync({ step: 'photo_uploads', data: values });
          router.push('/onboarding');
        })}
        className="mt-6 space-y-4"
      >
        <PhotoUpload name={name} value={headshot} onChange={onHeadshot} error={error('headshot_media_id')} />

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

        <SubmitButton pending={formState.isSubmitting}>Continue</SubmitButton>
      </form>
    </>
  );
}
