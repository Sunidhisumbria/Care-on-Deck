'use client';

import { z } from 'zod';

import { Field } from '@/components/ui/field';
import { useApiForm } from '@/lib/forms/use-api-form';
import { ChevronRight } from '@/components/ui/icons';
import { UnavailableUpload } from '@/components/ui/unavailable-upload';

import { useBooking } from '../booking-state';
import { ProviderSummary } from '../components/provider-summary';

const insuranceSchema = z.object({
  carrier: z.string().trim().min(1, 'Enter your carrier name.').max(160),
  member_id: z.string().trim().min(1, 'Enter your member ID.').max(64),
  group_number: z.string().trim().max(64).optional().or(z.literal('')),
});

/**
 * Step six, and the last one before confirmation.
 *
 * The card upload is visibly inert rather than hidden. There is no media
 * service, no storage bucket and no `phi_access_logs` path for an uploaded
 * insurance card -- and an insurance card is exactly the kind of document that
 * needs all three before it is accepted. A control that silently dropped the
 * file would be worse than one that says it is not ready.
 */
export function InsuranceStep({ onBooked }: { onBooked: () => void }) {
  const { draft, set } = useBooking();

  const { register, formState, submit, error } = useApiForm(insuranceSchema, {
    carrier: draft.insurance?.carrier ?? '',
    member_id: draft.insurance?.member_id ?? '',
    group_number: draft.insurance?.group_number ?? '',
  });

  if (!draft.provider) return null;

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 lg:px-8">
      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <ProviderSummary
          provider={draft.provider}
          reason={draft.reason}
          onEditReason={() => history.back()}
        />

        <form
          noValidate
          onSubmit={submit(async (values) => {
            set('insurance', { ...values, group_number: values.group_number ?? '' });
            onBooked();
          })}
          className="space-y-4"
        >
          <Field
            label="Carrier Name"
            placeholder="Carrier name"
            error={error('carrier')}
            {...register('carrier')}
          />
          <Field
            label="Member ID"
            placeholder="Member ID"
            error={error('member_id')}
            {...register('member_id')}
          />
          <Field
            label="Group Number"
            placeholder="DFG34567"
            error={error('group_number')}
            {...register('group_number')}
          />

          <UnavailableUpload
            layout="row"
            label="Upload Insurance Card"
            note="Card upload is not available yet. Your carrier and member ID are enough to book; the practice will confirm cover before your visit."
          />

          <button
            type="submit"
            disabled={formState.isSubmitting}
            className="flex w-full items-center justify-center gap-1.5 rounded-field bg-brand-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
          >
            Save And Book Now
            <ChevronRight className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
