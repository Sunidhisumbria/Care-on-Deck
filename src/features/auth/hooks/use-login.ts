'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { deviceInfo } from '@/lib/device';
import { authKeys } from '@/lib/query/keys';

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
export function useLogin() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: LoginValues) => authApi.login({ ...values, ...deviceInfo() }),

    onSuccess: async (data) => {
      // The cookie changed, so anything cached about the old session is stale.
      await queryClient.invalidateQueries({ queryKey: authKeys.all });
      toast.success('Signed in.');
      router.push(destinationFor(data.user_type));
    },

    /*
     * Right password, unfinished signup, is not handled here: the screen shows
     * the same "text or email?" chooser signup does, reading the contacts off
     * `login.error`. Everything else reaches the form as usual, which puts it
     * on the field it belongs to or in a toast.
     */
  });
}
