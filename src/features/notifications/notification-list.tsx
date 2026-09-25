'use client';

import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

import {
  AlertTriangleIcon,
  BellIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClipboardIcon,
  CrossIcon,
  LockIcon,
  StarOutlineIcon,
} from '@/components/ui/icons';
import { LoadingPanel } from '@/components/ui/spinner';
import { timeAgo } from '@/features/practice/components/shared';

import { useState } from 'react';
import { toast } from 'sonner';

import { Busy } from '@/components/ui/spinner';
import { Dialog } from '@/features/practice/components/shared';

import { useClearNotifications, useMarkRead, useNotifications, type NotificationItem } from './hooks';

/** The icon and its tint, by what happened. */
function look(item: NotificationItem): { icon: ReactNode; tint: string } {
  const icon = (node: ReactNode, tint: string) => ({ icon: node, tint });
  switch (item.kind) {
    case 'new_request':
      return icon(<CalendarIcon className="h-4 w-4" />, 'bg-blue-50 text-blue-600');
    case 'rescheduled':
      return icon(<CalendarIcon className="h-4 w-4" />, 'bg-emerald-50 text-emerald-600');
    case 'confirmed':
      return icon(<CheckCircleIcon className="h-4 w-4" />, 'bg-emerald-50 text-emerald-600');
    case 'cancelled':
      return icon(<CrossIcon className="h-4 w-4" />, 'bg-red-50 text-red-600');
    case 'no_show':
      return icon(<AlertTriangleIcon className="h-4 w-4" />, 'bg-red-50 text-red-600');
    case 'review':
      return icon(<StarOutlineIcon className="h-4 w-4" />, 'bg-brand-50 text-brand-600');
  }
  if (item.category === 'billing_notice') return icon(<ClipboardIcon className="h-4 w-4" />, 'bg-amber-50 text-amber-600');
  if (item.category === 'security_alert') return icon(<LockIcon className="h-4 w-4" />, 'bg-line text-ink-700');
  return icon(<BellIcon className="h-4 w-4" />, 'bg-brand-50 text-brand-600');
}

/**
 * IA: 11. Notifications > Notification List. Opening one marks it read and
 * goes to what it is about; the dot marks the unread.
 */
export function NotificationList() {
  const router = useRouter();
  const list = useNotifications();
  const markRead = useMarkRead();
  const clear = useClearNotifications();
  const [confirmClear, setConfirmClear] = useState(false);
  const items = list.data?.items ?? [];

  function open(item: NotificationItem) {
    if (!item.read) markRead.mutate({ ids: [item.id] });
    if (item.action_url?.startsWith('/')) router.push(item.action_url as Route);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-ink-900">Notifications</h2>
        <div className="flex items-center gap-4">
          {list.data && list.data.unread > 0 ? (
            <button
              type="button"
              onClick={() => markRead.mutate({ all: true })}
              disabled={markRead.isPending}
              className="text-xs font-semibold text-brand-600 hover:underline disabled:opacity-60"
            >
              Mark all as read
            </button>
          ) : null}
          {items.length > 0 ? (
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              className="text-xs font-semibold text-red-600 hover:underline"
            >
              Clear all
            </button>
          ) : null}
        </div>
      </div>

      {!list.data ? (
        list.error ? (
          <Empty>Notifications could not be loaded. Refresh to try again.</Empty>
        ) : (
          <LoadingPanel label="Loading notifications…" rows={5} />
        )
      ) : items.length === 0 ? (
        <Empty>You&rsquo;re all caught up. New updates will appear here.</Empty>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => {
            const { icon, tint } = look(item);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => open(item)}
                  className="flex w-full items-start gap-3 rounded-card border border-line bg-white p-4 text-left transition-colors hover:border-brand-200"
                >
                  <span aria-hidden="true" className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-field ${tint}`}>
                    {icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block text-sm text-ink-900 ${item.read ? 'font-semibold' : 'font-bold'}`}>{item.title}</span>
                    {item.body ? <span className="mt-0.5 block text-xs text-ink-500">{item.body}</span> : null}
                  </span>
                  <span className="flex shrink-0 items-center gap-2 text-xs text-ink-500">
                    {timeAgo(item.created_at)}
                    {item.read ? null : <span className="h-2 w-2 rounded-full bg-brand-600" aria-label="Unread" />}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {confirmClear ? (
        <Dialog title="Clear all notifications?" subtitle="They'll be removed from this list." onClose={() => setConfirmClear(false)}>
          <button
            type="button"
            disabled={clear.isPending}
            onClick={() =>
              clear.mutate(undefined, {
                onSuccess: () => {
                  toast.success('Notifications cleared.');
                  setConfirmClear(false);
                },
                onError: () => toast.error('Could not clear notifications. Try again.'),
              })
            }
            className="w-full rounded-field bg-brand-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
          >
            {clear.isPending ? <Busy>Clearing…</Busy> : 'Clear All'}
          </button>
          <button type="button" onClick={() => setConfirmClear(false)} className="mt-2 w-full py-1 text-sm font-semibold text-ink-700 hover:text-brand-600">
            Cancel
          </button>
        </Dialog>
      ) : null}
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-card border border-dashed border-line bg-white px-6 py-10 text-center text-sm text-ink-500">{children}</p>;
}
