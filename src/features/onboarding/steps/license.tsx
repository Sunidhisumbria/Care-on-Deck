'use client';

import { LicenseForm } from '@/features/practice/forms/license-form';
import type { UploadedFile } from '@/features/uploads/types';
import type { LicenseValues } from '@/lib/license';
import type { NpiLookupAnswer } from '@/lib/npi';
import { isUsStateCode } from '@/lib/us-states';
import { pushSamePage } from '@/lib/same-page-navigation';

import { useSaveStep } from '../hooks';
import type { OnboardingSession } from '../types';

type SavedLicense = Partial<LicenseValues> & { document?: UploadedFile | null };

/**
 * IA: 4. Provider Onboarding > License Verification.
 *
 * Pre-filled from the NPI record when it has a license, and left editable. The
 * registry's license field is typed in by the provider and often lags a renewal
 * or a move, so it is a starting point to confirm, not a fact to lock.
 *
 * A number that differs from the record is allowed. The applicant is told as
 * they type, and the server records the mismatch for the reviewer, who checks
 * the license against the state board either way.
 */
export function LicenseStep({ session }: { session: OnboardingSession }) {
  const save = useSaveStep(session.id);

  const saved = session.draft.license_verification as SavedLicense | undefined;
  const registry = (session.draft.npi_lookup as NpiLookupAnswer | undefined)?.profile?.primary_taxonomy ?? null;
  const registryState = isUsStateCode(registry?.state) ? (registry.state!.toUpperCase() as LicenseValues['state']) : undefined;
  const prefilled = !saved && Boolean(registry?.license);

  return (
    <>
      <h1 className="text-xl font-extrabold text-ink-900">License Verification</h1>
      <p className="mt-1 text-sm text-ink-500">Provide your state medical license information for verification.</p>

      {prefilled ? (
        <p className="mt-4 rounded-field bg-brand-50 px-3.5 py-2.5 text-[0.8125rem] text-ink-700">
          We filled this in from your NPI record. Check it against your license and correct anything that is out
          of date.
        </p>
      ) : null}

      <div className="mt-6">
        <LicenseForm
          defaultValues={{
            state: saved?.state ?? registryState,
            license_number: saved?.license_number ?? registry?.license ?? '',
            expires_on: saved?.expires_on ?? '',
          }}
          document={saved?.document ?? null}
          registry={registry}
          submitLabel="Continue"
          onSubmit={async (values) => {
            await save.mutateAsync({ step: 'license_verification', data: values });
            pushSamePage('/onboarding');
          }}
        />
      </div>
    </>
  );
}
