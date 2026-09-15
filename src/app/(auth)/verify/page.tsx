'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

import { Logo } from '@/components/brand/logo';
import { SubmitButton } from '@/components/ui/field';
import { AuthMessage } from '@/features/auth/components/auth-message';
import { CodeInput } from '@/features/auth/components/code-input';
import { useSendOtp, useVerifyCode } from '@/features/auth/hooks';
import { useResendTimer } from '@/features/auth/hooks/use-resend-timer';
import { otpFormSchema } from '@/features/auth/schemas/otp.schema';
import type { Channel, OtpPurpose } from '@/features/auth/types';
import { useApiForm } from '@/lib/forms/use-api-form';
import { readRole } from '@/features/auth/lib/verification';

/**
 * Code entry.
 *
 * One screen for every code we send -- mobile verification after signup,
 * passwordless login, and password reset -- because the only thing that
 * differs is where the user goes next, and `purpose` decides that.
 *
 * The code is never sent from here on arrival; whoever navigated here has
 * already sent it. This screen only resends.
 */
export default function VerifyPage() {
  return (
    <Suspense fallback={null}>
      <VerifyScreen />
    </Suspense>
  );
}

function VerifyScreen() {
  const params = useSearchParams();

  const channel: Channel = params.get('channel') === 'email' ? 'email' : 'sms';
  const destination = params.get('destination') ?? '';
  const purpose = (params.get('purpose') ?? 'verify_mobile') as OtpPurpose;
  const role = params.has('role') ? readRole(params.get('role')) : undefined;
  const next = params.get('next');

  const verify = useVerifyCode({ channel, destination, purpose, role, next });
  const sendOtp = useSendOtp();
  const timer = useResendTimer();

  const { register, watch, formState, submit, error } = useApiForm(otpFormSchema, { code: '' });
  const code = watch('code') ?? '';

  async function resend() {
    const result = await sendOtp.mutateAsync({ channel, destination, purpose });
    timer.restart(result.resend_in);
  }

  if (!destination) {
    return (
      <AuthMessage
        title="Nothing to verify"
        body="That link is missing the number or address we sent the code to."
        action={{ href: '/login', label: 'Back to sign in' }}
      />
    );
  }

  return (
    <div>
      <Logo />

      <h1 className="mt-8 text-[1.75rem] font-extrabold tracking-tight text-ink-900">
        {purpose === 'password_reset' ? 'Verify it’s you' : 'Enter the code'}
      </h1>
      <p className="mt-2 text-sm text-ink-500">
        We sent a 6-digit code to <span className="font-semibold text-ink-700">{destination}</span>.
      </p>

      {/*
        Signing in by code only works for a number that already has an account,
        and that endpoint still answers the same either way rather than
        confirming who is registered -- so this screen has to say it. Password
        reset no longer needs the same note: it refuses an unknown address on
        the form before anyone gets here.
      */}
      {purpose === 'login' ? (
        <p className="mt-3 rounded-field bg-brand-50 px-3.5 py-2.5 text-[0.8125rem] text-ink-700">
          No code arriving? {channel === 'email' ? 'An address' : 'A number'} without an account
          will not be sent one.{' '}
          <Link href="/signup" className="font-semibold text-brand-600 hover:underline">
            Create an account
          </Link>
          .
        </p>
      ) : null}

      <form
        onSubmit={submit(({ code }) => verify.mutateAsync(code))}
        className="mt-6 grid gap-4"
        noValidate
      >
        <CodeInput value={code} error={error('code')} {...register('code')} />

        <SubmitButton pending={formState.isSubmitting}>Verify</SubmitButton>
      </form>

      <p className="mt-6 text-center text-sm text-ink-500">
        Didn&rsquo;t get it?{' '}
        {timer.canResend ? (
          <button
            type="button"
            onClick={resend}
            disabled={sendOtp.isPending}
            className="font-semibold text-brand-600 hover:underline disabled:opacity-60"
          >
            Resend code
          </button>
        ) : (
          <span className="font-semibold text-ink-300">Resend in {timer.seconds}s</span>
        )}
      </p>
    </div>
  );
}
