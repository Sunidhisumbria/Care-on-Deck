'use client';

import { PracticeForm } from '@/features/practice/forms/practice-form';
import type { NpiLookupAnswer } from '@/lib/npi';
import { formatUsPhone, type PracticeValues } from '@/lib/practice';
import { isUsStateCode } from '@/lib/us-states';
import { pushSamePage } from '@/lib/same-page-navigation';

import { useSaveStep } from '../hooks';
import type { OnboardingSession } from '../types';

interface SavedPractice {
  name: string;
  office_type: PracticeValues['office_type'];
  phone: string;
  email: string;
  website: string | null;
  address: { line1: string; line2: string | null; city: string; state: PracticeValues['state']; postal_code: string };
}

/**
 * IA: 4. Provider Onboarding > Practice Setup.
 *
 * Creates a new practice. Joining an existing practice is not built yet -- it
 * needs someone at that practice to approve the request, which is still an open
 * question -- so every applicant here sets up their own.
 *
 * The phone and address are pre-filled from the NPI record's practice location
 * and left editable, because registry addresses are often out of date. The
 * address section is an addition to the design: the marketplace searches by
 * location, so a practice needs one to be found at all.
 */
export function PracticeStep({ session }: { session: OnboardingSession }) {
  const save = useSaveStep(session.id);

  const saved = session.draft.practice_setup as SavedPractice | undefined;
  const location = (session.draft.npi_lookup as NpiLookupAnswer | undefined)?.profile?.practice_location ?? null;
  const registryState = isUsStateCode(location?.state) ? (location.state.toUpperCase() as PracticeValues['state']) : undefined;
  const prefilled = !saved && Boolean(location);

  return (
    <>
      <h1 className="text-xl font-extrabold text-ink-900">Your Practice</h1>
      <p className="mt-1 text-sm text-ink-500">Tell patients where to find you.</p>

      <div className="mt-6">
        <PracticeForm
          defaultValues={{
            name: saved?.name ?? '',
            office_type: saved?.office_type,
            phone: saved ? formatUsPhone(saved.phone) : (location?.phone ?? ''),
            email: saved?.email ?? '',
            website: saved?.website ?? '',
            address_line1: saved?.address.line1 ?? location?.line1 ?? '',
            address_line2: saved?.address.line2 ?? location?.line2 ?? '',
            city: saved?.address.city ?? location?.city ?? '',
            state: saved?.address.state ?? registryState,
            postal_code: saved?.address.postal_code ?? location?.postal_code ?? '',
          }}
          addressNote={
            prefilled
              ? 'From your NPI record. Correct it if your practice has moved.'
              : 'Where patients come to see you.'
          }
          submitLabel="Continue"
          onSubmit={async (values) => {
            await save.mutateAsync({ step: 'practice_setup', data: values });
            pushSamePage('/onboarding');
          }}
        />
      </div>
    </>
  );
}
