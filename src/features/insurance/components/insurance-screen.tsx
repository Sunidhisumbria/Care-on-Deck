'use client';

import { useState } from 'react';

import { AccountHero } from '@/features/patient/components/account-hero';
import { LoadingPanel } from '@/components/ui/spinner';

import { useInsuranceDetail, useSavedInsurance } from '../hooks';
import type { SavedInsurance } from '../types';
import { AddInsuranceFlow } from './add-insurance-flow';
import { PrimaryButton, SecondaryButton } from './buttons';
import { InsuranceCard } from './insurance-card';
import { SavedDialog } from './saved-dialog';

type Mode = { kind: 'list' } | { kind: 'add' } | { kind: 'edit' | 'rescan'; id: string };

/**
 * IA: 3. Patient Dashboard > Saved Insurance.
 *
 * Adding, editing and rescanning run the same flow as booking. Editing fetches
 * the card with its full member ID, because the patient has to be able to see
 * and correct the whole number; the list only ever has the last four.
 */
export function InsuranceScreen() {
  const saved = useSavedInsurance();
  const [mode, setMode] = useState<Mode>({ kind: 'list' });
  const [justSaved, setJustSaved] = useState<SavedInsurance | null>(null);

  const toList = () => setMode({ kind: 'list' });
  const onSaved = (card: SavedInsurance) => {
    setJustSaved(card);
    toList();
  };

  return (
    <>
      <AccountHero title="Insurance" subtitle="Review and edit insurance details" />

      <div className="mx-auto max-w-3xl px-5 py-10">
        {mode.kind === 'list' ? (
          <>
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-bold text-ink-900">Insurance</h2>
              <PrimaryButton wide={false} onClick={() => setMode({ kind: 'add' })}>
                + Add Insurance
              </PrimaryButton>
            </div>

            <div className="mt-5 space-y-4">
              {saved.isPending ? (
                <LoadingPanel label="Loading your insurance…" rows={4} />
              ) : saved.error ? (
                <p className="rounded-card border border-line bg-white p-5 text-sm text-ink-500">
                  Your insurance could not be loaded. Refresh to try again.
                </p>
              ) : saved.data.length === 0 ? (
                <div className="rounded-card border border-dashed border-line bg-white p-8 text-center">
                  <p className="text-sm font-bold text-ink-900">No insurance saved yet</p>
                  <p className="mt-1 text-xs text-ink-500">
                    Add your health or dental insurance to make booking faster.
                  </p>
                </div>
              ) : (
                saved.data.map((card) => (
                  <InsuranceCard
                    key={card.id}
                    insurance={card}
                    actions={
                      <>
                        <PrimaryButton
                          className="sm:w-auto sm:px-6"
                          onClick={() => setMode({ kind: 'edit', id: card.id })}
                        >
                          Edit Insurance
                        </PrimaryButton>
                        <SecondaryButton
                          className="sm:w-auto sm:px-6"
                          onClick={() => setMode({ kind: 'rescan', id: card.id })}
                        >
                          Scan &amp; Update Card
                        </SecondaryButton>
                      </>
                    }
                  />
                ))
              )}
            </div>
          </>
        ) : (
          <div className="rounded-card border border-line bg-white p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-lg font-bold text-ink-900">
                {mode.kind === 'add' ? 'Add insurance' : 'Update insurance'}
              </h2>
              <button
                type="button"
                onClick={toList}
                className="text-sm font-semibold text-ink-500 transition-colors hover:text-brand-600"
              >
                Cancel
              </button>
            </div>

            {mode.kind === 'add' ? (
              <AddInsuranceFlow onSaved={onSaved} onCancel={toList} />
            ) : (
              <EditInsurance
                key={`${mode.kind}-${mode.id}`}
                id={mode.id}
                start={mode.kind === 'rescan' ? 'camera' : 'form'}
                onSaved={onSaved}
                onCancel={toList}
              />
            )}
          </div>
        )}
      </div>

      {justSaved ? (
        <SavedDialog
          saved={justSaved}
          actionLabel="Done"
          onAction={() => setJustSaved(null)}
          onClose={() => setJustSaved(null)}
        />
      ) : null}
    </>
  );
}

function EditInsurance({
  id,
  start,
  onSaved,
  onCancel,
}: {
  id: string;
  start: 'form' | 'camera';
  onSaved: (saved: SavedInsurance) => void;
  onCancel: () => void;
}) {
  const detail = useInsuranceDetail(id);

  if (detail.isPending) {
    return <LoadingPanel label="Loading this card…" rows={5} />;
  }
  if (detail.error) {
    return <p className="text-sm text-ink-500">That insurance could not be loaded. Go back and try again.</p>;
  }
  return <AddInsuranceFlow editing={detail.data} start={start} onSaved={onSaved} onCancel={onCancel} />;
}
