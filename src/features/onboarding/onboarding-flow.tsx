'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import type { ComponentType } from 'react';

import { ApplicationStatus, isClosed } from './components/application-status';
import { Stepper } from './components/stepper';
import { useOnboardingSession } from './hooks';
import { STEPPER, stepperKeyFor, stepperState, type StepperKey } from './steps';
import { AcceptedInsuranceStep } from './steps/accepted-insurance';
import { LicenseStep } from './steps/license';
import { NpiStep } from './steps/npi';
import { PracticeStep } from './steps/practice';
import { ReviewSubmit } from './steps/review-submit';
import { ScheduleStep } from './steps/schedule';
import { UploadProfileStep } from './steps/upload-profile';
import { YourRoleStep } from './steps/your-role';
import type { OnboardingSession } from './types';

const SCREENS: Record<StepperKey, ComponentType<{ session: OnboardingSession }>> = {
  select_role: YourRoleStep,
  npi_lookup: NpiStep,
  license_verification: LicenseStep,
  practice_setup: PracticeStep,
  schedule_setup: ScheduleStep,
  insurance_setup: AcceptedInsuranceStep,
  photo_uploads: UploadProfileStep,
};

/**
 * The provider application.
 *
 * The server's `current_step` is the source of truth. The `?step=` in the URL
 * only lets someone revisit a step they have already reached -- asking for one
 * further ahead just shows where they actually are, because the server would
 * refuse to save it anyway.
 *
 * Once every step is done there is no stepper item left to show, and the screen
 * becomes the review of the whole application with the Submit button.
 */
export function OnboardingFlow() {
  const router = useRouter();
  const params = useSearchParams();
  const { data: session, isPending, error } = useOnboardingSession();

  if (isPending) {
    return <div aria-hidden="true" className="mx-auto h-96 max-w-md animate-pulse rounded-card bg-white" />;
  }

  if (error || !session) {
    return (
      <p className="mx-auto max-w-md rounded-card border border-line bg-white p-6 text-center text-sm text-ink-500">
        Your application could not be loaded. Refresh to try again.
      </p>
    );
  }

  if (isClosed(session.status)) {
    return <ApplicationStatus session={{ ...session, status: session.status }} />;
  }

  const requested = STEPPER.find((item) => item.key === params.get('step'));
  const viewing =
    requested && stepperState(requested, session.completed_steps, session.current_step) !== 'upcoming'
      ? requested
      : STEPPER.find((item) => item.key === stepperKeyFor(session.current_step));

  const Screen = viewing ? SCREENS[viewing.key] : ReviewSubmit;

  return (
    <div className="mx-auto w-full max-w-4xl px-5 pb-16">
      <Stepper
        completed={session.completed_steps}
        current={session.current_step}
        onSelect={(key) => router.push(`/onboarding?step=${key}`)}
      />

      {session.status === 'needs_changes' && session.reviewer_note ? (
        <div className="mx-auto mt-6 max-w-md rounded-field bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-semibold">Changes requested</p>
          <p className="mt-1">{session.reviewer_note}</p>
        </div>
      ) : null}

      <div className="mx-auto mt-10 w-full max-w-md">
        {/* Keyed by step, so a screen's local state never leaks into the next one. */}
        <Screen key={viewing?.key ?? 'submit_for_review'} session={session} />
      </div>
    </div>
  );
}
