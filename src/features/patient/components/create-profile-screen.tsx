'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Field, SubmitButton } from '@/components/ui/field';
import { UserIcon } from '@/components/ui/icons';
import { PhotoUpload } from '@/features/uploads/components/photo-upload';
import type { UploadedFile } from '@/features/uploads/types';
import { useApiForm } from '@/lib/forms/use-api-form';

import { usePatientProfile, useUpdateProfile } from '../hooks';
import { editProfileFormSchema, toProfileUpdate, type EditProfileFormValues } from '../schemas/edit-profile.schema';
import type { PatientProfile } from '../types';
import { AddressFields, PersonalFields } from './profile-fields';

/**
 * Signup, step two: the profile, straight after the account is verified.
 *
 * Skippable. Nothing here is needed to look around, and booking asks for
 * date of birth and address itself if they are still missing. It uses the
 * Edit Profile fields and endpoint, so an answer given here is simply what
 * Edit Profile shows later.
 *
 * The form is shown at once, empty -- which is what a new account has. The
 * profile is still fetched behind it: an account that already has details
 * (someone returning to this screen) has them filled in, as long as nothing
 * has been typed yet, so Save can never blank what is on file.
 */
export function CreateProfileScreen() {
  const router = useRouter();
  const update = useUpdateProfile();
  const profile = usePatientProfile({ fresh: true });
  const [photo, setPhoto] = useState<UploadedFile | null>(null);

  const { register, submit, error, formState, reset } = useApiForm(editProfileFormSchema, defaultsFor(null));

  const loaded = profile.isFetchedAfterMount ? profile.data : undefined;
  useEffect(() => {
    if (!loaded || formState.isDirty) return;
    reset(defaultsFor(loaded));
    if (loaded.photo_media_id) {
      setPhoto({ media_id: loaded.photo_media_id, purpose: 'patient_photo', content_type: 'image/jpeg', byte_size: 0 });
    }
    // Once, when this visit's fetch lands; later edits must not be overwritten.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  const onSubmit = submit(async (values) => {
    await update.mutateAsync(
      toProfileUpdate(values, { photoMediaId: photo?.media_id ?? null, insuranceId: null, cardMediaId: null }),
    );
    toast.success('Your profile is set up.');
    router.push('/home');
  });

  return (
    <form noValidate onSubmit={onSubmit} className="mt-6 space-y-5">
      <div className="flex justify-center pb-2">
        <PhotoUpload
          name={[loaded?.first_name, loaded?.last_name].filter(Boolean).join(' ') || 'Profile photo'}
          value={photo}
          onChange={setPhoto}
          purpose="patient_photo"
        />
      </div>

      <Field
        label="Preferred Name"
        placeholder="What should we call you? (optional)"
        icon={<UserIcon />}
        autoComplete="nickname"
        error={error('preferred_name')}
        {...register('preferred_name')}
      />

      <PersonalFields register={register} error={error} />
      <AddressFields register={register} error={error} />

      <div className="space-y-3 pt-2">
        <SubmitButton pending={formState.isSubmitting}>Save and Continue</SubmitButton>
        <Link
          href="/home"
          className="block w-full rounded-field border border-line py-3.5 text-center text-[0.9375rem] font-semibold text-ink-700 transition-colors hover:border-brand-300 hover:text-brand-600"
        >
          Skip for now
        </Link>
      </div>
    </form>
  );
}

/** The form's values: empty for a new account, else what is on file. */
function defaultsFor(profile: PatientProfile | null): EditProfileFormValues {
  return {
    has_card: false,
    preferred_name: profile?.preferred_name ?? '',
    // Not shown on this step; carried through so saving never clears it.
    phone_type: profile?.phone_type ?? '',
    secondary_phone: profile?.secondary_phone ?? '',
    secondary_phone_type: profile?.secondary_phone_type ?? '',
    relationship: '',
    date_of_birth: profile?.date_of_birth ?? '',
    gender: (profile?.gender === 'male' || profile?.gender === 'female' ? profile.gender : '') as EditProfileFormValues['gender'],
    gender_identity: profile?.gender_identity ?? '',
    language: profile?.languages[0] ?? 'English',
    line1: profile?.address?.line1 ?? '',
    line2: profile?.address?.line2 ?? '',
    city: profile?.address?.city ?? '',
    state: profile?.address?.state ?? '',
    postal_code: profile?.address?.postal_code ?? '',
    carrier_id: '',
    carrier_name: '',
    member_id: '',
    group_id: '',
  };
}
