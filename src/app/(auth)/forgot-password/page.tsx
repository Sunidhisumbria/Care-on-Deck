'use client';

import Link from 'next/link';

import { Logo } from '@/components/brand/logo';
import { Field, SubmitButton } from '@/components/ui/field';
import { MailIcon } from '@/components/ui/icons';
import { useForgotPassword } from '@/features/auth/hooks';
import { forgotPasswordSchema } from '@/features/auth/schemas/password.schema';
import { useApiForm } from '@/lib/forms/use-api-form';

/**
 * Step one of a reset: send a code to the account's email.
 *
 * The API answers the same whether or not the address has an account, so this
 * screen must not branch on the result -- it always moves on to code entry.
 */
export default function ForgotPasswordPage() {
  const forgotPassword = useForgotPassword();
  const { register, formState, submit, error } = useApiForm(forgotPasswordSchema, { email: '' });

  return (
    <div>
      <Logo />

      <h1 className="mt-8 text-[1.75rem] font-extrabold tracking-tight text-ink-900">
        Forgot password?
      </h1>
      <p className="mt-2 text-sm text-ink-500">
        Enter the email on your account and we&rsquo;ll send you a code to reset your password.
      </p>

      <form
        onSubmit={submit((values) => forgotPassword.mutateAsync(values))}
        className="mt-6 grid gap-4"
        noValidate
      >
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="Enter email address"
          icon={<MailIcon />}
          error={error('email')}
          {...register('email')}
        />

        <SubmitButton pending={formState.isSubmitting}>Send Code</SubmitButton>
      </form>

      <p className="mt-6 text-center text-sm text-ink-500">
        Remembered it?{' '}
        <Link href="/login" className="font-semibold text-brand-600 hover:underline">
          Sign In
        </Link>
      </p>
    </div>
  );
}
