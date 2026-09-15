'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { ChevronRight } from '@/components/ui/icons';
import { OptionCards } from '@/components/ui/option-cards';
import { toApiError } from '@/lib/http/errors';

import { ProviderTypeIcon } from '../components/provider-type-icon';
import { useSaveStep } from '../hooks';
import { PROVIDER_TYPES } from '../provider-types';
import type { OnboardingSession, ProviderType } from '../types';

/**
 * IA: 4. Provider Onboarding > Select Role.
 *
 * Nothing is pre-selected, although the design shows Doctor Physician ticked.
 * A default here quietly files a dentist who clicks straight through as a
 * physician, and the NPI registry check on the next step would then flag a
 * mismatch the applicant never chose. Continue stays disabled until they pick.
 */
export function YourRoleStep({ session }: { session: OnboardingSession }) {
  const router = useRouter();
  const save = useSaveStep(session.id);

  const saved = (session.draft.select_role as { provider_type?: ProviderType } | undefined)?.provider_type ?? null;
  const [selected, setSelected] = useState<ProviderType | null>(saved);

  // Changing role after the NPI profile was confirmed reopens that confirmation
  // on the server. Say so before they press Continue, not after.
  const reopensConfirmation =
    saved !== null && selected !== saved && session.completed_steps.includes('confirm_profile');

  async function onContinue() {
    if (!selected) return;
    try {
      await save.mutateAsync({ step: 'select_role', data: { provider_type: selected } });
      router.push('/onboarding');
    } catch (error) {
      toast.error(toApiError(error).message);
    }
  }

  return (
    <>
      <h1 className="text-xl font-extrabold text-ink-900">What best describes you?</h1>
      <p className="mt-1 text-sm text-ink-500">Select your provider type to continue.</p>

      <div className="mt-5">
        <OptionCards
          name="provider-type"
          label="Provider type"
          value={selected}
          onChange={setSelected}
          options={PROVIDER_TYPES.map((role) => ({ ...role, icon: <ProviderTypeIcon type={role.value} /> }))}
        />
      </div>

      {reopensConfirmation ? (
        <p className="mt-4 rounded-field bg-amber-50 px-3.5 py-2.5 text-[0.8125rem] text-amber-900">
          Changing your role means confirming your NPI profile again, because we check the two
          against each other.
        </p>
      ) : null}

      <button
        type="button"
        onClick={onContinue}
        disabled={!selected || save.isPending}
        className="mt-5 flex w-full items-center justify-center gap-1.5 rounded-field bg-brand-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {save.isPending ? 'Saving…' : 'Continue'}
        {save.isPending ? null : <ChevronRight className="h-4 w-4" />}
      </button>
    </>
  );
}
