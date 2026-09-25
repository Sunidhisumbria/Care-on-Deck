'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { toast } from 'sonner';

import { StatusBadge } from '@/components/ui/status-badge';

import type { CampaignStats, CampaignSummary } from '../types';

/** 245000 -> "$2,450"; 75 -> "$0.75". Whole dollars drop the cents. */
export function money(cents: number | null, { always = false }: { always?: boolean } = {}): string {
  if (cents === null) return '—';
  const whole = cents % 100 === 0 && !always;
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 })}`;
}

export function StateBadge({ state }: { state: CampaignSummary['state'] }) {
  if (state === 'active') return <StatusBadge tone="success">Active</StatusBadge>;
  if (state === 'scheduled') return <StatusBadge tone="brand">Scheduled</StatusBadge>;
  return <StatusBadge tone="neutral">Ended</StatusBadge>;
}

/** The four headline numbers. Spend is labelled for what it is: the budget. */
export function StatCards({ stats, spendLabel }: { stats: CampaignStats; spendLabel: string }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Stat emoji="💰" tint="bg-rose-50" value={money(stats.spend_cents)} tone="text-brand-700" label={spendLabel} />
      <Stat emoji="👆" tint="bg-blue-50" value={stats.clicks.toLocaleString('en-US')} tone="text-blue-600" label="Clicks" />
      <Stat emoji="📅" tint="bg-emerald-50" value={stats.requests.toLocaleString('en-US')} tone="text-emerald-600" label="Appointment Requests" />
      <Stat emoji="✔️" tint="bg-amber-50" value={stats.confirmed.toLocaleString('en-US')} tone="text-amber-600" label="Confirmed Appts" />
    </div>
  );
}

function Stat({ emoji, tint, value, tone, label }: { emoji: string; tint: string; value: string; tone: string; label: string }) {
  return (
    <div className="rounded-card border border-line bg-white p-4">
      <span aria-hidden="true" className={`flex h-8 w-8 items-center justify-center rounded-field text-base ${tint}`}>
        {emoji}
      </span>
      <p className={`mt-3 text-2xl font-extrabold ${tone}`}>{value}</p>
      <p className="text-xs text-ink-500">{label}</p>
    </div>
  );
}

/** Budget divided by what it bought. A dash where there is nothing to divide by yet. */
export function CostMetrics({ stats }: { stats: CampaignStats }) {
  const items: Array<[string, number | null]> = [
    ['Cost per Click', stats.cost_per_click_cents],
    ['Cost per Request', stats.cost_per_request_cents],
    ['Cost per Confirmed Appt', stats.cost_per_confirmed_cents],
  ];
  return (
    <Panel title="Cost Metrics">
      <div className="grid gap-3 sm:grid-cols-3">
        {items.map(([label, cents]) => (
          <div key={label} className="rounded-field border border-brand-100 bg-[#fdf6f8] px-4 py-3">
            <p className="text-xl font-extrabold text-brand-700">{money(cents, { always: true })}</p>
            <p className="text-xs text-ink-500">{label}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

export function Panel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-card border border-line bg-white p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold text-ink-900">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/** The site's own origin, known only in the browser; empty on the server render. */
export function useOrigin(): string {
  const [origin, setOrigin] = useState('');
  useEffect(() => setOrigin(window.location.origin), []);
  return origin;
}

export async function copyLink(url: string) {
  try {
    await navigator.clipboard.writeText(url);
    toast.success('Link copied.');
  } catch {
    toast.error('Could not copy. Select the link and copy it instead.');
  }
}
