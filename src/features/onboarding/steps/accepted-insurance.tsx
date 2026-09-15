'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { SubmitButton } from '@/components/ui/field';
import { SearchIcon } from '@/components/ui/icons';
import { Toggle } from '@/components/ui/toggle';
import { acceptedInsuranceSchema } from '@/lib/accepted-insurance';
import { useApiForm } from '@/lib/forms/use-api-form';

import { useInsuranceCarriers, useSaveStep } from '../hooks';
import type { OnboardingSession } from '../types';

interface SavedInsurance {
  self_pay_only: boolean;
  carriers: Array<{ id: string; name: string }>;
}

/**
 * IA: 4. Provider Onboarding > Insurance Setup.
 *
 * There is no design for this step yet. It is built from the rest of the flow's
 * pieces -- the same heading, fields and toggle -- so it will restyle easily
 * when one arrives.
 *
 * Patients filter search results by what a practice accepts, so this is the
 * answer that decides who finds the practice at all.
 */
export function AcceptedInsuranceStep({ session }: { session: OnboardingSession }) {
  const router = useRouter();
  const save = useSaveStep(session.id);
  const carriers = useInsuranceCarriers();
  const [query, setQuery] = useState('');

  const saved = session.draft.insurance_setup as SavedInsurance | undefined;

  const { watch, setValue, formState, submit, error } = useApiForm(acceptedInsuranceSchema, {
    self_pay_only: saved?.self_pay_only ?? false,
    carrier_ids: saved?.carriers.map((carrier) => carrier.id) ?? [],
  });
  const selfPayOnly = watch('self_pay_only');
  const selected = watch('carrier_ids');

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return (carriers.data ?? []).filter((carrier) => !term || carrier.name.toLowerCase().includes(term));
  }, [carriers.data, query]);

  const revalidate = { shouldDirty: true, shouldValidate: formState.isSubmitted };

  function toggleCarrier(id: string) {
    setValue(
      'carrier_ids',
      selected.includes(id) ? selected.filter((existing) => existing !== id) : [...selected, id],
      revalidate,
    );
  }

  function setSelfPayOnly(on: boolean) {
    setValue('self_pay_only', on, revalidate);
    if (on) setValue('carrier_ids', [], revalidate);
  }

  return (
    <>
      <h1 className="text-xl font-extrabold text-ink-900">Accepted Insurance</h1>
      <p className="mt-1 text-sm text-ink-500">
        Choose the insurance your practice accepts. Patients filter by this when they search.
      </p>

      <form
        noValidate
        onSubmit={submit(async (values) => {
          await save.mutateAsync({ step: 'insurance_setup', data: values });
          router.push('/onboarding');
        })}
        className="mt-6"
      >
        <div className="flex items-center justify-between gap-4 rounded-card border border-line bg-white p-4">
          <div>
            <p className="text-sm font-semibold text-ink-900">Self-pay only</p>
            <p className="mt-0.5 text-xs text-ink-500">My practice doesn&rsquo;t accept insurance.</p>
          </div>
          <Toggle label="Self-pay only" checked={selfPayOnly} onChange={setSelfPayOnly} />
        </div>

        {selfPayOnly ? null : (
          <div className="mt-5">
            <label className="flex items-center gap-2 rounded-field border border-line bg-white px-3.5 py-2.5">
              <span className="text-ink-300">
                <SearchIcon className="h-4 w-4" />
              </span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search carriers"
                aria-label="Search insurance carriers"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-300"
              />
            </label>

            <p className="mt-3 text-xs text-ink-500" aria-live="polite">
              {selected.length === 0 ? 'None selected' : `${selected.length} selected`}
            </p>

            <div className="mt-2 max-h-80 overflow-y-auto rounded-card border border-line bg-white">
              {carriers.isPending ? (
                <div aria-hidden="true" className="h-40 animate-pulse bg-canvas" />
              ) : carriers.error ? (
                <p className="p-4 text-sm text-ink-500">The insurance list could not be loaded. Refresh to try again.</p>
              ) : (carriers.data ?? []).length === 0 ? (
                <p className="p-4 text-sm text-ink-500">
                  The insurance directory is empty. Select self-pay only for now, or ask CareOndeck to add
                  carriers.
                </p>
              ) : visible.length === 0 ? (
                <p className="p-4 text-sm text-ink-500">No carriers match &ldquo;{query}&rdquo;.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {visible.map((carrier) => (
                    <li key={carrier.id}>
                      <label className="flex cursor-pointer items-center gap-3 px-4 py-3 text-sm text-ink-900 hover:bg-brand-50/50">
                        <input
                          type="checkbox"
                          checked={selected.includes(carrier.id)}
                          onChange={() => toggleCarrier(carrier.id)}
                          className="h-4 w-4 shrink-0 cursor-pointer accent-brand-600"
                        />
                        {carrier.name}
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {error('carrier_ids') ? (
          <p role="alert" className="mt-2 text-xs text-red-600">
            {error('carrier_ids')}
          </p>
        ) : null}

        <div className="mt-6">
          <SubmitButton pending={formState.isSubmitting}>Continue</SubmitButton>
        </div>
      </form>
    </>
  );
}
