'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import { verifyPath } from '../lib/verification';
import type { Channel, InterfaceRole } from '../types';

import { useSendOtp } from './use-otp';

/**
 * Sends the account-verification code to whichever contact was chosen, then
 * goes to code entry.
 *
 * Both channels prove the same thing -- that the account is reachable and
 * belongs to whoever is holding it -- so the server accepts either. This hook
 * exists so the choosing screen stays two buttons.
 */
export function useRequestVerification(role?: InterfaceRole, next?: string) {
  const router = useRouter();
  const sendOtp = useSendOtp();

  return useMutation({
    mutationFn: ({ channel, destination }: { channel: Channel; destination: string }) =>
      sendOtp.mutateAsync({
        channel,
        destination,
        purpose: channel === 'sms' ? 'verify_mobile' : 'verify_email',
      }),

    onSuccess: (_result, { channel, destination }) => {
      router.push(
        verifyPath({
          channel,
          destination,
          purpose: channel === 'sms' ? 'verify_mobile' : 'verify_email',
          role,
          next,
        }),
      );
    },
  });
}
