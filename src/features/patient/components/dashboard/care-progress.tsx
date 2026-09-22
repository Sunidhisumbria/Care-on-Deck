'use client';

import Link from 'next/link';
import {
  AlertClockIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClipboardCheckIcon,
  ClockIcon,
  EyeOffIcon,
  ProgressIcon,
  StarOutlineIcon,
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
        icon={<ProgressIcon className="h-5 w-5" />}
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
    <article className="flex flex-col rounded-xl border border-line bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
              done ? 'bg-[#e6f7ec] text-[#16a34a]' : 'bg-[#e8f1fe] text-[#2f6fe4]'
            }`}
          >
            <MilestoneIcon name={item.icon} />
          </span>
          <div className="min-w-0">
            <h3 className="text-[0.9375rem] font-bold leading-snug text-ink-900">{item.title}</h3>
            <p className="mt-0.5 text-xs text-ink-500">{item.caption}</p>
          </div>
        </div>
        <StatusBadge
          tone={done ? 'success' : 'warning'}
          icon={done ? <CheckCircleIcon className="h-3.5 w-3.5" /> : <ClockIcon className="h-3.5 w-3.5" />}
        >
          {done ? 'Completed' : 'Due'}
        </StatusBadge>
      </div>

      <ProgressRing percent={percent} done={done} label={`${item.title} progress`} />

      <div className="mt-5 flex items-center gap-2.5">
        <CalendarIcon className="h-5 w-5 shrink-0 text-ink-500" />
        <div>
          <p className="text-[0.6875rem] text-ink-500">Next due</p>
          <p className="text-sm font-bold text-ink-900">{item.nextDue}</p>
        </div>
      </div>

      <div
        className={`mt-4 flex items-center gap-3 rounded-lg px-3.5 py-3 ${
          done ? 'bg-[#ebf8f0]' : 'bg-[#fff6ea]'
        }`}
      >
        <span className={`shrink-0 ${done ? 'text-[#16a34a]' : 'text-brand-600'}`}>
          {done ? <StarOutlineIcon className="h-5 w-5" /> : <AlertClockIcon className="h-5 w-5" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[0.8125rem] font-bold leading-snug text-ink-900">
            {done ? 'Well done!' : 'Time for your annual checkup'}
          </span>
          <span className="mt-0.5 block text-xs text-ink-500">{item.note}</span>
        </span>
        {item.action ? (
          <Link
            href="/book"
            className="shrink-0 rounded-md bg-brand-600 px-4 py-2 text-[0.8125rem] font-semibold text-white transition-colors hover:bg-brand-700"
          >
            {item.action.label}
          </Link>
        ) : null}
      </div>
    </article>
  );
}

/**
 * The ring from the Figma: a pale track with the completed share drawn over
 * it from twelve o'clock, clockwise. Red while something is due, green once
 * it is all done.
 */
function ProgressRing({ percent, done, label }: { percent: number; done: boolean; label: string }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const value = Math.min(100, Math.max(0, percent));

  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className="relative mx-auto mt-5 h-[10.5rem] w-[10.5rem]"
    >
      <svg viewBox="0 0 120 120" aria-hidden="true" className="h-full w-full -rotate-90">
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          strokeWidth="12"
          className={done ? 'stroke-[#dcf5e4]' : 'stroke-[#fdd9db]'}
        />
        {value > 0 ? (
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - value / 100)}
            className={done ? 'stroke-[#22c55e]' : 'stroke-[#dc2626]'}
          />
        ) : null}
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[1.75rem] font-bold leading-none text-ink-900">{value}%</span>
        <span className="mt-1.5 text-[0.9375rem] text-ink-900">Completed</span>
      </span>
    </div>
  );
}

function MilestoneIcon({ name }: { name: CareProgressItem['icon'] }) {
  if (name === 'tooth') return <ToothIcon className="h-5 w-5" />;
  if (name === 'clipboard') return <ClipboardCheckIcon className="h-5 w-5" />;
  return <EyeOffIcon className="h-5 w-5" />;
}
