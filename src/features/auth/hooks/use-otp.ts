'use client';

import type { Route } from 'next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { deviceInfo } from '@/lib/device';

import { authApi } from '../api/auth.api';
import { destinationFor } from '../lib/destination';
import { stashProof, verifyPath } from '../lib/verification';
import type { SendOtpValues } from '../schemas/otp.schema';
import type { Channel, InterfaceRole, OtpPurpose } from '../types';

/**
 * Sends a one-time code.
 *
 * In local development the API returns the code in `dev_code`, because no SMS
 * vendor is configured. Showing it in a toast is how the flow stays testable
 * without a phone; on any deployed environment the field is absent and the
 * toast simply says a code was sent.
 */
export function useSendOtp() {
  return useMutation({
    mutationFn: (values: SendOtpValues) => authApi.sendOtp(values),
    onSuccess: (data) => {
      if (data.dev_code) toast.info(`Development code: ${data.dev_code}`, { duration: 30_000 });
      else toast.success('We sent you a code.');
    },
  });
}

/**
 * The Mobile Number tab on sign-in: send a code, then go and enter it.
 *
 * A separate hook from `useSendOtp` because the two differ in what happens
 * next, not in what they send -- resending on the code screen must stay put,
 * while this one moves on.
 */
export function useRequestLoginCode(role?: InterfaceRole) {
  const router = useRouter();
  const sendOtp = useSendOtp();

  return useMutation({
    mutationFn: (phone: string) =>
      sendOtp.mutateAsync({ channel: 'sms', destination: phone, purpose: 'login' }),
    onSuccess: (_result, phone) => {
      router.push(verifyPath({ channel: 'sms', destination: phone, purpose: 'login', role }));
    },
  });
}

/** What the code is being checked against. Fixed for the life of the screen. */
export interface VerificationContext {
  channel: Channel;
  destination: string;
  purpose: OtpPurpose;
  role?: InterfaceRole;
  /** Where to land once it checks out. Defaults per purpose. */
  next?: string | null;
}

/**
 * Checks a code and goes wherever that code was for.
 *
 * The three purposes end differently -- a password reset hands back a proof
 * for the next screen, while login and the mobile verification that finishes
 * signup both leave the user signed in. Which one applies is decided here, so
 * the code-entry screen is the same six boxes regardless.
 */
export function useVerifyCode(context: VerificationContext) {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (code: string) =>
      authApi.verifyOtp({
        channel: context.channel,
        destination: context.destination,
        purpose: context.purpose,
        code,
        ...(context.role ? { role: context.role } : {}),
        ...deviceInfo(),
      }),

    onSuccess: (result) => {
      // Signed in as someone new: drop the old session's cache rather than
      // waiting to refetch it before moving on -- see use-login.
      if (result.signed_in) queryClient.clear();

      if (context.purpose === 'password_reset') {
        // A bearer credential for the next step, so it goes in sessionStorage
        // rather than the URL -- see lib/verification.
        stashProof({
          token: result.verification_token,
          purpose: context.purpose,
          destination: context.destination,
        });
        router.push('/reset-password');
        return;
      }

      // `next` arrives in the URL, so only a path on this site is honoured --
      // otherwise a crafted link could hand a freshly signed-in user to
      // another site. "//host" is a path to the browser but a host to the URL.
      const next = context.next && context.next.startsWith('/') && !context.next.startsWith('//') ? context.next : null;
      router.push((next as Route) ?? (result.signed_in ? destinationFor(result.user_type) : '/'));
    },
  });
}
