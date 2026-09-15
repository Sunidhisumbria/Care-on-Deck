'use client';

import { useState } from 'react';

import { BookingProvider, useBooking } from './booking-state';
import { BookingHero } from './components/booking-hero';
import { ConfirmationDialog } from './components/confirmation-dialog';
import { InsuranceStep } from './steps/insurance';
import { PickWhenStep } from './steps/pick-when';
import { SelectProviderStep } from './steps/select-provider';
import { VisitReasonStep } from './steps/visit-reason';
import { YourAddressStep } from './steps/your-address';
import { YourDetailsStep } from './steps/your-details';

/** The heading each step shows. Kept together so the wording stays consistent. */
const HEADINGS = {
  provider: { title: 'Book Appointment', subtitle: 'Find the right doctor and time that works for you.' },
  reason: { title: 'Book Appointment', subtitle: 'View and manage all your past and upcoming appointments..' },
  when: { title: 'Book Appointment', subtitle: 'View and manage all your past and upcoming appointments..' },
  details: { title: 'Your Details', subtitle: 'Tell us a bit about yourself to compete your booking.' },
  address: { title: 'Your Address', subtitle: 'We use this to help you find the nearest care locations.' },
  insurance: { title: 'Insurance Information', subtitle: 'Add your insurance details to streamline billing.' },
} as const;

export function BookingFlow() {
  return (
    <BookingProvider>
      <Steps />
    </BookingProvider>
  );
}

function Steps() {
  const { step, draft, goTo } = useBooking();
  const [reference, setReference] = useState<string | null>(null);
  const heading = HEADINGS[step];

  /*
   * A step deeper than `provider` with no provider chosen means someone opened
   * the URL directly, or refreshed and lost the draft -- the answers live in
   * memory on purpose, see booking-state. Send them back to the start rather
   * than rendering a form with nothing behind it.
   */
  if (step !== 'provider' && !draft.provider) {
    return (
      <>
        <BookingHero title="Book Appointment" subtitle="Let's start with who you would like to see." />
        <div className="mx-auto max-w-md px-5 py-12 text-center">
          <p className="text-sm text-ink-500">
            Your booking was not carried over. Choose a provider to begin again.
          </p>
          <button
            type="button"
            onClick={() => goTo('provider')}
            className="mt-4 rounded-field bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          >
            Start over
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <BookingHero title={heading.title} subtitle={heading.subtitle} />

      {step === 'provider' ? <SelectProviderStep /> : null}
      {step === 'reason' ? <VisitReasonStep /> : null}
      {step === 'when' ? <PickWhenStep /> : null}
      {step === 'details' ? <YourDetailsStep /> : null}
      {step === 'address' ? <YourAddressStep /> : null}
      {step === 'insurance' ? <InsuranceStep onBooked={() => setReference(placeholderReference())} /> : null}

      {reference ? (
        <ConfirmationDialog draft={draft} reference={reference} onClose={() => setReference(null)} />
      ) : null}
    </>
  );
}

/**
 * Stands in for the reference the server would issue.
 *
 * Deliberately not persisted and deliberately labelled in the dialog: until
 * `booking.requestAppointment` exists there is no appointment row and no real
 * reference to show.
 */
function placeholderReference(): string {
  return `CD${Math.floor(100000 + Math.random() * 899999)}`;
}
