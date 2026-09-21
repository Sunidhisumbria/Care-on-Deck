'use client';

import { AccountHero } from '@/features/patient/components/account-hero';
import { DetailCard, DetailRow } from '@/features/patient/components/detail-list';
import { usePatientProfile } from '@/features/patient/hooks';
import { formatDate, fullName, titleCase } from '@/features/patient/lib/format';
import type { PatientProfile } from '@/features/patient/types';
import { ApiError } from '@/lib/http/errors';
import { LoadingPanel } from '@/components/ui/spinner';

/**
 * IA: 3. Patient Account > Personal Information.
 *
 * Read-only. Editing is its own screen, and the API's `PATCH /patients/profile` is
 * still a stub, so the Edit Profile button is visibly disabled rather than
 * opening a form that cannot save.
 */
export default function PersonalInformationPage() {
  const { data, isPending, error } = usePatientProfile();

  return (
    <>
      <AccountHero
        title="Personal Information"
        subtitle="Review and update the basic details as needed."
      />

      <div className="mx-auto max-w-3xl px-5 py-10 lg:py-12">
        {isPending ? <Skeleton /> : null}
        {error ? <ProfileError error={error} /> : null}
        {data ? <Profile profile={data} /> : null}
      </div>
    </>
  );
}

function Profile({ profile }: { profile: PatientProfile }) {
  const name = fullName(profile.first_name, profile.last_name);

  return (
    <div className="space-y-6">
      <section className="flex items-center gap-5 rounded-card border border-line bg-white px-6 py-6 sm:px-8">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand-600 text-2xl font-bold text-white">
          {(profile.first_name || '?').slice(0, 1).toUpperCase()}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-bold text-ink-900">{name}</p>
          <p className="truncate text-sm text-ink-500">{profile.email ?? profile.phone ?? ''}</p>
        </div>

        <button
          type="button"
          disabled
          title="Editing arrives with PATCH /patients/profile"
          className="shrink-0 rounded-field bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Edit Profile
        </button>
      </section>

      <div className="overflow-hidden rounded-card border border-line bg-white">
        <DetailCard title="Personal Details">
          <DetailRow label="Full name" value={profile.first_name} />
          <DetailRow label="Last name" value={profile.last_name} />
          <DetailRow label="Date of birth" value={formatDate(profile.date_of_birth)} />
          <DetailRow label="Gender" value={titleCase(profile.gender)} />
        </DetailCard>

        <DetailCard title="Contact Details">
          <DetailRow label="Email" value={profile.email} />
          <DetailRow label="Phone" value={profile.phone} />
        </DetailCard>

        <DetailCard title="Address Details">
          <DetailRow label="Street" value={streetOf(profile)} />
          <DetailRow label="City" value={cityOf(profile)} />
        </DetailCard>

        <DetailCard title="Insurance Information">
          <DetailRow label="Plan" value={insuranceOf(profile)} />
        </DetailCard>
      </div>
    </div>
  );
}

function streetOf(profile: PatientProfile): string | null {
  if (!profile.address) return null;
  return [profile.address.line1, profile.address.line2].filter(Boolean).join(', ');
}

/**
 * The mailing address when there is one. Otherwise the coarse location from
 * signup, which is usually a city and is better than an empty row.
 */
function cityOf(profile: PatientProfile): string | null {
  if (!profile.address) return profile.location_label;
  const { city, state, postal_code } = profile.address;
  return `${city}, ${state} ${postal_code}`.trim();
}

function insuranceOf(profile: PatientProfile): string | null {
  if (!profile.insurance) return null;
  const { carrier, plan } = profile.insurance;
  return [carrier, plan].filter(Boolean).join(' - ') || null;
}

function Skeleton() {
  return (
    <LoadingPanel label="Loading your profile…" rows={6} />
  );
}

function ProfileError({ error }: { error: unknown }) {
  const apiError = error instanceof ApiError ? error : null;

  // 401 means the session went; the header will already have swapped back to
  // Sign In, so this only has to explain the empty page.
  const message =
    apiError?.status === 401
      ? 'Sign in to see your personal information.'
      : apiError?.status === 404
        ? 'This account has no patient record yet.'
        : (apiError?.message ?? 'Could not load your profile. Please try again.');

  return (
    <p className="rounded-card border border-line bg-white px-6 py-10 text-center text-sm text-ink-500">
      {message}
    </p>
  );
}
