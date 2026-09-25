'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { Field, PhoneField, SelectField } from '@/components/ui/field';
import {
  LockIcon,
  MailIcon,
  PhoneIcon,
  UserIcon,
} from '@/components/ui/icons';
import { Busy, LoadingPanel } from '@/components/ui/spinner';
import { useInsuranceCarriers, useInsuranceDetail } from '@/features/insurance/hooks';
import type { SavedInsuranceDetail } from '@/features/insurance/types';
import { PhotoUpload } from '@/features/uploads/components/photo-upload';
import type { UploadedFile } from '@/features/uploads/types';
import { useApiForm } from '@/lib/forms/use-api-form';
import { CARRIER_NOT_LISTED, RELATIONSHIPS } from '@/lib/patient-insurance';
import { formatUsPhone } from '@/lib/practice';
import { GENDERS, PHONE_TYPES } from '@/lib/patient-profile';
import { US_STATES } from '@/lib/us-states';

import { usePatientProfile, useUpdateProfile } from '../hooks';
import { AddressFields, PersonalFields, Section } from './profile-fields';
import { editProfileFormSchema, toProfileUpdate, type EditProfileFormValues } from '../schemas/edit-profile.schema';
import type { PatientProfile } from '../types';

/**
 * IA: 3. Edit Profile.
 *
 * Personal details, address, contact and the primary insurance card, saved by
 * one Update in one request. The card's full member ID is fetched only for
 * this screen and dropped from the cache when it closes.
 *
 * Email and phone are shown but locked: they are how the patient signs in, and
 * changing one needs the new address or number proven first.
 */
export function EditProfileScreen() {
  const profile = usePatientProfile({ fresh: true });
  const card = useInsuranceDetail(profile.data?.insurance?.id ?? null);

  // A form's starting values are read once, so they come from this visit's own
  // fetch rather than a cached copy that may predate the last change.
  if (profile.isPending || !profile.isFetchedAfterMount || (profile.data?.insurance && card.isPending)) {
    return <LoadingPanel label="Loading your profile…" rows={8} />;
  }

  if (profile.error || !profile.data) {
    return (
      <p className="rounded-card border border-line bg-white px-6 py-10 text-center text-sm text-ink-500">
        Your profile could not be loaded. Refresh the page to try again.
      </p>
    );
  }

  // Keyed so the form's defaults are taken from the data once it has arrived.
  return <EditProfileForm key={profile.data.patient_id} profile={profile.data} card={card.data ?? null} />;
}

function EditProfileForm({ profile, card }: { profile: PatientProfile; card: SavedInsuranceDetail | null }) {
  const router = useRouter();
  const update = useUpdateProfile();
  const { data: carriers = [] } = useInsuranceCarriers();

  const [photo, setPhoto] = useState<UploadedFile | null>(
    profile.photo_media_id ? existing(profile.photo_media_id, 'patient_photo') : null,
  );
  const [cardPhoto, setCardPhoto] = useState<UploadedFile | null>(
    card?.card_media_id ? existing(card.card_media_id, 'insurance_card') : null,
  );

  const { register, submit, error, watch, setValue } = useApiForm(editProfileFormSchema, defaultsFor(profile, card));
  const carrierChoice = watch('carrier_id');

  const onSubmit = submit(async (values: EditProfileFormValues) => {
    await update.mutateAsync(
      toProfileUpdate(values, {
        photoMediaId: photo?.media_id ?? null,
        insuranceId: card?.id ?? null,
        cardMediaId: cardPhoto?.media_id ?? null,
      }),
    );
    toast.success('Your profile has been updated.');
    router.push('/account');
  });

  const name = [profile.first_name, profile.last_name].filter(Boolean).join(' ');

  return (
    <form noValidate onSubmit={onSubmit} className="space-y-5">
      <div className="flex justify-center pb-2">
        <PhotoUpload
          name={name || 'Profile photo'}
          value={photo}
          onChange={setPhoto}
          purpose="patient_photo"
        />
      </div>

      <Field
        label="Preferred Name"
        placeholder="What should we call you?"
        icon={<UserIcon />}
        autoComplete="nickname"
        error={error('preferred_name')}
        {...register('preferred_name')}
      />

      <PersonalFields register={register} error={error} />

      <AddressFields register={register} error={error} />

      <Section title="Contact Information">
        <Field
          label={profile.email_verified ? 'Email Address ★' : 'Email Address'}
          icon={<MailIcon />}
          value={profile.email ?? ''}
          placeholder="No email on file"
          readOnly
          trailing={<LockedMark />}
          hint={
            profile.email_verified
              ? 'Verified. This is how you sign in, so it can\'t be changed here.'
              : "This is how you sign in, so it can't be changed here."
          }
        />
        <SelectField
          label="Phone Type"
          placeholder="Select phone type"
          icon={<PhoneIcon />}
          options={PHONE_TYPES.map((type) => ({ value: type.value, label: type.label }))}
          error={error('phone_type')}
          {...register('phone_type')}
        />
        <Field
          label="Phone Number"
          icon={<PhoneIcon />}
          value={profile.phone ?? ''}
          placeholder="No phone on file"
          readOnly
          trailing={<LockedMark />}
          hint="This is how you sign in, so it can't be changed here."
        />
        <SecondaryPhone register={register} error={error} watch={watch} setValue={setValue} />
      </Section>

      <Section title="Insurance Information">
        {card ? (
          <>
            <SelectField
              label="Carrier Name"
              placeholder="Select your carrier"
              options={[
                ...carriers.map((carrier) => ({ value: carrier.id, label: carrier.name })),
                { value: CARRIER_NOT_LISTED, label: 'My carrier isn’t listed' },
              ]}
              error={error('carrier_id')}
              {...register('carrier_id')}
            />
            {carrierChoice === CARRIER_NOT_LISTED ? (
              <Field
                label="Carrier name as printed on your card"
                placeholder="Carrier name"
                error={error('carrier_name')}
                {...register('carrier_name')}
              />
            ) : null}
            <Field
              label="Member ID"
              placeholder="Member ID"
              autoComplete="off"
              error={error('member_id')}
              {...register('member_id')}
            />
            <Field
              label="Group Number"
              placeholder="Group number (optional)"
              autoComplete="off"
              error={error('group_id')}
              {...register('group_id')}
            />
            <SelectField
              label="Relationship to Policyholder"
              placeholder="Select relationship"
              options={RELATIONSHIPS.map((entry) => ({ value: entry.value, label: entry.label }))}
              error={error('relationship')}
              {...register('relationship')}
            />

            <div>
              <p className="mb-2 text-sm font-bold text-ink-900">Insurance Image</p>
              <PhotoUpload
                name="insurance card photo"
                value={cardPhoto}
                onChange={setCardPhoto}
                purpose="insurance_card"
                variant="card"
              />
            </div>
          </>
        ) : (
          <p className="rounded-field border border-dashed border-line bg-white px-4 py-5 text-sm text-ink-500">
            You are paying out of pocket, with no insurance on file.{' '}
            <Link href="/account/insurance" className="font-semibold text-brand-600 hover:underline">
              Add insurance
            </Link>
          </p>
        )}
        {profile.secondary_insurance ? (
          <p className="rounded-field border border-line bg-white px-4 py-3 text-sm text-ink-700">
            Secondary insurance: <span className="font-semibold">{profile.secondary_insurance.carrier ?? 'Insurance'}</span>
            {profile.secondary_insurance.member_id_last4 ? ` · ending ${profile.secondary_insurance.member_id_last4}` : ''}{' '}
            <Link href="/account/insurance" className="font-semibold text-brand-600 hover:underline">
              Manage
            </Link>
          </p>
        ) : card ? (
          <Link href="/account/insurance" className="inline-block text-sm font-semibold text-brand-600 hover:underline">
            + Add secondary insurance
          </Link>
        ) : null}
      </Section>

      <div className="grid gap-3 pt-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => router.push('/account')}
          disabled={update.isPending}
          className="rounded-field border border-brand-600 py-3 text-sm font-semibold text-brand-600 transition-colors hover:bg-brand-50 disabled:opacity-60"
        >
          Discard Change
        </button>
        <button
          type="submit"
          disabled={update.isPending}
          aria-busy={update.isPending || undefined}
          className="rounded-field bg-brand-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {update.isPending ? <Busy>Saving…</Busy> : 'Update'}
        </button>
      </div>
    </form>
  );
}

function LockedMark() {
  return (
    <span className="shrink-0 text-ink-300" title="Can't be changed here">
      <LockIcon className="h-4 w-4" />
    </span>
  );
}

/** A file already on record. Only its id matters here; the preview is fetched by id. */
function existing(mediaId: string, purpose: UploadedFile['purpose']): UploadedFile {
  return { media_id: mediaId, purpose, content_type: 'image/jpeg', byte_size: 0 };
}

/**
 * What the form starts with: everything on file. Where a field was never asked
 * for, the closest thing signup did collect stands in -- the first name for the
 * preferred name, and the city and state from the signup location for an
 * address not yet given. The patient still sees it and can change it.
 */
function defaultsFor(profile: PatientProfile, card: SavedInsuranceDetail | null): EditProfileFormValues {
  const fromLocation = profile.address ? null : cityAndState(profile.location_label);

  return {
    has_card: Boolean(card),
    preferred_name: profile.preferred_name ?? profile.first_name ?? '',
    date_of_birth: profile.date_of_birth ?? '',
    language: profile.languages[0] ?? 'English',
    // Blank when the saved value is not Male or Female, so the patient picks rather than inherits a guess.
    gender: (GENDERS.some((option) => option.value === profile.gender) ? profile.gender : '') as
      EditProfileFormValues['gender'],
    gender_identity: profile.gender_identity ?? '',
    line1: profile.address?.line1 ?? '',
    line2: profile.address?.line2 ?? '',
    city: profile.address?.city ?? fromLocation?.city ?? '',
    state: profile.address?.state ?? fromLocation?.state ?? '',
    postal_code: profile.address?.postal_code ?? '',
    phone_type: profile.phone_type ?? '',
    secondary_phone: profile.secondary_phone ? formatUsPhone(profile.secondary_phone) : '',
    secondary_phone_type: profile.secondary_phone_type ?? '',
    relationship: card?.relationship ?? '',
    carrier_id: card ? (card.carrier.id ?? CARRIER_NOT_LISTED) : '',
    carrier_name: card && !card.carrier.id ? card.carrier.name : '',
    member_id: card?.member_id ?? '',
    group_id: card?.group_id ?? '',
  };
}

/**
 * The signup location as an address start: "Springfield, OR, USA" gives a city
 * and a state; a bare "Springfield", typed rather than picked, gives the city
 * alone. The state is only filled when one is recognisable -- a guessed state
 * is one the patient has to spot and undo.
 */
function cityAndState(label: string | null): { city: string; state: string } | null {
  if (!label) return null;
  const [city, ...rest] = label.split(',').map((part) => part.trim());
  if (!city) return null;

  for (const part of rest) {
    const match =
      US_STATES.find(
        (state) =>
          state.code === part.slice(0, 2).toUpperCase() && /^[A-Za-z]{2}(\s+\d{5}(-\d{4})?)?$/.test(part),
      ) ?? US_STATES.find((state) => state.name.toLowerCase() === part.toLowerCase());
    if (match) return { city, state: match.code };
  }
  return { city, state: '' };
}

/**
 * "+ Add secondary phone": a contact number only -- it never signs anyone in,
 * so unlike the main phone it can be typed straight in.
 */
function SecondaryPhone({
  register,
  error,
  watch,
  setValue,
}: {
  register: ReturnType<typeof useApiForm<EditProfileFormValues>>['register'];
  error: (name: keyof EditProfileFormValues) => string | undefined;
  watch: ReturnType<typeof useApiForm<EditProfileFormValues>>['watch'];
  setValue: ReturnType<typeof useApiForm<EditProfileFormValues>>['setValue'];
}) {
  const [open, setOpen] = useState(Boolean(watch('secondary_phone')));

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-sm font-semibold text-brand-600 hover:underline">
        + Add secondary phone
      </button>
    );
  }

  return (
    <div className="space-y-3 rounded-field border border-line bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-ink-900">Secondary Phone</p>
        <button
          type="button"
          onClick={() => {
            setValue('secondary_phone', '', { shouldDirty: true });
            setValue('secondary_phone_type', '', { shouldDirty: true });
            setOpen(false);
          }}
          className="text-xs font-semibold text-ink-500 hover:text-red-600"
        >
          Remove
        </button>
      </div>
      <SelectField
        label="Phone Type"
        placeholder="Select phone type"
        options={PHONE_TYPES.map((type) => ({ value: type.value, label: type.label }))}
        error={error('secondary_phone_type')}
        {...register('secondary_phone_type')}
      />
      <PhoneField label="Phone Number" error={error('secondary_phone')} {...register('secondary_phone')} />
    </div>
  );
}
