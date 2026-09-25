'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { deviceInfo } from '@/lib/device';

import { authApi } from '../api/auth.api';
import { destinationFor } from '../lib/destination';
import type { LoginValues } from '../schemas/login.schema';

/**
 * Email and password sign-in, start to finish.
 *
 * Everything that happens after the request lives here rather than in the
 * screen: the cache invalidation, the toast, where the user lands, and the one
 * failure that is not really a failure -- a correct password on an account
 * that never finished verifying its number. The screen calls `mutateAsync` and
 * renders; it needs no knowledge of any of this.
 *
 * The device is attached here too, so a new sign-in surface cannot forget it
 * and silently lose push notifications.
 */
/** `next`: where to return after signing in, e.g. a campaign's booking link. Only paths on this site. */
export function useLogin(next?: string | null) {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: LoginValues) => authApi.login({ ...values, ...deviceInfo() }),

    onSuccess: (data) => {
      /*
       * The cookie changed, so everything cached belongs to whoever was here
       * before -- possibly someone else on a shared computer. It is dropped,
       * not refetched: waiting for a fresh "who am I" before moving on added a
       * whole database round trip to every sign-in. The next page asks for it
       * itself, alongside its own data, instead of after.
       */
      queryClient.clear();
      toast.success('Signed in.');
      const back = next && next.startsWith('/') && !next.startsWith('//') ? next : null;
      router.push((back as Route | null) ?? destinationFor(data.user_type));
    },

    /*
     * Right password, unfinished signup, is not handled here: the screen shows
     * the same "text or email?" chooser signup does, reading the contacts off
     * `login.error`. Everything else reaches the form as usual, which puts it
     * on the field it belongs to or in a toast.
     */
  });
}
