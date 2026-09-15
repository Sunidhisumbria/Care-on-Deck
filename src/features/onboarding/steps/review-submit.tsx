'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent, type ReactNode } from 'react';
import { toast } from 'sonner';

import { SubmitButton } from '@/components/ui/field';
import type { UploadedFile } from '@/features/uploads/types';
import { toApiError } from '@/lib/http/errors';
import type { NpiLookupAnswer } from '@/lib/npi';
import { formatUsPhone, labelForOfficeType } from '@/lib/practice';
import { WEEKDAYS, formatAppointmentLength, formatTime, type ScheduleValues } from '@/lib/schedule';

import { useSubmitApplication } from '../hooks';
import { providerTypeLabel } from '../provider-types';
import type { StepperKey } from '../steps';
import type { OnboardingSession, ProviderType } from '../types';

/** The stored answers this screen reads. The server built them, so their shapes are known. */
interface Answers {
  role?: { provider_type: ProviderType };
  npi?: NpiLookupAnswer;
  license?: { state: string; license_number: string; expires_on: string; document: UploadedFile | null };
  practice?: {
    name: string;
    office_type: string;
    phone: string;
    email: string;
    website: string | null;
    address: { line1: string; line2: string | null; city: string; state: string; postal_code: string };
  };
  schedule?: ScheduleValues;
  insurance?: { self_pay_only: boolean; carriers: Array<{ id: string; name: string }> };
  profile?: { headshot: UploadedFile | null; bio: string; years_experience: number; certificates: UploadedFile[] };
}

const ATTEST_REQUIRED = 'Confirm the information is accurate to submit.';

/**
 * IA: 4. Provider Onboarding > Submit for Review.
 *
 * There is no design for this screen. It shows everything the reviewer will
 * see, with a way back to each step, then asks for an explicit confirmation --
 * the application is a set of claims about a licensed professional, and the
 * applicant should read them once as a whole before they are sent.
 */
export function ReviewSubmit({ session }: { session: OnboardingSession }) {
  const router = useRouter();
  const submit = useSubmitApplication(session.id);
  const [attested, setAttested] = useState(false);
  const [attestError, setAttestError] = useState<string>();

  const draft = session.draft;
  const answers: Answers = {
    role: draft.select_role as Answers['role'],
    npi: draft.npi_lookup as Answers['npi'],
    license: draft.license_verification as Answers['license'],
    practice: draft.practice_setup as Answers['practice'],
    schedule: draft.schedule_setup as Answers['schedule'],
    insurance: draft.insurance_setup as Answers['insurance'],
    profile: draft.photo_uploads as Answers['profile'],
  };

  const resubmitting = session.status === 'needs_changes';
  const edit = (key: StepperKey) => router.push(`/onboarding?step=${key}`);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!attested) {
      setAttestError(ATTEST_REQUIRED);
      return;
    }
    submit.mutate(undefined, {
      onSuccess: () => toast.success(resubmitting ? 'Application resubmitted.' : 'Application submitted.'),
      onError: (error) => toast.error(toApiError(error).message),
    });
  }

  const { role, npi, license, practice, schedule, insurance, profile } = answers;
  const record = npi?.profile;

  return (
    <>
      <h1 className="text-xl font-extrabold text-ink-900">Review and Submit</h1>
      <p className="mt-1 text-sm text-ink-500">
        Check your application before sending it to our team. You can&rsquo;t make changes while it is being
        reviewed.
      </p>

      <div className="mt-6 space-y-3">
        <Section title="Your Role" onEdit={() => edit('select_role')}>
          <Row label="Role" value={providerTypeLabel(role?.provider_type)} />
        </Section>

        <Section title="NPI" onEdit={() => edit('npi_lookup')}>
          <Row label="NPI" value={npi?.npi} />
          <Row
            label="Registry name"
            value={
              record
                ? `${record.first_name ?? ''} ${record.last_name ?? ''}${record.credential ? `, ${record.credential}` : ''}`.trim()
                : 'The registry could not be reached. Our team will match your NPI during review.'
            }
          />
        </Section>

        <Section title="License" onEdit={() => edit('license_verification')}>
          <Row label="State" value={license?.state} />
          <Row label="License number" value={license?.license_number} />
          <Row label="Expires" value={license ? formatDate(license.expires_on) : undefined} />
          <Row label="Document" value={license?.document ? 'Attached' : 'Not attached'} />
        </Section>

        <Section title="Your Practice" onEdit={() => edit('practice_setup')}>
          <Row label="Name" value={practice?.name} />
          <Row label="Type" value={practice ? labelForOfficeType(practice.office_type) : undefined} />
          <Row
            label="Address"
            value={
              practice
                ? [
                    [practice.address.line1, practice.address.line2].filter(Boolean).join(', '),
                    `${practice.address.city}, ${practice.address.state} ${practice.address.postal_code}`,
                  ].join('\n')
                : undefined
            }
          />
          <Row label="Phone" value={practice ? formatUsPhone(practice.phone) : undefined} />
          <Row label="Email" value={practice?.email} />
          {practice?.website ? <Row label="Website" value={practice.website} /> : null}
        </Section>

        <Section title="Schedule" onEdit={() => edit('schedule_setup')}>
          <Row
            label="Appointments"
            value={schedule ? formatAppointmentLength(Number(schedule.appointment_minutes)) : undefined}
          />
          <Row
            label="Hours"
            value={
              schedule
                ? WEEKDAYS.map(({ weekday, short }) => {
                    const day = schedule.days.find((entry) => entry.weekday === weekday);
                    return day?.enabled ? `${short}  ${formatTime(day.start)} – ${formatTime(day.end)}` : null;
                  })
                    .filter(Boolean)
                    .join('\n')
                : undefined
            }
          />
          {schedule && schedule.breaks.length > 0 ? (
            <Row
              label="Breaks"
              value={schedule.breaks.map((pause) => `${formatTime(pause.start)} – ${formatTime(pause.end)}`).join('\n')}
            />
          ) : null}
        </Section>

        <Section title="Accepted Insurance" onEdit={() => edit('insurance_setup')}>
          <Row
            label="Accepts"
            value={
              insurance
                ? insurance.self_pay_only
                  ? 'Self-pay only'
                  : insurance.carriers.map((carrier) => carrier.name).join(', ')
                : undefined
            }
          />
        </Section>

        <Section title="Profile" onEdit={() => edit('photo_uploads')}>
          <Row label="Photo" value={profile?.headshot ? 'Added' : 'Not added'} />
          <Row
            label="Experience"
            value={
              profile ? `${profile.years_experience} ${profile.years_experience === 1 ? 'year' : 'years'}` : undefined
            }
          />
          <Row label="Bio" value={profile?.bio} clamp />
          <Row
            label="Certificates"
            value={profile ? (profile.certificates.length === 0 ? 'None' : `${profile.certificates.length} attached`) : undefined}
          />
        </Section>
      </div>

      <form noValidate onSubmit={onSubmit} className="mt-6">
        <label className="flex cursor-pointer items-start gap-3 text-sm text-ink-700">
          <input
            type="checkbox"
            checked={attested}
            onChange={(event) => {
              setAttested(event.target.checked);
              if (event.target.checked) setAttestError(undefined);
            }}
            aria-invalid={attestError ? true : undefined}
            className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-brand-600"
          />
          <span>
            I confirm this information is accurate and that I am the provider described in this application.
          </span>
        </label>
        {attestError ? (
          <p role="alert" className="mt-1.5 text-xs text-red-600">
            {attestError}
          </p>
        ) : null}

        <p className="mt-4 rounded-field bg-canvas px-3.5 py-2.5 text-[0.8125rem] text-ink-500">
          Our team checks your NPI and license before your profile can be listed. We&rsquo;ll email you when
          there is a decision.
        </p>

        <div className="mt-6">
          <SubmitButton pending={submit.isPending}>
            {resubmitting ? 'Resubmit Application' : 'Submit for Review'}
          </SubmitButton>
        </div>
      </form>
    </>
  );
}

function Section({ title, onEdit, children }: { title: string; onEdit: () => void; children: ReactNode }) {
  return (
    <section className="rounded-card border border-line bg-white p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-ink-900">{title}</h2>
        <button
          type="button"
          onClick={onEdit}
          aria-label={`Edit ${title}`}
          className="text-sm font-semibold text-brand-600 hover:underline"
        >
          Edit
        </button>
      </div>
      <dl className="mt-3 space-y-2">{children}</dl>
    </section>
  );
}

function Row({ label, value, clamp }: { label: string; value: string | undefined; clamp?: boolean }) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] gap-3 text-[0.8125rem]">
      <dt className="text-ink-500">{label}</dt>
      <dd className={`whitespace-pre-line break-words text-ink-900 ${clamp ? 'line-clamp-3' : ''}`}>
        {value || '—'}
      </dd>
    </div>
  );
}

/** "2027-03-31" -> "Mar 31, 2027", read as a calendar date rather than midnight UTC. */
function formatDate(value: string): string {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return value;
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
