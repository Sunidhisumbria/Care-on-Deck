'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useCurrentUser } from '@/features/auth/hooks';
import { apiDelete, apiGet, apiPost } from '@/lib/http/client';
import { notificationKeys } from '@/lib/query/keys';

export interface NotificationItem {
  id: string;
  category: string;
  kind: string | null;
  title: string;
  body: string | null;
  action_url: string | null;
  read: boolean;
  created_at: string;
}

/** The signed-in person's notifications, newest first, refreshed each minute for the bell. */
export function useNotifications() {
  const { user } = useCurrentUser();
  return useQuery({
    queryKey: notificationKeys.list(),
    queryFn: () => apiGet<{ items: NotificationItem[]; unread: number }>('/notifications'),
    enabled: Boolean(user),
    refetchInterval: 60_000,
  });
}

export function useMarkRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { ids: string[] } | { all: true }) => apiPost<{ updated: number }>('/notifications/read', body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
  });
}

export function useClearNotifications() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiDelete<{ cleared: number }>('/notifications'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
  });
}
