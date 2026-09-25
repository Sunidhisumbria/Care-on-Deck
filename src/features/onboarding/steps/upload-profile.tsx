'use client';

import { useCurrentUser } from '@/features/auth/hooks';
import { MediaForm } from '@/features/practice/forms/media-form';
import type { UploadedFile } from '@/features/uploads/types';
import type { NpiLookupAnswer } from '@/lib/npi';
import { pushSamePage } from '@/lib/same-page-navigation';

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
  const save = useSaveStep(session.id);
  const { user } = useCurrentUser();

  const saved = session.draft.photo_uploads as SavedProfile | undefined;
  const record = (session.draft.npi_lookup as NpiLookupAnswer | undefined)?.profile;
  const name =
    [record?.first_name ?? user?.first_name, record?.last_name ?? user?.last_name].filter(Boolean).join(' ') ||
    'Provider';

  return (
    <>
      <h1 className="text-xl font-extrabold text-ink-900">Profile Photo</h1>
      <p className="mt-1 text-sm text-ink-500">Upload a professional headshot to complete your profile.</p>

      <div className="mt-6">
        <MediaForm
          headshot={{ name, value: saved?.headshot ?? null }}
          bio={saved?.bio ?? ''}
          yearsExperience={saved?.years_experience}
          certificates={saved?.certificates ?? []}
          submitLabel="Continue"
          onSubmit={async (values) => {
            await save.mutateAsync({ step: 'photo_uploads', data: values });
            pushSamePage('/onboarding');
          }}
        />
      </div>
    </>
  );
}
