'use client';

import { useState } from 'react';

import { LoadingPanel } from '@/components/ui/spinner';
import { formatUsPhone } from '@/lib/practice';
import { formatTime, WEEKDAYS } from '@/lib/schedule';

import { useProviderProfile, usePracticeReady } from '../hooks';
import type { ProviderProfile } from '../types';
import { PersonalDetailsDialog } from './personal-details-dialog';
import { AvailabilityDialog, LicenseDialog, PracticeDetailsDialog, ProfileMediaDialog } from './section-edit-dialogs';
import { Card, Detail, EditLink, FileThumb, formatDate, Headshot, Highlight } from './profile-cards';

/** Sunday first, as the design lists the week. */
const WEEK = [...WEEKDAYS].sort((a, b) => a.weekday - b.weekday);

/**
 * IA: 6. Account Menu > Personal Information.
 *
 * The provider's live profile, laid out as the design draws it. Each Edit
 * opens that section's editor; see section-edit-dialogs.
 */
export function ProviderProfileScreen() {
  const { noPractice } = usePracticeReady();
  const profile = useProviderProfile();

  if (noPractice) return <Message>Your account is not part of a practice yet.</Message>;
  if (profile.data) return <Profile profile={profile.data} />;
  if (profile.error) return <Message>Your profile could not be loaded. Refresh to try again.</Message>;
  return <LoadingPanel label="Loading your profile…" rows={8} />;
}

function Profile({ profile }: { profile: ProviderProfile }) {
  const [editing, setEditing] = useState<'personal' | 'practice' | 'media' | 'license' | 'availability' | null>(null);
  const close = () => setEditing(null);
  const { practice, license, availability } = profile;
  const days = new Map(availability.days.map((day) => [day.weekday, day]));

  return (
    <>
      <h1 className="sr-only">Personal Information</h1>
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <div className="space-y-5">
          <Card>
            <div className="flex items-start gap-4">
              <Headshot file={profile.headshot} name={profile.name} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-bold text-ink-900">
                  {profile.name}
                  {profile.credentials ? (
                    <span className="font-semibold text-ink-500">, {profile.credentials}</span>
                  ) : null}
                </p>
                {profile.email ? <p className="truncate text-[0.8125rem] text-ink-500">{profile.email}</p> : null}
                {profile.phone ? <p className="text-[0.8125rem] text-ink-500">{formatUsPhone(profile.phone)}</p> : null}
              </div>
              <EditLink label="personal details" onClick={() => setEditing('personal')} />
            </div>
          </Card>

          <Card title="Practice Details" onEdit={() => setEditing('practice')}>
            <Detail label="Practice name">{practice?.name}</Detail>
            <Detail label="Practice or provider’s specialty">
              {profile.specialty ? (
                <span className="mt-1 flex flex-wrap gap-2">
                  <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
                    {profile.specialty}
                  </span>
                </span>
              ) : null}
            </Detail>
            <Detail label="Location">
              {practice
                ? [
                    practice.address.line1,
                    practice.address.line2,
                    [practice.address.city, [practice.address.state, practice.address.postal_code].filter(Boolean).join(' ')]
                      .filter(Boolean)
                      .join(', '),
                  ]
                    .filter(Boolean)
                    .join(', ')
                : null}
            </Detail>
          </Card>

          <Card title="Profile & Media" onEdit={() => setEditing('media')}>
            <Detail label="Bio">{profile.bio}</Detail>
            <Detail label="Degrees">{profile.credentials}</Detail>
            <Detail label="Certificate">
              {profile.certificates.length > 0 ? (
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

        <div className="space-y-5">
          <Card title="Documents License" onEdit={() => setEditing('license')}>
            {license?.document ? (
              <FileThumb file={license.document} label="License document" size="large" />
            ) : (
              <p className="text-[0.8125rem] text-ink-500">No document attached.</p>
            )}
            {license ? (
              <p className="text-xs text-ink-500">
                {license.state} license {license.license_number}
                {license.expires_on ? <> &middot; expires {formatDate(license.expires_on)}</> : null}
              </p>
            ) : null}
          </Card>

          <Card title="Availability" onEdit={() => setEditing('availability')}>
            <ul className="-mt-1 divide-y divide-line">
              {WEEK.map(({ weekday, label }) => {
                const day = days.get(weekday);
                return (
                  <li key={weekday} className="flex items-center justify-between py-3 text-sm">
                    <span className="font-semibold text-ink-900">{label}</span>
                    {day ? (
                      <span className="text-ink-700">
                        {formatTime(day.start)} <span className="px-1.5 text-ink-300">&mdash;</span> {formatTime(day.end)}
                      </span>
                    ) : (
                      <span className="text-ink-500">Unavailable</span>
                    )}
                  </li>
                );
              })}
            </ul>
            {availability.breaks.map((pause) => (
              <Highlight key={`${pause.start}-${pause.end}`} label="Break Hours">
                {formatTime(pause.start)} &ndash; {formatTime(pause.end)}
              </Highlight>
            ))}
          </Card>
        </div>
      </div>

      {editing === 'personal' ? <PersonalDetailsDialog profile={profile} onClose={close} /> : null}
      {editing === 'practice' ? <PracticeDetailsDialog profile={profile} onClose={close} /> : null}
      {editing === 'media' ? <ProfileMediaDialog profile={profile} onClose={close} /> : null}
      {editing === 'license' ? <LicenseDialog profile={profile} onClose={close} /> : null}
      {editing === 'availability' ? (
        <AvailabilityDialog timezone={profile.practice?.timezone ?? 'UTC'} onClose={close} />
      ) : null}
    </>
  );
}

function Message({ children }: { children: React.ReactNode }) {
  return <p className="rounded-card border border-line bg-white px-6 py-10 text-center text-sm text-ink-500">{children}</p>;
}
