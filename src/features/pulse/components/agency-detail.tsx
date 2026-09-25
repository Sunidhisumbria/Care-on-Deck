'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';

import { ChevronLeft } from '@/components/ui/icons';
import { Busy, LoadingPanel } from '@/components/ui/spinner';
import { StatusBadge } from '@/components/ui/status-badge';
import { Dialog } from '@/features/practice/components/shared';
import { toApiError } from '@/lib/http/errors';
import { formatUsPhone } from '@/lib/practice';

import { useAgency, useRemoveAgency } from '../hooks';
import type { AgencyDetail as Agency } from '../types';
import { AddAgencyDialog } from './dialogs';
import { StateBadge } from './pieces';

/** IA: 9. Agency Detail > Engagement History. */
export function AgencyDetail({ id }: { id: string }) {
  const agency = useAgency(id);
  const [dialog, setDialog] = useState<'edit' | 'remove' | null>(null);

  if (!agency.data) {
    return agency.error ? (
      <p className="rounded-card border border-line bg-white px-6 py-10 text-center text-sm text-ink-500">That agency was not found.</p>
    ) : (
      <LoadingPanel label="Loading agency…" rows={6} />
    );
  }

  const data = agency.data;
  const initials = data.name.split(/\s+/).map((word) => word[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="space-y-5">
      <Link
        href={'/provider/campaigns?tab=agencies' as Route}
        className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline"
      >
        <ChevronLeft className="h-4 w-4" /> All agencies
      </Link>
      <h2 className="text-lg font-bold text-ink-900">Agency Overview</h2>

      <section className="flex flex-wrap items-center gap-4 rounded-card border border-line bg-white p-5">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-card bg-brand-600 text-lg font-bold text-white">
          {initials}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold text-ink-900">{data.name}</p>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-500">
            <StatusBadge tone={data.status === 'active' ? 'success' : 'neutral'}>
              {data.status === 'active' ? 'Active' : 'Inactive'}
            </StatusBadge>
            {data.campaigns} {data.campaigns === 1 ? 'campaign' : 'campaigns'}
            {data.last_activity_at ? ` · Last active ${formatDay(data.last_activity_at)}` : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setDialog('edit')}
            className="rounded-field border border-line bg-white px-4 py-2 text-xs font-semibold text-ink-700 transition-colors hover:border-brand-300"
          >
            Edit
          </button>
          {data.status === 'active' ? (
            <button
              type="button"
              onClick={() => setDialog('remove')}
              className="rounded-field border border-red-200 bg-white px-4 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50"
            >
              Remove
            </button>
          ) : null}
        </div>
      </section>

      <Section title="Contact Information">
        <dl className="divide-y divide-line">
          <Row label="Contact">{data.contact_name}</Row>
          <Row label="Email">{data.contact_email}</Row>
          <Row label="Phone">{data.contact_phone ? formatUsPhone(data.contact_phone) : null}</Row>
          <Row label="Website">{data.website?.replace(/^https?:\/\//, '')}</Row>
        </dl>
        {data.notes ? <p className="mt-3 whitespace-pre-line text-sm text-ink-500">{data.notes}</p> : null}
      </Section>

      <Section title="Campaign Activity">
        {data.campaigns_list.length === 0 ? (
          <p className="text-sm text-ink-500">No campaigns yet. Choose this agency when you create a campaign.</p>
        ) : (
          <ul className="space-y-3">
            {data.campaigns_list.map((campaign) => (
              <li key={campaign.id}>
                <Link
                  href={`/provider/campaigns/${campaign.id}` as Route}
                  className="flex items-center justify-between gap-3 rounded-field border border-line bg-[#fdf9fa] px-4 py-3 transition-colors hover:border-brand-200"
                >
                  <span>
                    <span className="block text-sm font-bold text-ink-900">{campaign.name}</span>
                    <span className="text-xs text-ink-500">{campaign.clicks.toLocaleString('en-US')} clicks</span>
                  </span>
                  <StateBadge state={campaign.state} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Engagement History">
        {data.history.length === 0 ? (
          <p className="text-sm text-ink-500">Nothing recorded yet.</p>
        ) : (
          <ol className="space-y-3">
            {data.history.map((entry, index) => (
              <li key={`${entry.occurred_at}-${index}`} className="flex items-start gap-3 text-sm">
                <span aria-hidden="true" className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-400" />
                <span className="min-w-0 flex-1 text-ink-700">{entry.summary ?? entry.kind}</span>
                <span className="shrink-0 text-xs text-ink-500">{formatDay(entry.occurred_at)}</span>
              </li>
            ))}
          </ol>
        )}
      </Section>

      {dialog === 'edit' ? <AddAgencyDialog agency={data} onClose={() => setDialog(null)} /> : null}
      {dialog === 'remove' ? <RemoveDialog agency={data} onClose={() => setDialog(null)} /> : null}
    </div>
  );
}

/** Ends the partnership. Nothing is deleted: the agency stays listed as inactive, with its history. */
function RemoveDialog({ agency, onClose }: { agency: Agency; onClose: () => void }) {
  const remove = useRemoveAgency(agency.id);

  function onRemove() {
    remove.mutate(undefined, {
      onSuccess: () => {
        toast.success(`${agency.name} is no longer a partner.`);
        onClose();
      },
      onError: (error) => toast.error(toApiError(error).message),
    });
  }

  return (
    <Dialog
      title={`Remove ${agency.name}?`}
      subtitle="They'll be listed as inactive. Their past campaigns and history stay on record."
      onClose={onClose}
      wide
    >
      <button
        type="button"
        onClick={onRemove}
        disabled={remove.isPending}
        className="w-full rounded-field bg-red-500 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-60"
      >
        {remove.isPending ? <Busy>Removing…</Busy> : 'Remove Agency'}
      </button>
      <button type="button" onClick={onClose} className="mt-2 w-full py-1 text-sm font-semibold text-ink-700 hover:text-brand-600">
        Keep Agency
      </button>
    </Dialog>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-card border border-line bg-white p-5">
      <h3 className="mb-3 text-sm font-bold text-ink-900">{title}</h3>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 text-sm">
      <dt className="text-ink-500">{label}</dt>
      <dd className="text-right font-semibold text-ink-900">{children || '—'}</dd>
    </div>
  );
}

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
