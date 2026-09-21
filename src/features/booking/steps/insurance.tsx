'use client';

import { useState } from 'react';

import { Illustration } from '@/components/ui/illustration';
import type { OptionCard } from '@/components/ui/option-cards';
import { AddInsuranceFlow } from '@/features/insurance/components/add-insurance-flow';
import { PrimaryButton, SecondaryButton } from '@/features/insurance/components/buttons';
import { ChoiceStep } from '@/features/insurance/components/choice-step';
import { InsuranceCard } from '@/features/insurance/components/insurance-card';
import { SavedDialog } from '@/features/insurance/components/saved-dialog';
import type { SavedInsurance } from '@/features/insurance/types';

import { useBooking, type BookingPayment } from '../booking-state';
import { ProviderSummary } from '../components/provider-summary';
import { useRequestBooking } from '../hooks/use-booking';
import type { BookingConfirmation } from '../types';

type PaymentKind = BookingPayment['kind'];
type Stage = 'choose' | 'self_pay' | 'insurance' | 'saved';

const PAYMENT_OPTIONS: OptionCard<PaymentKind>[] = [
  {
    value: 'insurance',
    title: 'Use Insurance',
    caption: 'Scan or enter your health or dental insurance card',
    icon: <Illustration name="insuranceHealth" />,
  },
  {
    value: 'self_pay',
    title: 'Pay out of pocket (self-pay)',
    caption: 'Insurance will not be billed',
    icon: <Illustration name="selfPay" />,
  },
];

/**
 * Step six: how the visit is paid for.
 *
 * Self-pay hides every insurance control, as the handoff requires. Insurance
 * runs the shared add-a-card flow, which saves the card to the patient's
 * account.
 *
 * This is also where the appointment is created: the last button on the last
 * screen is the only one that writes anything. Only the saved card's id is
 * sent with it -- the full member ID never outlives the form it was typed
 * into, and the server reads the card it already holds.
 */
export function InsuranceStep({
  onBooked,
}: {
  onBooked: (confirmation: BookingConfirmation) => void;
}) {
  const { draft, set } = useBooking();
  const payment = draft.payment;
  const { mutateAsync, isPending, error } = useRequestBooking();

  async function book(chosen: BookingPayment) {
    if (!draft.provider || !draft.slot) return;

    const confirmation = await mutateAsync({
      provider_id: draft.provider.id,
      starts_at: draft.slot.starts_at,
      visit_reason_id: draft.reason?.id ?? null,
      payment:
        chosen.kind === 'self_pay'
          ? { kind: 'self_pay' }
          : { kind: 'insurance', patient_insurance_id: chosen.insurance.id },
    });

    onBooked(confirmation);
  }

  const [stage, setStage] = useState<Stage>(
    payment?.kind === 'self_pay' ? 'self_pay' : payment?.kind === 'insurance' ? 'saved' : 'choose',
  );
  const [choice, setChoice] = useState<PaymentKind | null>(payment?.kind ?? null);
  const [justSaved, setJustSaved] = useState<SavedInsurance | null>(null);

  if (!draft.provider) return null;

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 lg:px-8">
      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <ProviderSummary provider={draft.provider} reason={draft.reason} onEditReason={() => history.back()} />

        <div>
          {stage === 'choose' ? (
            <ChoiceStep
              title="How will you pay?"
              subtitle="Choose how you plan to cover your appointments."
              name="payment"
              iconFrame={false}
              options={PAYMENT_OPTIONS}
              value={choice}
              onChange={setChoice}
              onContinue={(kind) => setStage(kind === 'self_pay' ? 'self_pay' : 'insurance')}
            />
          ) : null}

          {stage === 'self_pay' ? (
            <SelfPay
              busy={isPending}
              onEdit={() => setStage('choose')}
              onSave={() => {
                set('payment', { kind: 'self_pay' });
                void book({ kind: 'self_pay' });
              }}
            />
          ) : null}

          {stage === 'insurance' ? (
            <AddInsuranceFlow
              onCancel={() => setStage('choose')}
              onSaved={(card) => {
                set('payment', { kind: 'insurance', insurance: card });
                setJustSaved(card);
                setStage('saved');
              }}
            />
          ) : null}

          {stage === 'saved' && payment?.kind === 'insurance' ? (
            <div>
              <h2 className="text-base font-bold text-ink-900">Insurance information</h2>
              <div className="mt-4">
                <InsuranceCard
                  insurance={payment.insurance}
                  actions={
                    <SecondaryButton wide={false} className="py-2 text-xs" onClick={() => setStage('choose')}>
                      Change
                    </SecondaryButton>
                  }
                />
              </div>
              <PrimaryButton
                className="mt-4"
                pending={isPending}
                onClick={() => void book(payment)}
              >
                {isPending ? 'Booking…' : 'Confirm & book appointment'}
              </PrimaryButton>
            </div>
          ) : null}

          {error ? (
            <p className="mt-4 rounded-field bg-rose-50 px-3 py-2.5 text-xs text-rose-700">
              {error instanceof Error
                ? error.message
                : 'That booking could not be completed. Try again.'}
            </p>
          ) : null}
        </div>
      </div>

      {justSaved ? (
        <SavedDialog
          saved={justSaved}
          actionLabel="Confirm & book appointment"
          onAction={() => {
            const card = justSaved;
            setJustSaved(null);
            void book({ kind: 'insurance', insurance: card });
          }}
          onClose={() => setJustSaved(null)}
        />
      ) : null}
    </div>
  );
}

/** "You selected self-pay." No insurance fields at all, per the handoff. */
function SelfPay({
  busy,
  onEdit,
  onSave,
}: {
  busy: boolean;
  onEdit: () => void;
  onSave: () => void;
}) {
  return (
    <div>
      <h2 className="text-base font-bold text-ink-900">Self-pay</h2>

      <div className="mt-4 rounded-card border border-line bg-white p-4">
        <div className="flex items-center gap-3">
          <Illustration name="selfPay" />
          <div>
            <p className="text-sm font-bold text-ink-900">Pay out of pocket (self-pay)</p>
            <p className="mt-0.5 text-xs text-ink-500">Insurance will not be billed</p>
          </div>
        </div>

        <p className="mt-4 rounded-field bg-brand-50 px-3 py-2.5 text-xs text-ink-700">
          You selected self-pay. Insurance will not be billed for this visit.
        </p>

        <SecondaryButton wide={false} className="mt-4 py-2 text-xs" onClick={onEdit}>
          Edit
        </SecondaryButton>
      </div>

      <PrimaryButton className="mt-4" pending={busy} onClick={onSave}>
        {busy ? 'Booking…' : 'Confirm & book appointment'}
      </PrimaryButton>
    </div>
  );
}
