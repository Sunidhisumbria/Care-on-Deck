'use client';

import Link from 'next/link';
import {
  AlertClockIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClipboardIcon,
  EyeIcon,
  ProgressIcon,
  ToothIcon,
} from '@/components/ui/icons';
import { StatusBadge } from '@/components/ui/status-badge';

import { PLACEHOLDER_CARE_PROGRESS, type CareProgressItem } from './placeholder-data';
import { SectionHeading } from './section-heading';

/**
 * Care Progress.
 *
 * Rendered from constants -- see placeholder-data.ts. There is no care-plan
 * model in the database, and the recall rules behind "next due" have not been
 * specified, so nothing here reflects the signed-in patient.
 */
export function CareProgress() {
  return (
    <section>
      <SectionHeading
        icon={<ProgressIcon className="h-[1.125rem] w-[1.125rem]" />}
        title="Care Progress"
        caption="Keep up with your important care milestones"
      />

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {PLACEHOLDER_CARE_PROGRESS.map((item) => (
          <MilestoneCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}

function MilestoneCard({ item }: { item: CareProgressItem }) {
  const percent = item.total === 0 ? 0 : Math.round((item.completed / item.total) * 100);
  const done = item.state === 'complete';

  return (
    <article className="flex flex-col rounded-card border border-line bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-field ${
              done ? 'bg-emerald-50 text-emerald-600' : 'bg-brand-50 text-brand-600'
            }`}
          >
            <MilestoneIcon name={item.icon} />
          </span>
          <div>
            <h3 className="text-sm font-bold text-ink-900">{item.title}</h3>
            <p className="mt-0.5 text-xs text-ink-500">{item.caption}</p>
          </div>
        </div>
        <StatusBadge tone={done ? 'success' : 'warning'}>{done ? 'Completed' : 'Due'}</StatusBadge>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-ink-500">
          <span>
            {item.completed} of {item.total} completed
          </span>
          <span className="font-semibold text-ink-700">{percent}%</span>
        </div>
        <div
          className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-line"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${item.title} progress`}
        >
          <div
            className={`h-full rounded-full ${done ? 'bg-emerald-500' : 'bg-brand-500'}`}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <p className="mt-4 flex items-center gap-2 border-t border-line pt-3 text-xs text-ink-500">
        <CalendarIcon className="h-3.5 w-3.5 text-ink-300" />
        Next due <span className="font-semibold text-ink-700">{item.nextDue}</span>
      </p>

      <div
        className={`mt-3 flex items-center gap-2.5 rounded-field px-3 py-2.5 text-xs ${
          done ? 'bg-emerald-50/70 text-emerald-800' : 'bg-amber-50/80 text-amber-900'
        }`}
      >
        <span className="shrink-0">
          {done ? <CheckCircleIcon className="h-4 w-4" /> : <AlertClockIcon className="h-4 w-4" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-bold">
            {done ? 'Well done!' : 'Time for your annual checkup'}
          </span>
          <span className="block">{item.note}</span>
        </span>
        {item.action ? (
          <Link
            href="/book"
            className="shrink-0 rounded-field bg-brand-600 px-3 py-1.5 text-[0.6875rem] font-bold text-white transition-colors hover:bg-brand-700"
          >
            {item.action.label}
          </Link>
        ) : null}
      </div>
    </article>
  );
}

function MilestoneIcon({ name }: { name: CareProgressItem['icon'] }) {
  if (name === 'tooth') return <ToothIcon className="h-5 w-5" />;
  if (name === 'clipboard') return <ClipboardIcon className="h-5 w-5" />;
  return <EyeIcon className="h-5 w-5" />;
}
