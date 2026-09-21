'use client';
import { Avatar } from '@/components/ui/avatar';
import { GlobeIcon, PinIcon, ScreenIcon, StethoscopeIcon } from '@/components/ui/icons';

import type { BookableProvider, VisitReasonOption } from '../types';
import { ReasonIcon } from './reason-icon';

/**
 * The card that follows you down the left of every step after the first.
 *
 * It is the flow's memory: six screens is long enough to forget which doctor
 * you picked, and long enough that being shown it is the difference between
 * finishing and starting over.
 *
 * Rows with nothing behind them are left out rather than filled in -- a doctor
 * who has not listed their languages shows no language row.
 */
export function ProviderSummary({
  provider,
  reason,
  onEditReason,
}: {
  provider: BookableProvider;
  reason?: VisitReasonOption | null;
  onEditReason?: () => void;
}) {
  const where = [provider.facility.city, provider.facility.state].filter(Boolean).join(', ');

  return (
    <aside className="space-y-4">
      <div className="rounded-card border border-line bg-white p-5 text-center">
        <Avatar name={provider.name} className="mx-auto h-[72px] w-[72px] text-lg" />
        <p className="mt-3 text-sm font-bold text-ink-900">{provider.name}</p>
        <p className="mt-1 text-xs text-ink-500">
          {provider.specialty ?? 'General practice'}
          <span className="px-1 text-ink-300">•</span> In-person
        </p>

        <dl className="mt-4 space-y-2 border-t border-line pt-4 text-left text-xs text-ink-500">
          <Row icon={<StethoscopeIcon className="h-3.5 w-3.5" />}>{provider.facility.name}</Row>
          {where ? <Row icon={<PinIcon className="h-3.5 w-3.5" />}>{where}</Row> : null}
          <Row icon={<ScreenIcon className="h-3.5 w-3.5" />}>In-person visit</Row>
          {provider.languages.length > 0 ? (
            <Row icon={<GlobeIcon className="h-3.5 w-3.5" />}>{provider.languages.join(', ')}</Row>
          ) : null}
        </dl>
      </div>

      {reason ? (
        <div className="rounded-card border border-line bg-white p-4">
          <div className="flex items-start gap-3">
            <ReasonIcon reason={reason.name} className="h-10 w-10" />
            <div className="min-w-0">
              <p className="text-sm font-bold text-ink-900">{reason.name}</p>
              <p className="mt-0.5 text-xs text-ink-500">{reason.description}</p>
              {onEditReason ? (
                <button
                  type="button"
                  onClick={onEditReason}
                  className="mt-2 text-xs font-semibold text-brand-600 hover:underline"
                >
                  Edit
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </aside>
  );
}

function Row({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-px shrink-0 text-brand-600">{icon}</span>
      <span className="min-w-0">{children}</span>
    </div>
  );
}
