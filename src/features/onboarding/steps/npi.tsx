'use client';

import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';

import { Field, SubmitButton } from '@/components/ui/field';
import { ChevronRight } from '@/components/ui/icons';
import { StatusBadge } from '@/components/ui/status-badge';
import { useCurrentUser } from '@/features/auth/hooks';
import { useApiForm } from '@/lib/forms/use-api-form';
import { toApiError } from '@/lib/http/errors';
import { npiField, profileFlags } from '@/lib/npi';
import { Busy } from '@/components/ui/spinner';
import { pushSamePage } from '@/lib/same-page-navigation';

import { useSaveStep } from '../hooks';
import { providerTypeLabel } from '../provider-types';
import type { NpiLookupAnswer, OnboardingSession, ProviderType } from '../types';

const REGISTRY_SEARCH = 'https://npiregistry.cms.hhs.gov/search';

const npiSchema = z.object({ npi: npiField });

const PRIMARY =
  'flex w-full items-center justify-center gap-1.5 rounded-field bg-brand-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60';
const SECONDARY =
  'flex w-full items-center justify-center rounded-field border border-brand-200 py-3 text-sm font-semibold text-brand-600 transition-colors hover:border-brand-400 disabled:cursor-not-allowed disabled:opacity-60';

/**
 * IA: 4. Provider Onboarding > NPI Lookup and Confirm Profile.
 *
 * One item on the stepper, three states on screen:
 *
 *   no NPI yet, or changing it   -> enter the number
 *   looked up, not yet confirmed -> "Is this you?"
 *   confirmed                    -> what was confirmed, with a way to change it
 *
 * The number is the only thing the screen sends. The registry record shown is
 * the one the server fetched and stored -- never something the browser could
 * have edited on the way.
 */
export function NpiStep({ session }: { session: OnboardingSession }) {
  const lookup = session.draft.npi_lookup as NpiLookupAnswer | undefined;
  const confirmed = session.completed_steps.includes('confirm_profile');
  const [editing, setEditing] = useState(false);

  if (editing || !lookup) {
    return (
      <NpiEntry
        session={session}
        replacing={confirmed && lookup ? lookup.npi : null}
        onDone={() => setEditing(false)}
        onCancel={lookup ? () => setEditing(false) : null}
      />
    );
  }

  if (!confirmed) {
    return <ConfirmProfile session={session} lookup={lookup} onSearchAgain={() => setEditing(true)} />;
  }

  return <ConfirmedProfile lookup={lookup} onChange={() => setEditing(true)} />;
}

function NpiEntry({
  session,
  replacing,
  onDone,
  onCancel,
}: {
  session: OnboardingSession;
  replacing: string | null;
  onDone: () => void;
  onCancel: (() => void) | null;
}) {
  const save = useSaveStep(session.id);
  const { register, formState, submit, error } = useApiForm(npiSchema, { npi: '' });

  return (
    <>
      <h1 className="text-xl font-extrabold text-ink-900">Find Your Professional Profile</h1>
      <p className="mt-1 text-sm text-ink-500">
        Enter your National Provider Identifier (NPI) to verify your credentials.
      </p>

      <form
        noValidate
        onSubmit={submit(async (values) => {
          await save.mutateAsync({ step: 'npi_lookup', data: values });
          onDone();
        })}
        className="mt-6 space-y-4"
      >
        <Field
          label="NPI Number"
          inputMode="numeric"
          autoComplete="off"
          maxLength={10}
          placeholder="Enter your 10-digit NPI"
          hint="Your 10-digit NPI from the CMS registry."
          error={error('npi')}
          {...register('npi')}
        />

        {replacing ? (
          <p className="rounded-field bg-amber-50 px-3.5 py-2.5 text-[0.8125rem] text-amber-900">
            Changing your NPI from {replacing} clears your confirmed profile, and anything filled in
            from it later in your application.
          </p>
        ) : null}

        <SubmitButton pending={formState.isSubmitting}>Search NPI</SubmitButton>

        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="w-full py-1 text-center text-sm font-medium text-ink-500 transition-colors hover:text-brand-600"
          >
            Cancel
          </button>
        ) : null}
      </form>

      <p className="mt-5 text-center text-sm text-ink-500">
        Don&rsquo;t know your NPI?{' '}
        <a
          href={REGISTRY_SEARCH}
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-brand-600 hover:underline"
        >
          Search the national registry
        </a>
      </p>
    </>
  );
}

function ConfirmProfile({
  session,
  lookup,
  onSearchAgain,
}: {
  session: OnboardingSession;
  lookup: NpiLookupAnswer;
  onSearchAgain: () => void;
}) {
  const confirm = useSaveStep(session.id);
  const retry = useSaveStep(session.id);
  const { user } = useCurrentUser();

  const providerType =
    (session.draft.select_role as { provider_type?: ProviderType } | undefined)?.provider_type ?? null;

  // A preview of what the server will record when they confirm -- the same
  // function runs there, so what they are told here is what the reviewer sees.
  const flags = user
    ? profileFlags({
        lookup,
        account: { first_name: user.first_name, last_name: user.last_name },
        providerType,
      })
    : [];

  async function onConfirm() {
    try {
      await confirm.mutateAsync({ step: 'confirm_profile', data: { confirmed: true } });
      pushSamePage('/onboarding');
    } catch (error) {
      toast.error(toApiError(error).message);
    }
  }

  async function onRetry() {
    try {
      await retry.mutateAsync({ step: 'npi_lookup', data: { npi: lookup.npi } });
    } catch (error) {
      toast.error(toApiError(error).message);
    }
  }

  if (!lookup.profile) {
    return (
      <>
        <h1 className="text-xl font-extrabold text-ink-900">We couldn&rsquo;t reach the NPI registry</h1>
        <p className="mt-1 text-sm text-ink-500">
          The national registry isn&rsquo;t responding right now, so NPI {lookup.npi} could not be
          looked up.
        </p>

        <div className="mt-5 rounded-card border border-line bg-white p-5 text-sm text-ink-700">
          You can carry on with your application. Our team will check your NPI against the registry
          during review, or you can try the lookup again now.
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={onRetry} disabled={retry.isPending} className={SECONDARY}>
            {retry.isPending ? <Busy>Trying…</Busy> : 'Try again'}
          </button>
          <button type="button" onClick={onConfirm} disabled={confirm.isPending} className={PRIMARY}>
            {confirm.isPending ? <Busy>Saving…</Busy> : 'Continue'}
          </button>
        </div>
      </>
    );
  }

  const profile = lookup.profile;
  const name = [profile.first_name, profile.middle_name, profile.last_name].filter(Boolean).join(' ');
  const location = profile.practice_location;

  return (
    <>
      <h1 className="text-xl font-extrabold text-ink-900">Is this you?</h1>
      <p className="mt-1 text-sm text-ink-500">
        This is the record the national NPI registry holds for {profile.npi}.
      </p>

      <div className="mt-5 rounded-card border border-line bg-white p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-base font-bold text-ink-900">
              {name}
              {profile.credential ? `, ${profile.credential}` : ''}
            </p>
            {profile.primary_taxonomy ? (
              <p className="mt-0.5 text-sm text-ink-500">{profile.primary_taxonomy.desc}</p>
            ) : null}
          </div>
          <StatusBadge tone="success">Active</StatusBadge>
        </div>

        <dl className="mt-4 space-y-2.5 border-t border-line pt-4 text-sm">
          <Row label="NPI">{profile.npi}</Row>
          {profile.primary_taxonomy?.license ? (
            <Row label="License">
              {profile.primary_taxonomy.license}
              {profile.primary_taxonomy.state ? ` (${profile.primary_taxonomy.state})` : ''}
            </Row>
          ) : null}
          {location ? (
            <Row label="Practice location">
              <span className="block">{location.line1}</span>
              {location.line2 ? <span className="block">{location.line2}</span> : null}
              <span className="block">
                {location.city}, {location.state} {location.postal_code}
              </span>
              {location.phone ? <span className="block text-ink-500">{location.phone}</span> : null}
            </Row>
          ) : null}
          {profile.enumeration_date ? (
            <Row label="NPI issued">
              {new Date(profile.enumeration_date).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                timeZone: 'UTC',
              })}
            </Row>
          ) : null}
        </dl>
      </div>

      {flags.includes('name_mismatch') && user ? (
        <Note tone="neutral">
          The registry holds this record under a different name from your account (
          {[user.first_name, user.last_name].filter(Boolean).join(' ')}). If it is yours, that&rsquo;s
          fine &mdash; our team checks names during review.
        </Note>
      ) : null}

      {flags.includes('role_mismatch') ? (
        <Note tone="warning">
          The registry lists this NPI as <strong>{profile.primary_taxonomy?.desc}</strong>, but you
          chose <strong>{providerTypeLabel(providerType)}</strong>.{' '}
          <button
            type="button"
            onClick={() => pushSamePage('/onboarding?step=select_role')}
            className="font-semibold underline"
          >
            Change my role
          </button>
        </Note>
      ) : null}

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={onSearchAgain} className={SECONDARY}>
          No, search again
        </button>
        <button type="button" onClick={onConfirm} disabled={confirm.isPending} className={PRIMARY}>
          {confirm.isPending ? <Busy>Saving…</Busy> : 'Yes, this is me'}
        </button>
      </div>

      <p className="mt-4 text-center text-xs text-ink-500">
        Confirming tells us this record is yours. Our team verifies it before your profile goes live.
      </p>
    </>
  );
}

function ConfirmedProfile({ lookup, onChange }: { lookup: NpiLookupAnswer; onChange: () => void }) {
  const profile = lookup.profile;
  const name = profile
    ? [profile.first_name, profile.middle_name, profile.last_name].filter(Boolean).join(' ')
    : null;

  return (
    <>
      <h1 className="text-xl font-extrabold text-ink-900">Your NPI</h1>
      <p className="mt-1 text-sm text-ink-500">
        You confirmed this profile. Changing your NPI will ask you to confirm again.
      </p>

      <div className="mt-5 flex items-start justify-between gap-3 rounded-card border border-line bg-white p-5">
        <div className="min-w-0">
          <p className="text-base font-bold text-ink-900">{name ?? `NPI ${lookup.npi}`}</p>
          <p className="mt-0.5 text-sm text-ink-500">
            {profile ? `NPI ${lookup.npi}` : 'To be checked against the registry by our team'}
          </p>
        </div>
        <StatusBadge tone="success">Confirmed</StatusBadge>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={onChange} className={SECONDARY}>
          Change NPI
        </button>
        <button type="button" onClick={() => pushSamePage('/onboarding')} className={PRIMARY}>
          Continue
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3">
      <dt className="text-ink-500">{label}</dt>
      <dd className="font-medium text-ink-900">{children}</dd>
    </div>
  );
}

function Note({ tone, children }: { tone: 'neutral' | 'warning'; children: ReactNode }) {
  return (
    <div
      className={`mt-4 rounded-field px-3.5 py-2.5 text-[0.8125rem] ${
        tone === 'warning' ? 'bg-amber-50 text-amber-900' : 'bg-white text-ink-700 ring-1 ring-line'
      }`}
    >
      {children}
    </div>
  );
}
