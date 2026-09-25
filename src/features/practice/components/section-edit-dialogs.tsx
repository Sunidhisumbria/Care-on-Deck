'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';

import { LoadingPanel } from '@/components/ui/spinner';
import type { UploadedFile } from '@/features/uploads/types';
import { formatClinicDate, formatClinicTime } from '@/lib/clinic-time';
import type { LicenseValues } from '@/lib/license';
import { formatUsPhone, type OfficeType, type PracticeValues } from '@/lib/practice';
import { isUsStateCode } from '@/lib/us-states';

import { LicenseForm } from '../forms/license-form';
import { MediaForm } from '../forms/media-form';
import { PracticeForm } from '../forms/practice-form';
import { ScheduleForm } from '../forms/schedule-form';
import { useUpdateLicense, useUpdateMedia, useUpdatePractice, useUpdateSchedule, useWeeklySchedule } from '../hooks';
import type { ProfileFile, ProviderProfile } from '../types';
import { Dialog } from './shared';

/**
 * The editors behind each Edit on Personal Information. Each is the same form
 * onboarding uses, so a profile is checked the same way whether it is being
 * created or changed. Saving closes the dialog; a refusal from the server
 * lands on the field it is about.
 */

export function PracticeDetailsDialog({ profile, onClose }: { profile: ProviderProfile; onClose: () => void }) {
  const save = useUpdatePractice();
  const practice = profile.practice;
  const state = practice?.address.state;

  return (
    <Dialog title="Practice Details" subtitle="Where patients come to see you." onClose={onClose} wide>
      <PracticeForm
        defaultValues={{
          name: practice?.name ?? '',
          office_type: practice?.office_type as OfficeType | undefined,
          phone: practice?.phone ? formatUsPhone(practice.phone) : '',
          email: practice?.email ?? '',
          website: practice?.website ?? '',
          address_line1: practice?.address.line1 ?? '',
          address_line2: practice?.address.line2 ?? '',
          city: practice?.address.city ?? '',
          state: isUsStateCode(state) ? (state as PracticeValues['state']) : undefined,
          postal_code: practice?.address.postal_code ?? '',
        }}
        addressNote="Changing the state can change your practice's time zone. That is only allowed while nothing is booked."
        submitLabel="Save Changes"
        onSubmit={async (values) => {
          await save.mutateAsync(values);
          toast.success('Practice details saved.');
          onClose();
        }}
      />
    </Dialog>
  );
}

export function ProfileMediaDialog({ profile, onClose }: { profile: ProviderProfile; onClose: () => void }) {
  const save = useUpdateMedia();

  return (
    <Dialog title="Profile & Media" subtitle="What patients read about you." onClose={onClose} wide>
      <MediaForm
        bio={profile.bio ?? ''}
        yearsExperience={profile.years_experience ?? undefined}
        certificates={profile.certificates.map((file) => asUpload(file, 'certificate'))}
        submitLabel="Save Changes"
        onSubmit={async (values) => {
          // The photo is saved from Personal Details; this form leaves it as it is.
          await save.mutateAsync({ ...values, headshot_media_id: profile.headshot?.media_id ?? null });
          toast.success('Profile saved.');
          onClose();
        }}
      />
    </Dialog>
  );
}

export function LicenseDialog({ profile, onClose }: { profile: ProviderProfile; onClose: () => void }) {
  const save = useUpdateLicense();
  const license = profile.license;

  return (
    <Dialog title="Documents License" subtitle="Your state license to practise." onClose={onClose} wide>
      <LicenseForm
        defaultValues={{
          state: isUsStateCode(license?.state) ? (license!.state as LicenseValues['state']) : undefined,
          license_number: license?.license_number ?? '',
          expires_on: license?.expires_on ?? '',
        }}
        document={license?.document ? asUpload(license.document, 'license_document') : null}
        notice={
          <p className="rounded-field bg-amber-50 px-3.5 py-2.5 text-[0.8125rem] text-amber-900">
            Saving sends your license back to our team to verify. You stay listed while it is checked.
          </p>
        }
        submitLabel="Save and Send for Review"
        onSubmit={async (values) => {
          await save.mutateAsync(values);
          toast.success('License saved. Our team will verify it.');
          onClose();
        }}
      />
    </Dialog>
  );
}

type Conflict = { id: string; starts_at: string; patient_name: string };

/**
 * Weekly hours. Existing appointments are never cancelled by a change of
 * hours: any upcoming ones outside the new hours are listed after saving, so
 * the provider can reschedule them if they need to.
 */
export function AvailabilityDialog({ timezone, onClose }: { timezone: string; onClose: () => void }) {
  const schedule = useWeeklySchedule(true);
  const save = useUpdateSchedule();
  const [conflicts, setConflicts] = useState<Conflict[] | null>(null);

  if (conflicts) {
    return (
      <Dialog title="Hours Saved" subtitle="These appointments are outside your new hours." onClose={onClose} wide>
        <p className="text-sm text-ink-700">
          They are still booked. Open each one to reschedule it, or keep it if you will see the patient anyway.
        </p>
        <ul className="mt-4 divide-y divide-line rounded-card border border-line bg-white">
          {conflicts.map((conflict) => (
            <li key={conflict.id}>
              <Link
                href={`/provider/appointments/${conflict.id}` as Route}
                className="flex items-center justify-between gap-3 px-4 py-3 text-sm transition-colors hover:bg-brand-50/50"
              >
                <span className="font-semibold text-ink-900">{conflict.patient_name}</span>
                <span className="text-ink-500">
                  {formatClinicDate(conflict.starts_at, timezone, 'medium')} · {formatClinicTime(conflict.starts_at, timezone)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-field bg-brand-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
        >
          Done
        </button>
      </Dialog>
    );
  }

  return (
    <Dialog title="Availability" subtitle="Your working hours and appointment length." onClose={onClose} wide>
      {schedule.data ? (
        <ScheduleForm
          defaultValues={schedule.data}
          submitLabel="Save Hours"
          onSubmit={async (values) => {
            const result = await save.mutateAsync(values);
            if (result.conflicts.length > 0) {
              setConflicts(result.conflicts);
              return;
            }
            toast.success('Hours saved. Patients see the new times straight away.');
            onClose();
          }}
        />
      ) : schedule.error ? (
        <p className="text-center text-sm text-ink-500">Your hours could not be loaded. Close this and try again.</p>
      ) : (
        <LoadingPanel label="Loading your hours…" rows={6} />
      )}
    </Dialog>
  );
}

/** A file already on record, in the shape the upload controls take. */
function asUpload(file: ProfileFile, purpose: UploadedFile['purpose']): UploadedFile {
  return { media_id: file.media_id, purpose, content_type: file.content_type, byte_size: 0 };
}
