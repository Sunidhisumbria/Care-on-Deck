'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

import { SocialButtons } from '@/components/auth/social-buttons';
import { Logo } from '@/components/brand/logo';
import { Divider } from '@/components/ui/divider';
import { Field, PasswordField, PhoneField, SubmitButton } from '@/components/ui/field';
import { MailIcon } from '@/components/ui/icons';
import { Segmented } from '@/components/ui/segmented';
import { VerifyMethodDialog } from '@/features/auth/components/verify-method-dialog';
import { useLogin, useRequestLoginCode } from '@/features/auth/hooks';
import { asUnverifiedAccount } from '@/features/auth/lib/unverified';
import { readRole } from '@/features/auth/lib/verification';
import { loginSchema, mobileLoginSchema } from '@/features/auth/schemas/login.schema';
import type { InterfaceRole } from '@/features/auth/types';
import { useApiForm } from '@/lib/forms/use-api-form';

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginScreen />
    </Suspense>
  );
}

function LoginScreen() {
  const params = useSearchParams();
  const role = params.has('role') ? readRole(params.get('role')) : undefined;
  const [tab, setTab] = useState<'email' | 'mobile'>('email');

  return (
    <div>
      <Logo />

      <h1 className="mt-8 text-[1.75rem] font-extrabold tracking-tight text-ink-900">
        Login to your account
      </h1>
      <p className="mt-2 text-sm text-ink-500">
        Sign in to book appointments and manage your healthcare with{' '}
        <span className="font-semibold text-brand-600">CareOndeck</span>
      </p>

      <Segmented
        className="mt-6"
        label="Sign in with"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'email', label: 'Email Address' },
          { value: 'mobile', label: 'Mobile Number' },
        ]}
      />

      {tab === 'email' ? <EmailForm role={role} /> : <MobileForm role={role} />}

      <Divider />
      <SocialButtons />

      <p className="mt-6 text-center text-sm text-ink-500">
        Don&rsquo;t have an account?{' '}
        <Link
          href={role === 'provider' ? '/signup?role=doctor' : '/signup'}
          className="font-semibold text-brand-600 hover:underline"
        >
          Sign Up
        </Link>
      </p>
    </div>
  );
}

function EmailForm({ role }: { role?: InterfaceRole }) {
  const login = useLogin(useSearchParams().get('next'));
  const { register, formState, submit, error } = useApiForm(loginSchema, {
    email: '',
    password: '',
  });

  // Right password, unfinished signup: offer the same choice signup does
  // rather than leaving them at a refusal they cannot act on.
  const unverified = asUnverifiedAccount(login.error);
  if (unverified) return <VerifyMethodDialog contacts={unverified} role={role} />;

  return (
    <form
      onSubmit={submit((values) => login.mutateAsync({ ...values, ...(role ? { role } : {}) }))}
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

      <div>
        <PasswordField
          label="Password"
          autoComplete="current-password"
          placeholder="Enter password"
          error={error('password')}
          {...register('password')}
        />
        <div className="mt-2 text-right">
          <Link
            href="/forgot-password"
            className="text-[0.8125rem] font-semibold text-brand-600 hover:underline"
          >
            Forgot Password?
          </Link>
        </div>
      </div>

      <SubmitButton pending={formState.isSubmitting}>Sign In</SubmitButton>
    </form>
  );
}

function MobileForm({ role }: { role?: InterfaceRole }) {
  const requestCode = useRequestLoginCode(role);
  const { register, formState, submit, error } = useApiForm(mobileLoginSchema, { phone: '' });

  return (
    <form
      onSubmit={submit(({ phone }) => requestCode.mutateAsync(phone))}
      className="mt-6 grid gap-4"
      noValidate
    >
      <PhoneField
        label="Mobile Number"
        error={error('phone')}
        {...register('phone')}
      />

      <SubmitButton pending={formState.isSubmitting}>Send Code</SubmitButton>
    </form>
  );
}
