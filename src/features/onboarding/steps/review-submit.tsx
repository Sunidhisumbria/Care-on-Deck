'use client';

import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';

import { SubmitButton } from '@/components/ui/field';
import { useCurrentUser } from '@/features/auth/hooks';
import type { UploadedFile } from '@/features/uploads/types';
import { Card, Detail, EditLink, FileThumb, formatDate, Headshot, Highlight } from '@/features/practice/components/profile-cards';
import { toApiError } from '@/lib/http/errors';
import type { NpiLookupAnswer } from '@/lib/npi';
import { formatUsPhone } from '@/lib/practice';
import { WEEKDAYS, formatAppointmentLength, formatTime, type ScheduleValues } from '@/lib/schedule';
import { pushSamePage } from '@/lib/same-page-navigation';

import { useSubmitApplication } from '../hooks';
import { PROVIDER_TYPES } from '../provider-types';
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

/** Sunday first, as the design lists the week. */
const WEEK = [...WEEKDAYS].sort((a, b) => a.weekday - b.weekday);

/**
 * IA: 4. Provider Onboarding > Submit for Review.
 *
 * Laid out from the design: the whole application as cards, each with an Edit
 * that returns to its step, then an explicit confirmation -- the application is
 * a set of claims about a licensed professional, and the applicant should read
 * them once as a whole before they are sent.
 *
 * The design's "Days off" row is left out: onboarding does not ask for days off,
 * and a row with nothing true to show is worse than no row.
 */
export function ReviewSubmit({ session }: { session: OnboardingSession }) {
  const submit = useSubmitApplication(session.id);
  const { user } = useCurrentUser();
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
  const edit = (key: StepperKey) => pushSamePage(`/onboarding?step=${key}`);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!attested) {
      setAttestError(ATTEST_REQUIRED);
      return;
    }
    submit.mutate(undefined, {
      onSuccess: (updated) =>
        toast.success(
          updated.status === 'approved'
            ? 'Application approved.'
            : resubmitting
              ? 'Application resubmitted.'
              : 'Application submitted.',
        ),
      onError: (error) => toast.error(toApiError(error).message),
    });
  }

  const { role, npi, license, practice, schedule, insurance, profile } = answers;
  const record = npi?.profile ?? null;

  // The registry's name is the one being verified; the account's stands in when the registry was unreachable.
  const name =
    [record?.first_name, record?.last_name].filter(Boolean).join(' ') ||
    [user?.first_name, user?.last_name].filter(Boolean).join(' ') ||
    'Your name';
  const roleTitle = PROVIDER_TYPES.find((entry) => entry.value === role?.provider_type)?.title ?? null;
  const specialties = [record?.primary_taxonomy?.desc ?? roleTitle].filter((value): value is string => Boolean(value));

  return (
    <>
      <h1 className="text-xl font-extrabold text-ink-900">Review and Submit</h1>
      <p className="mt-1 text-sm text-ink-500">
        Check your application before sending it to our team. You can&rsquo;t make changes while it is being
        reviewed.
      </p>

      <div className="mt-6 grid items-start gap-5 lg:grid-cols-2">
        {/* Left column */}
        <div className="space-y-5">
          <Card>
            <div className="flex items-start gap-4">
              <Headshot file={profile?.headshot ?? null} name={name} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-bold text-ink-900">
                  {name}
                  {record?.credential ? <span className="font-semibold text-ink-500">, {record.credential}</span> : null}
                </p>
                <p className="truncate text-[0.8125rem] text-ink-500">{user?.email ?? ''}</p>
                <p className="text-[0.8125rem] text-ink-500">{user?.phone ? formatUsPhone(user.phone) : ''}</p>
              </div>
              <EditLink label="profile photo" onClick={() => edit('photo_uploads')} />
            </div>
          </Card>

          <Card title="Practice Details" onEdit={() => edit('practice_setup')}>
            <Detail label="Practice name">{practice?.name}</Detail>
            <Detail label="Practice or provider’s specialty">
              {specialties.length > 0 ? (
                <span className="mt-1 flex flex-wrap gap-2">
                  {specialties.map((specialty) => (
                    <span
                      key={specialty}
                      className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700"
                    >
                      {specialty}
                    </span>
                  ))}
                </span>
              ) : null}
            </Detail>
            <Detail label="Location">
              {practice
                ? [
                    practice.address.line1,
                    practice.address.line2,
                    `${practice.address.city}, ${practice.address.state} ${practice.address.postal_code}`,
                  ]
                    .filter(Boolean)
                    .join(', ')
                : null}
            </Detail>
            {practice ? (
              <Detail label="Contact">
                {[formatUsPhone(practice.phone), practice.email, practice.website].filter(Boolean).join(' · ')}
              </Detail>
            ) : null}
          </Card>

          <Card title="Profile & Media" onEdit={() => edit('photo_uploads')}>
            <Detail label="Bio">{profile?.bio}</Detail>
            <Detail label="Degrees">{record?.credential}</Detail>
            <Detail label="Experience">
              {profile ? `${profile.years_experience} ${profile.years_experience === 1 ? 'year' : 'years'}` : null}
            </Detail>
            <Detail label="Certificate">
              {profile && profile.certificates.length > 0 ? (
                <span className="mt-1 flex flex-wrap gap-2">
                  {profile.certificates.map((file) => (
                    <FileThumb key={file.media_id} file={file} label="Certificate" size="small" />
                  ))}
                </span>
              ) : (
                'None added'
              )}
            </Detail>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          <Card title="Documents License" onEdit={() => edit('license_verification')}>
            {license?.document ? (
              <FileThumb file={license.document} label="License document" size="large" />
            ) : (
              <p className="text-[0.8125rem] text-ink-500">No document attached.</p>
            )}
            {license ? (
              <p className="text-xs text-ink-500">
                {license.state} license {license.license_number} &middot; expires {formatDate(license.expires_on)}
              </p>
            ) : null}
          </Card>

          <Card title="Availability" onEdit={() => edit('schedule_setup')}>
            {schedule ? (
              <>
                <ul className="-mt-1 divide-y divide-line">
                  {WEEK.map(({ weekday, label }) => {
                    const day = schedule.days.find((entry) => entry.weekday === weekday);
                    return (
                      <li key={weekday} className="flex items-center justify-between py-3 text-sm">
                        <span className="font-semibold text-ink-900">{label}</span>
                        {day?.enabled ? (
                          <span className="text-ink-700">
                            {formatTime(day.start)} <span className="px-1.5 text-ink-300">&mdash;</span>{' '}
                            {formatTime(day.end)}
                          </span>
                        ) : (
                          <span className="text-ink-500">Unavailable</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
                {schedule.breaks.map((pause) => (
                  <Highlight key={`${pause.start}-${pause.end}`} label="Break Hours">
                    {formatTime(pause.start)} &ndash; {formatTime(pause.end)}
                  </Highlight>
                ))}
                <p className="text-xs text-ink-500">
                  Appointments are {formatAppointmentLength(Number(schedule.appointment_minutes))} long.
                </p>
              </>
            ) : (
              <p className="text-[0.8125rem] text-ink-500">Not set up yet.</p>
            )}
          </Card>

          <Card title="Accepted Insurance" onEdit={() => edit('insurance_setup')}>
            <p className="text-[0.8125rem] text-ink-700">
              {insurance
                ? insurance.self_pay_only
                  ? 'Self-pay only'
                  : insurance.carriers.map((carrier) => carrier.name).join(', ')
                : '—'}
            </p>
          </Card>

          <Card title="Role & NPI" onEdit={() => edit('npi_lookup')}>
            <Detail label="Role">{roleTitle}</Detail>
            <Detail label="NPI">{npi?.npi}</Detail>
            {!record && npi ? (
              <p className="text-xs text-ink-500">
                The registry could not be reached. Our team will match your NPI during review.
              </p>
            ) : null}
          </Card>
        </div>
      </div>

      <form noValidate onSubmit={onSubmit} className="mx-auto mt-8 max-w-xl">
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
