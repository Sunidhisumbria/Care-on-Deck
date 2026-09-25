'use client';

import { toast } from 'sonner';

import { Field, PhoneField, SelectField, TextAreaField } from '@/components/ui/field';
import { Busy } from '@/components/ui/spinner';
import { Dialog } from '@/features/practice/components/shared';
import { useApiForm } from '@/lib/forms/use-api-form';
import { formatUsPhone } from '@/lib/practice';
import {
  addAgencySchema,
  AGENCY_TYPES,
  CAMPAIGN_TYPES,
  createCampaignSchema,
  type AddAgencyValues,
  type CreateCampaignValues,
} from '@/lib/pulse';

import { useAddAgency, useAgencies, useCreateCampaign, useUpdateAgency } from '../hooks';
import type { AgencySummary } from '../types';

export function CreateCampaignDialog({ onClose }: { onClose: () => void }) {
  const create = useCreateCampaign();
  // Only current partners can be given new work.
  const partners = (useAgencies().data ?? []).filter((agency) => agency.status === 'active');
  const { register, submit, error, formState } = useApiForm(createCampaignSchema, {
    name: '',
    starts_on: '',
    ends_on: '',
    budget: '',
    description: '',
    agency_id: '',
  });

  const onSubmit = submit(async (values) => {
    await create.mutateAsync(values as CreateCampaignValues);
    toast.success('Campaign created. Share its tracking link to start counting clicks.');
    onClose();
  });

  return (
    <Dialog title="Create Campaign" onClose={onClose} wide>
      <form noValidate onSubmit={onSubmit} className="space-y-4">
        <Field label="Campaign Name" placeholder="Enter campaign name" error={error('name')} {...register('name')} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start Date" type="date" error={error('starts_on')} {...register('starts_on')} />
          <Field label="End Date" type="date" error={error('ends_on')} {...register('ends_on')} />
        </div>
        <SelectField
          label="Campaign / Promotion Type"
          placeholder="Select campaign type"
          options={CAMPAIGN_TYPES.map((type) => ({ value: type.value, label: type.label }))}
          error={error('campaign_type')}
          {...register('campaign_type')}
        />
        {partners.length > 0 ? (
          <SelectField
            label="Agency (optional)"
            placeholder="Run by your practice"
            options={[{ value: '', label: 'No agency' }, ...partners.map((agency) => ({ value: agency.id, label: agency.name }))]}
            error={error('agency_id')}
            {...register('agency_id')}
          />
        ) : null}
        <Field
          label="Budget (optional)"
          placeholder="e.g. $500"
          inputMode="decimal"
          hint="Used as the campaign's spend for cost per click and per appointment."
          error={error('budget')}
          {...register('budget')}
        />
        <TextAreaField
          label="Campaign Description"
          placeholder="Briefly describe the campaign goal…"
          rows={3}
          error={error('description')}
          {...register('description')}
        />
        <Actions onCancel={onClose} pending={formState.isSubmitting} label="Create Campaign" />
      </form>
    </Dialog>
  );
}

/** Add Agency, or -- given `agency` -- Edit, with the same fields and rules. */
export function AddAgencyDialog({ onClose, agency }: { onClose: () => void; agency?: AgencySummary }) {
  const add = useAddAgency();
  const update = useUpdateAgency(agency?.id ?? '');
  const { register, submit, error, formState } = useApiForm(addAgencySchema, {
    name: agency?.name ?? '',
    agency_type: (agency?.agency_type ?? undefined) as AddAgencyValues['agency_type'] | undefined,
    contact_name: agency?.contact_name ?? '',
    contact_email: agency?.contact_email ?? '',
    phone: agency?.contact_phone ? formatUsPhone(agency.contact_phone) : '',
    website: agency?.website ?? '',
    notes: agency?.notes ?? '',
  });

  const onSubmit = submit(async (values) => {
    if (agency) await update.mutateAsync(values as AddAgencyValues);
    else await add.mutateAsync(values as AddAgencyValues);
    toast.success(agency ? 'Agency updated.' : 'Agency added.');
    onClose();
  });

  return (
    <Dialog title={agency ? 'Edit Agency' : 'Add Agency'} onClose={onClose} wide>
      <form noValidate onSubmit={onSubmit} className="space-y-4">
        <Field label="Agency Name" placeholder="e.g. ABC Marketing" error={error('name')} {...register('name')} />
        <SelectField
          label="Agency Type"
          placeholder="Select type"
          options={AGENCY_TYPES.map((type) => ({ value: type.value, label: type.label }))}
          error={error('agency_type')}
          {...register('agency_type')}
        />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Contact Name" placeholder="Full name" error={error('contact_name')} {...register('contact_name')} />
          <Field
            label="Contact Email"
            type="email"
            placeholder="agency@example.com"
            error={error('contact_email')}
            {...register('contact_email')}
          />
        </div>
        <PhoneField label="Phone Number" placeholder="(555) 000-0000" error={error('phone')} {...register('phone')} />
        <Field label="Website" placeholder="https://agency.com" error={error('website')} {...register('website')} />
        <TextAreaField
          label="Notes (optional)"
          placeholder="Any notes about this agency partnership…"
          rows={3}
          error={error('notes')}
          {...register('notes')}
        />
        <Actions onCancel={onClose} pending={formState.isSubmitting} label={agency ? 'Save Changes' : 'Add Agency'} />
      </form>
    </Dialog>
  );
}

function Actions({ onCancel, pending, label }: { onCancel: () => void; pending: boolean; label: string }) {
  return (
    <div className="grid grid-cols-2 gap-3 pt-2">
      <button
        type="button"
        onClick={onCancel}
        className="rounded-field border border-brand-600 py-3 text-sm font-semibold text-brand-600 transition-colors hover:bg-brand-50"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={pending}
        className="rounded-field bg-brand-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? <Busy>Saving…</Busy> : label}
      </button>
    </div>
  );
}
