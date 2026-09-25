'use client';

import { LoadingPanel } from '@/components/ui/spinner';
import { CAMPAIGN_TYPES, labelFor } from '@/lib/pulse';

import { useCampaign } from '../hooks';
import type { CampaignSummary } from '../types';
import { copyLink, CostMetrics, money, StatCards, StateBadge, useOrigin } from './pieces';

/** IA: 9. Campaign Report. Export downloads the same numbers as a CSV. */
export function CampaignReport({ id }: { id: string }) {
  const campaign = useCampaign(id);
  const origin = useOrigin();

  if (!campaign.data) {
    return campaign.error ? (
      <p className="rounded-card border border-line bg-white px-6 py-10 text-center text-sm text-ink-500">That campaign was not found.</p>
    ) : (
      <LoadingPanel label="Loading report…" rows={6} />
    );
  }

  const data = campaign.data;
  const url = data.tracking_path ? `${origin}${data.tracking_path}` : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-ink-900">{data.name} — Campaign Report</h2>
          <p className="mt-1 flex items-center gap-2 text-xs text-ink-500">
            <StateBadge state={data.state} />
            {data.starts_on ? `Started ${formatDay(data.starts_on)}` : null}
            {data.campaign_type ? ` · ${labelFor(CAMPAIGN_TYPES, data.campaign_type)}` : null}
          </p>
        </div>
        <button
          type="button"
          onClick={() => exportCsv(data, url)}
          className="rounded-field border border-line bg-white px-4 py-2 text-xs font-semibold text-ink-700 transition-colors hover:border-brand-300"
        >
          ⤓ Export Report
        </button>
      </div>

      {url ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-brand-200 bg-brand-50 px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-brand-700">Tracking Link</p>
            <p className="truncate text-sm text-ink-900">{url.replace(/^https?:\/\//, '')}</p>
          </div>
          <button
            type="button"
            onClick={() => void copyLink(url)}
            className="rounded-field border border-line bg-white px-4 py-2 text-xs font-semibold text-ink-700 transition-colors hover:border-brand-300"
          >
            Copy Link
          </button>
        </div>
      ) : null}

      <StatCards stats={data} spendLabel="Budget" />
      <CostMetrics stats={data} />
      {data.description ? <p className="text-sm text-ink-500">{data.description}</p> : null}
    </div>
  );
}

function formatDay(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** A one-row CSV of the report, built in the browser; nothing extra is sent anywhere. */
function exportCsv(data: CampaignSummary, url: string | null) {
  const cells: Array<[string, string | number]> = [
    ['Campaign', data.name],
    ['Status', data.state],
    ['Start', data.starts_on ?? ''],
    ['End', data.ends_on ?? ''],
    ['Budget', money(data.spend_cents)],
    ['Clicks', data.clicks],
    ['Appointment requests', data.requests],
    ['Confirmed appointments', data.confirmed],
    ['Cost per click', money(data.cost_per_click_cents, { always: true })],
    ['Cost per request', money(data.cost_per_request_cents, { always: true })],
    ['Cost per confirmed appointment', money(data.cost_per_confirmed_cents, { always: true })],
    ['Tracking link', url ?? ''],
  ];
  const quote = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
  const csv = `${cells.map(([label]) => quote(label)).join(',')}\n${cells.map(([, value]) => quote(value)).join(',')}\n`;
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  link.download = `${data.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-report.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}
