'use client';

import type { ReactNode } from 'react';

import { Field, SelectField } from '@/components/ui/field';
import { ChevronRight } from '@/components/ui/icons';
import { useApiForm } from '@/lib/forms/use-api-form';
import {
  CARRIER_NOT_LISTED,
  INSURANCE_TYPES,
  RELATIONSHIPS,
  insuranceFormSchema,
  toInsuranceInput,
} from '@/lib/patient-insurance';
import { LoadingPanel } from '@/components/ui/spinner';

import { useInsuranceCarriers, useSaveInsurance } from '../hooks';
import type { InsuranceCarrier, InsuranceType, SavedInsurance, SavedInsuranceDetail } from '../types';
import { PrimaryButton } from './buttons';

interface FormProps {
  insuranceType: InsuranceType;
  /** The card being changed, with its full member ID. Absent when adding. */
  editing?: SavedInsuranceDetail | null;
  /** Above the fields: the card photo to copy from, when there is one. */
  notice?: ReactNode;
  /** Beside Save: "Retake card photo", when there is one. */
  secondaryAction?: ReactNode;
  onSaved: (saved: SavedInsurance) => void;
}

/**
 * The insurance fields, for manual entry and for reviewing a card photo alike.
 *
 * Waits for the carrier list before rendering: a native select given a default
 * value before its options exist silently shows the placeholder instead.
 */
export function InsuranceForm(props: FormProps) {
  const carriers = useInsuranceCarriers();

  if (carriers.isPending) {
    return <LoadingPanel label="Loading insurance companies…" rows={5} />;
  }
  if (carriers.error) {
    return (
      <p className="rounded-card border border-line bg-white p-4 text-sm text-ink-500">
        The insurance carrier list could not be loaded. Refresh to try again.
      </p>
    );
  }
  return <Fields {...props} carriers={carriers.data} />;
}

function Fields({
  carriers,
  insuranceType,
  editing,
  notice,
  secondaryAction,
  onSaved,
}: FormProps & { carriers: InsuranceCarrier[] }) {
  const save = useSaveInsurance();

  const { register, watch, formState, submit, error } = useApiForm(insuranceFormSchema, {
    insurance_type: editing?.insurance_type ?? insuranceType,
    carrier_id: editing ? (editing.carrier.id ?? CARRIER_NOT_LISTED) : '',
    carrier_name: editing && !editing.carrier.id ? editing.carrier.name : '',
    member_id: editing?.member_id ?? '',
    group_id: editing?.group_id ?? '',
    policyholder_name: editing?.policyholder_name ?? '',
    relationship: editing?.relationship ?? undefined,
  });

  const notListed = watch('carrier_id') === CARRIER_NOT_LISTED;

  return (
    <form
      noValidate
      onSubmit={submit(async (values) => {
        onSaved(await save.mutateAsync({ id: editing?.id, body: toInsuranceInput(values) }));
      })}
      className="space-y-4"
    >
      {notice}

      <SelectField
        label="Insurance type *"
        placeholder="Select insurance type"
        options={INSURANCE_TYPES.map((type) => ({ value: type.value, label: type.label }))}
        error={error('insurance_type')}
        {...register('insurance_type')}
      />

      <SelectField
        label="Insurance carrier *"
        placeholder="Select insurance provider"
        options={[
          ...carriers.map((carrier) => ({ value: carrier.id, label: carrier.name })),
          { value: CARRIER_NOT_LISTED, label: 'My carrier isn’t listed' },
        ]}
        error={error('carrier_id')}
        {...register('carrier_id')}
      />

      {notListed ? (
        <Field
          label="Carrier name *"
          placeholder="As printed on your card"
          autoComplete="off"
          error={error('carrier_name')}
          {...register('carrier_name')}
        />
      ) : null}

      <Field
        label="Member ID *"
        placeholder="Enter your member ID"
        autoComplete="off"
        spellCheck={false}
        error={error('member_id')}
        {...register('member_id')}
      />

      <Field
        label="Group ID (optional)"
        placeholder="Enter your group ID"
        autoComplete="off"
        spellCheck={false}
        error={error('group_id')}
        {...register('group_id')}
      />

      <Field
        label="Policyholder name (optional)"
        placeholder="Enter policyholder name"
        autoComplete="off"
        error={error('policyholder_name')}
        {...register('policyholder_name')}
      />

      <SelectField
        label="Relationship to policyholder *"
        placeholder="Select relationship to policyholder"
        options={RELATIONSHIPS.map((entry) => ({ value: entry.value, label: entry.label }))}
        error={error('relationship')}
        {...register('relationship')}
      />

      <div className={secondaryAction ? 'grid gap-3 pt-2 sm:grid-cols-2' : 'pt-2'}>
        {secondaryAction}
        <PrimaryButton type="submit" pending={formState.isSubmitting}>
          {formState.isSubmitting ? (
            'Saving…'
          ) : (
            <>
              Save insurance information
              <ChevronRight className="h-4 w-4" />
            </>
          )}
        </PrimaryButton>
      </div>
    </form>
  );
}
