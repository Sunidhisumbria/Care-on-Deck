import type { ReactNode } from 'react';

import { ShieldCheckIcon } from '@/components/ui/icons';
import { labelForInsuranceType, labelForRelationship } from '@/lib/patient-insurance';

import type { SavedInsurance } from '../types';

/** Carrier and type, with the shield. The top of every saved-card view. */
export function InsuranceHeading({ insurance }: { insurance: SavedInsurance }) {
  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden="true"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-field bg-brand-50 text-brand-600"
      >
        <ShieldCheckIcon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-ink-900">{insurance.carrier.name}</p>
        <p className="text-xs text-ink-500">{labelForInsuranceType(insurance.insurance_type)}</p>
      </div>
    </div>
  );
}

/** The saved values. The member ID is only ever its last four here. */
export function InsuranceDetails({
  insurance,
  size = 'xs',
  className = '',
}: {
  insurance: SavedInsurance;
  size?: 'xs' | 'sm';
  className?: string;
}) {
  return (
    <dl className={`space-y-2 ${size === 'sm' ? 'text-sm' : 'text-xs'} ${className}`}>
      <Row label="Member ID">{insurance.member_id_last4 ? `•••• ${insurance.member_id_last4}` : '—'}</Row>
      <Row label="Group ID">{insurance.group_id ?? '—'}</Row>
      <Row label="Policyholder">{insurance.policyholder_name ?? '—'}</Row>
      <Row label="Relationship">{labelForRelationship(insurance.relationship) ?? '—'}</Row>
    </dl>
  );
}

/** A saved card with its actions, as the Insurance screen and booking show it. */
export function InsuranceCard({ insurance, actions }: { insurance: SavedInsurance; actions?: ReactNode }) {
  return (
    <article className="rounded-card border border-line bg-white p-5">
      <InsuranceHeading insurance={insurance} />
      <InsuranceDetails insurance={insurance} size="sm" className="mt-4" />
      {actions ? (
        <div className="mt-5 flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:justify-end">{actions}</div>
      ) : null}
    </article>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="shrink-0 text-ink-500">{label}</dt>
      <dd className="min-w-0 break-words text-right font-semibold text-ink-900">{children}</dd>
    </div>
  );
}
