'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState, type ReactNode } from 'react';

import { ArrowRight, SearchIcon } from '@/components/ui/icons';
import { LoadingPanel } from '@/components/ui/spinner';
import { StatusBadge } from '@/components/ui/status-badge';

import { useAgencies, useCampaigns, usePulseOverview } from '../hooks';
import { AddAgencyDialog, CreateCampaignDialog } from './dialogs';
import { copyLink, CostMetrics, Panel, StatCards, StateBadge, useOrigin } from './pieces';

const TABS = [
  { value: 'overview', label: 'Overview' },
  { value: 'campaigns', label: 'Campaigns' },
  { value: 'agencies', label: 'Agencies' },
] as const;
type Tab = (typeof TABS)[number]['value'];

/**
 * IA: 9. Pulse -- Overview, Campaigns and Agencies. The tab lives in the URL
 * so "View all" and Back land on the right one.
 */
export function CampaignsScreen() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const tab: Tab = TABS.find((entry) => entry.value === params.get('tab'))?.value ?? 'overview';
  const go = (next: Tab) => router.replace(`${pathname}?tab=${next}` as Route, { scroll: false });

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-ink-900">Campaigns &amp; Analytics</h2>
        <p className="mt-0.5 text-xs text-ink-500">Track how your campaigns are driving appointment activity.</p>
      </div>

      <div role="tablist" aria-label="Campaigns & Analytics" className="inline-flex rounded-field border border-line bg-white p-1">
        {TABS.map((entry) => (
          <button
            key={entry.value}
            type="button"
            role="tab"
            aria-selected={tab === entry.value}
            onClick={() => go(entry.value)}
            className={`rounded-[0.5rem] px-4 py-1.5 text-xs font-semibold transition-colors ${
              tab === entry.value ? 'bg-brand-600 text-white' : 'text-ink-700 hover:text-brand-600'
            }`}
          >
            {entry.label}
          </button>
        ))}
      </div>

      {tab === 'overview' ? <Overview onViewAll={() => go('campaigns')} /> : null}
      {tab === 'campaigns' ? <CampaignList /> : null}
      {tab === 'agencies' ? <AgencyList /> : null}
    </div>
  );
}

function Overview({ onViewAll }: { onViewAll: () => void }) {
  const overview = usePulseOverview();
  if (!overview.data) return <State error={Boolean(overview.error)} />;
  const data = overview.data;

  return (
    <div className="space-y-5">
      <StatCards stats={data} spendLabel="Total Budget" />
      <CostMetrics stats={data} />
      <Panel
        title="Active Campaigns"
        action={
          <button type="button" onClick={onViewAll} className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline">
            View all <ArrowRight className="h-3.5 w-3.5" />
          </button>
        }
      >
        {data.active.length === 0 ? (
          <p className="py-4 text-center text-sm text-ink-500">No campaign is running right now.</p>
        ) : (
          <ul className="space-y-3">
            {data.active.map((campaign) => (
              <li key={campaign.id}>
                <Link
                  href={`/provider/campaigns/${campaign.id}` as Route}
                  className="flex items-center justify-between gap-3 rounded-field border border-line bg-[#fdf9fa] px-4 py-3 transition-colors hover:border-brand-200"
                >
                  <span>
                    <span className="block text-sm font-bold text-ink-900">{campaign.name}</span>
                    <span className="text-xs text-ink-500">
                      {campaign.clicks.toLocaleString('en-US')} clicks · {campaign.requests} requests · {campaign.confirmed} confirmed
                    </span>
                  </span>
                  <StateBadge state={campaign.state} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function CampaignList() {
  const campaigns = useCampaigns();
  const origin = useOrigin();
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-4">
      <Header
        title="Campaigns"
        caption="Create and track campaigns that drive appointment activity."
        action="Create Campaign"
        onAction={() => setCreating(true)}
      />
      {!campaigns.data ? (
        <State error={Boolean(campaigns.error)} />
      ) : campaigns.data.length === 0 ? (
        <Empty>No campaigns yet. Create one to get a tracking link.</Empty>
      ) : (
        <Table headings={['Campaign', 'Status', 'Clicks', 'Requests', 'Confirmed', 'Tracking Link', '']}>
          {campaigns.data.map((campaign) => {
            const url = campaign.tracking_path ? `${origin}${campaign.tracking_path}` : null;
            return (
              <tr key={campaign.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3 font-bold text-ink-900">{campaign.name}</td>
                <td className="px-4 py-3">
                  <StateBadge state={campaign.state} />
                </td>
                <td className="px-4 py-3 text-ink-700">{campaign.clicks.toLocaleString('en-US')}</td>
                <td className="px-4 py-3 text-ink-700">{campaign.requests}</td>
                <td className="px-4 py-3 text-ink-700">{campaign.confirmed}</td>
                <td className="px-4 py-3">
                  {url ? (
                    <span className="flex items-center gap-2">
                      <span className="max-w-[11rem] truncate text-ink-500" title={url}>
                        {url.replace(/^https?:\/\//, '')}
                      </span>
                      <button type="button" onClick={() => void copyLink(url)} className="text-xs font-semibold text-brand-600 hover:underline">
                        Copy
                      </button>
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/provider/campaigns/${campaign.id}` as Route}
                    className="inline-block rounded-field border border-brand-600 px-4 py-2 text-xs font-semibold text-brand-600 transition-colors hover:bg-brand-50"
                  >
                    View Report
                  </Link>
                </td>
              </tr>
            );
          })}
        </Table>
      )}
      {creating ? <CreateCampaignDialog onClose={() => setCreating(false)} /> : null}
    </div>
  );
}

function AgencyList() {
  const agencies = useAgencies();
  const [adding, setAdding] = useState(false);
  const [term, setTerm] = useState('');
  const shown = (agencies.data ?? []).filter((agency) => agency.name.toLowerCase().includes(term.trim().toLowerCase()));

  return (
    <div className="space-y-4">
      <Header title="Agencies" caption="Connect and manage your marketing agency partners." action="Add Agency" onAction={() => setAdding(true)} />
      <label className="flex w-full max-w-xs items-center gap-2 rounded-field border border-line bg-white px-3 py-2.5">
        <SearchIcon className="h-4 w-4 text-ink-500" />
        <input
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Search agency…"
          aria-label="Search agencies"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-300"
        />
      </label>
      {!agencies.data ? (
        <State error={Boolean(agencies.error)} />
      ) : shown.length === 0 ? (
        <Empty>{term ? 'No agency matches that search.' : 'No agencies yet. Add the partners who run your marketing.'}</Empty>
      ) : (
        <Table headings={['Agency', 'Status', 'Campaigns', 'Last Activity', '']}>
          {shown.map((agency) => (
            <tr key={agency.id} className="border-b border-line last:border-0">
              <td className="px-4 py-3">
                <span className="flex items-center gap-2.5 font-bold text-ink-900">
                  <span className="flex h-7 w-7 items-center justify-center rounded-[0.375rem] bg-brand-600 text-[0.625rem] font-bold text-white">
                    {agency.name.split(/\s+/).map((word) => word[0]).slice(0, 2).join('').toUpperCase()}
                  </span>
                  {agency.name}
                </span>
              </td>
              <td className="px-4 py-3">
                <StatusBadge tone={agency.status === 'active' ? 'success' : 'neutral'}>
                  {agency.status === 'active' ? 'Active' : 'Inactive'}
                </StatusBadge>
              </td>
              <td className="px-4 py-3 text-ink-700">{agency.campaigns}</td>
              <td className="px-4 py-3 text-ink-700">
                {agency.last_activity_at
                  ? new Date(agency.last_activity_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
                  : '—'}
              </td>
              <td className="px-4 py-3 text-right">
                <Link
                  href={`/provider/campaigns/agencies/${agency.id}` as Route}
                  className="inline-block rounded-field border border-brand-600 px-5 py-2 text-xs font-semibold text-brand-600 transition-colors hover:bg-brand-50"
                >
                  View
                </Link>
              </td>
            </tr>
          ))}
        </Table>
      )}
      {adding ? <AddAgencyDialog onClose={() => setAdding(false)} /> : null}
    </div>
  );
}

function Header({ title, caption, action, onAction }: { title: string; caption: string; action: string; onAction: () => void }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h3 className="text-base font-bold text-ink-900">{title}</h3>
        <p className="text-xs text-ink-500">{caption}</p>
      </div>
      <button
        type="button"
        onClick={onAction}
        className="rounded-field bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
      >
        + {action}
      </button>
    </div>
  );
}

function Table({ headings, children }: { headings: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-card border border-line bg-white">
      <table className="w-full min-w-[44rem] text-left text-[0.8125rem]">
        <thead className="border-b border-line text-[0.6875rem] uppercase tracking-wide text-ink-500">
          <tr>
            {headings.map((heading, index) => (
              <th key={index} scope="col" className="px-4 py-3 font-semibold">
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function State({ error }: { error: boolean }) {
  return error ? <Empty>This could not be loaded. Refresh to try again.</Empty> : <LoadingPanel label="Loading…" rows={4} />;
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-card border border-dashed border-line bg-white px-6 py-10 text-center text-sm text-ink-500">{children}</p>;
}
