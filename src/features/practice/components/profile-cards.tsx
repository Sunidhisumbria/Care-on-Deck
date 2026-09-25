'use client';

import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { initials } from '@/components/ui/avatar';
import { uploadsApi } from '@/features/uploads/api/uploads.api';
import { uploadKeys } from '@/lib/query/keys';

/**
 * The provider's profile as cards, each with an Edit that goes back to where
 * it is changed. Shared by onboarding's Review & Submit and the provider's
 * Personal Information, so the application and the live profile look alike.
 */

export function Card({ title, onEdit, children }: { title?: string; onEdit?: () => void; children: ReactNode }) {
  return (
    <section className="rounded-card border border-line bg-white p-5 shadow-[0_1px_2px_rgba(28,17,25,.04)]">
      {title ? (
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-ink-900">{title}</h2>
          {onEdit ? <EditLink label={title} onClick={onEdit} /> : null}
        </div>
      ) : null}
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export function EditLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Edit ${label}`}
      className="shrink-0 text-sm font-semibold text-brand-600 underline underline-offset-2 hover:text-brand-700"
    >
      Edit
    </button>
  );
}

export function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-[0.8125rem] font-semibold text-ink-900">{label}</p>
      <div className="mt-1 whitespace-pre-line break-words text-[0.8125rem] leading-relaxed text-ink-500">
        {children || '—'}
      </div>
    </div>
  );
}

/** A tinted row under the week: the design's Break Hours. */
export function Highlight({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between rounded-field bg-brand-50 px-4 py-3 text-sm">
      <span className="font-semibold text-ink-900">{label}</span>
      <span className="text-ink-700">{children}</span>
    </div>
  );
}

/** A private upload's short-lived view link, refreshed before it expires while the screen is open. */
export function useViewLink(mediaId: string | null) {
  return useQuery({
    queryKey: uploadKeys.view(mediaId ?? 'none'),
    queryFn: () => uploadsApi.viewLink(mediaId!),
    enabled: Boolean(mediaId),
    staleTime: 4 * 60 * 1000,
    refetchInterval: 4 * 60 * 1000,
    retry: false,
  });
}

export function Headshot({ file, name }: { file: { media_id: string } | null; name: string }) {
  const link = useViewLink(file?.media_id ?? null);

  return link.data ? (
    // eslint-disable-next-line @next/next/no-img-element -- a signed, expiring link; next/image would cache it
    <img src={link.data.url} alt="" className="h-14 w-14 shrink-0 rounded-full object-cover" />
  ) : (
    <span
      aria-hidden="true"
      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-lg font-bold text-white"
    >
      {initials(name)}
    </span>
  );
}

/**
 * A document or certificate: its image when it is one, a labelled tile when it
 * is a PDF. Either opens the file in a new tab.
 */
export function FileThumb({
  file,
  label,
  size,
}: {
  file: { media_id: string; content_type: string; file_name?: string };
  label: string;
  size: 'small' | 'large';
}) {
  const link = useViewLink(file.media_id);
  const isImage = file.content_type.startsWith('image/');
  const box = size === 'large' ? 'h-36 w-full max-w-[16rem]' : 'h-16 w-14';

  const body =
    isImage && link.data ? (
      // eslint-disable-next-line @next/next/no-img-element -- a signed, expiring link; next/image would cache it
      <img src={link.data.url} alt={label} className="h-full w-full object-cover" />
    ) : (
      <span className="flex h-full w-full flex-col items-center justify-center gap-1 bg-canvas text-[0.6875rem] font-semibold text-ink-500">
        <span className="rounded bg-brand-50 px-1.5 py-0.5 text-brand-700">{isImage ? 'IMG' : 'PDF'}</span>
        {size === 'large' ? <span className="max-w-full truncate px-2">{file.file_name ?? label}</span> : null}
      </span>
    );

  return link.data ? (
    <a
      href={link.data.url}
      target="_blank"
      rel="noreferrer"
      aria-label={`Open ${label}`}
      className={`block overflow-hidden rounded-field border border-line ${box}`}
    >
      {body}
    </a>
  ) : (
    <span className={`block overflow-hidden rounded-field border border-line ${box}`}>{body}</span>
  );
}

/** "2027-03-31" -> "Mar 31, 2027", read as a calendar date rather than midnight UTC. */
export function formatDate(value: string): string {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return value;
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
