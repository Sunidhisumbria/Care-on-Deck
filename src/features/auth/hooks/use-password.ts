'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { authKeys } from '@/lib/query/keys';

import { authApi } from '../api/auth.api';
import { clearProof, verifyPath } from '../lib/verification';
import type {
  ChangePasswordValues,
  ForgotPasswordValues,
  ResetPasswordValues,
} from '../schemas/password.schema';

/**
 * Starts a reset, then goes to code entry.
 *
 * An unregistered address is refused by the API with a field error, which the
 * form shows under the Email input -- so reaching `onSuccess` at all means a
 * code really is on its way.
 */
export function useForgotPassword() {
  const router = useRouter();

  return useMutation({
    mutationFn: (values: ForgotPasswordValues) => authApi.forgotPassword(values),
    onSuccess: (data, values) => {
      if (data.dev_code) toast.info(`Development code: ${data.dev_code}`, { duration: 30_000 });
      router.push(
        verifyPath({ channel: 'email', destination: values.email, purpose: 'password_reset' }),
      );
    },
  });
}

/**
 * Sets the new password using the proof from code entry.
 *
 * No navigation on success: the screen shows a confirmation rather than moving,
 * because every session was just revoked and there is nowhere signed-in to go.
 */
export function useResetPassword() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ResetPasswordValues & { verification_token: string }) =>
      authApi.resetPassword(input),
    onSuccess: async () => {
      // Spent now, so it should not survive a back button.
      clearProof();
      await queryClient.invalidateQueries({ queryKey: authKeys.all });
      toast.success('Password updated.');
    },
  });
}

/**
 * Changes the password of whoever is signed in.
 *
 * Stays on the screen and stays signed in. The API revokes every *other*
 * session, so the session behind this tab is still good -- re-reading it would
 * only produce a needless request, but the cached copy is now stale in one
 * respect (other devices are signed out), which is why the key is invalidated
 * rather than left alone.
 */
export function useChangePassword() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: ChangePasswordValues) => authApi.changePassword(values),
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: authKeys.all });
      toast.success(
        data.sessions_revoked > 0
          ? `Password updated. Signed out of ${data.sessions_revoked} other ${
              data.sessions_revoked === 1 ? 'device' : 'devices'
            }.`
          : 'Password updated.',
      );
    },
  });
}
