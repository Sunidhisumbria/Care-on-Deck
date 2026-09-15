'use client';
import { Avatar } from '@/components/ui/avatar';
import { GlobeIcon, PinIcon, ScreenIcon, StarIcon, StethoscopeIcon } from '@/components/ui/icons';

import type { BookableProvider, VisitReason } from '../placeholder-data';
import { ReasonIcon } from './reason-icon';

/**
 * The card that follows you down the left of every step after the first.
 *
 * It is the flow's memory: six screens is long enough to forget which doctor
 * you picked, and long enough that being shown it is the difference between
 * finishing and starting over.
 */
export function ProviderSummary({
  provider,
  reason,
  onEditReason,
}: {
  provider: BookableProvider;
  reason?: VisitReason | null;
  onEditReason?: () => void;
}) {
  return (
    <aside className="space-y-4">
      <div className="rounded-card border border-line bg-white p-5 text-center">
        <Avatar name={provider.name} className="mx-auto h-[72px] w-[72px] text-lg" />
        <p className="mt-3 text-sm font-bold text-ink-900">{provider.name}</p>
        <p className="mt-1 text-xs text-ink-500">
          {provider.specialty} <span className="px-1 text-ink-300">•</span> {provider.visitModes.split(',')[0]}
        </p>
        <p className="mt-1.5 flex items-center justify-center gap-1 text-xs text-ink-500">
          <StarIcon className="h-3.5 w-3.5 text-amber-400" />
          <span className="font-semibold text-ink-700">{provider.ratingAverage.toFixed(1)}</span>
          <span>({provider.ratingCount} reviews)</span>
        </p>

        <dl className="mt-4 space-y-2 border-t border-line pt-4 text-left text-xs text-ink-500">
          <Row icon={<StethoscopeIcon className="h-3.5 w-3.5" />}>{provider.facility}</Row>
          <Row icon={<PinIcon className="h-3.5 w-3.5" />}>{provider.city}</Row>
          <Row icon={<ScreenIcon className="h-3.5 w-3.5" />}>{provider.visitModes}</Row>
          <Row icon={<GlobeIcon className="h-3.5 w-3.5" />}>{provider.languages}</Row>
        </dl>
      </div>

      {reason ? (
        <div className="rounded-card border border-line bg-white p-4">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-field bg-brand-50 text-brand-600">
              <ReasonIcon name={reason.icon} className="h-[1.125rem] w-[1.125rem]" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-ink-900">{reason.title}</p>
              <p className="mt-0.5 text-xs text-ink-500">{reason.caption}</p>
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
