'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Logo } from '@/components/brand/logo';
import { PASSWORD_HINT, PasswordField, SubmitButton } from '@/components/ui/field';
import { AuthMessage } from '@/features/auth/components/auth-message';
import { useResetPassword } from '@/features/auth/hooks';
import { readProof, type Proof } from '@/features/auth/lib/verification';
import { resetPasswordSchema } from '@/features/auth/schemas/password.schema';
import { useApiForm } from '@/lib/forms/use-api-form';
import { ApiError } from '@/lib/http/errors';


export default function ResetPasswordPage() {

  const [proof, setProof] = useState<Proof | null | undefined>(undefined);

  const resetPassword = useResetPassword();
  const { register, formState, submit, error } = useApiForm(resetPasswordSchema, {
    password: '',
    confirm_password: '',
  });

  
  useEffect(() => {
    setProof(readProof());
  }, []);

  if (proof === undefined) return null;

  if (resetPassword.isSuccess) {
    return (
      <AuthMessage
        title="Password updated"
        body="You have been signed out everywhere. Sign in with your new password."
        action={{ href: '/login', label: 'Go to sign in' }}
      />
    );
  }

  // Either there was no proof to spend, or the server refused the one we had.
  // A reset token is single-use, so a rejected one will never work again.
  const spent =
    proof?.purpose !== 'password_reset' ||
    (resetPassword.error instanceof ApiError && resetPassword.error.code === 'FORBIDDEN');

  if (spent) {
    return (
      <AuthMessage
        title="This link has expired"
        body="Reset codes are good for one use. Start again and we'll send a fresh one."
        action={{ href: '/forgot-password', label: 'Request a new code' }}
      />
    );
  }

  return (
    <div>
      <Logo />

      <h1 className="mt-8 text-[1.75rem] font-extrabold tracking-tight text-ink-900">
        Set a new password
      </h1>
      <p className="mt-2 text-sm text-ink-500">
        Choose something you have not used here before. Signing in again elsewhere will need it.
      </p>

      <form
        onSubmit={submit((values) =>
          resetPassword.mutateAsync({ ...values, verification_token: proof.token }),
        )}
        className="mt-6 grid gap-4"
        noValidate
      >
        <PasswordField
          label="New Password"
          autoComplete="new-password"
          placeholder="Enter new password"
          hint={PASSWORD_HINT}
          error={error('password')}
          {...register('password')}
        />
        <PasswordField
          label="Confirm Password"
          autoComplete="new-password"
          placeholder="Re-enter new password"
          error={error('confirm_password')}
          {...register('confirm_password')}
        />

        <SubmitButton pending={formState.isSubmitting}>Reset Password</SubmitButton>
      </form>

      <p className="mt-6 text-center text-sm text-ink-500">
        <Link href="/login" className="font-semibold text-brand-600 hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
