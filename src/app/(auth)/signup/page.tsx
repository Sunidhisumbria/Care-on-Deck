'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

import { SocialButtons } from '@/components/auth/social-buttons';
import { Logo } from '@/components/brand/logo';
import { Divider } from '@/components/ui/divider';
import {
  Field,
  PASSWORD_HINT,
  PasswordField,
  PhoneField,
  SelectField,
  SubmitButton,
} from '@/components/ui/field';
import {
  CalendarIcon,
  GenderIcon,
  MailIcon,
  PinIcon,
  UserIcon,
} from '@/components/ui/icons';
import { RoleTabs } from '@/features/auth/components/role-tabs';
import { VerifyMethodDialog } from '@/features/auth/components/verify-method-dialog';
import { useSignup } from '@/features/auth/hooks';
import { signupSchema } from '@/features/auth/schemas/signup.schema';
import type { InterfaceRole } from '@/features/auth/types';
import { useApiForm } from '@/lib/forms/use-api-form';
import { readRole } from '@/features/auth/lib/verification';


export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupScreen />
    </Suspense>
  );
}

function SignupScreen() {
  const params = useSearchParams();
  const [role, setRole] = useState<InterfaceRole>(readRole(params.get('role')));

  const signup = useSignup();
  const { register, formState, submit, error, setValue, clearErrors } = useApiForm(signupSchema, {
    role,
    first_name: '',
    last_name: '',
    date_of_birth: '',
    phone: '',
    email: '',
    location: '',
    password: '',
    confirm_password: '',
  });

 
  function changeRole(next: InterfaceRole) {
    setRole(next);
    setValue('role', next);
    clearErrors(['date_of_birth', 'gender', 'location']);
  }

  return (
    <div>
      <Logo />

      <h1 className="mt-8 text-[1.75rem] font-extrabold tracking-tight text-ink-900">
        {role === 'provider' ? 'Create Your Provider Account' : 'Sign up to your account'}
      </h1>
      <p className="mt-2 text-sm text-ink-500">
        Please complete all information to create your account on{' '}
        <span className="font-semibold text-brand-600">CareOndeck</span>
      </p>

      {role === 'provider' ? (
        <p className="mt-3 rounded-field bg-brand-50 px-3.5 py-2.5 text-[0.8125rem] text-ink-700">
          Next, 7 short steps to set up your practice profile. You can stop at any point and pick
          up where you left off.
        </p>
      ) : null}

      {params.has('role') ? <RoleTabs label="I am signing up as" value={role} onChange={changeRole} /> : null}

      <form
        onSubmit={submit((values) => signup.mutateAsync({ ...values, role }))}
        className="mt-6 grid gap-4"
        noValidate
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="First Name"
            autoComplete="given-name"
            placeholder="First name"
            icon={<UserIcon />}
            error={error('first_name')}
            {...register('first_name')}
          />
          <Field
            label="Last Name"
            autoComplete="family-name"
            placeholder="Last name"
            icon={<UserIcon />}
            error={error('last_name')}
            {...register('last_name')}
          />
        </div>

        {role === 'patient' ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Date of Birth"
            type="date"
            autoComplete="bday"
            max={today()}
            icon={<CalendarIcon />}
            error={error('date_of_birth')}
            {...register('date_of_birth')}
          />
          <SelectField
            label="Gender"
            placeholder="Enter gender"
            icon={<GenderIcon />}
            error={error('gender')}
            options={[
              { value: 'male', label: 'Male' },
              { value: 'female', label: 'Female' },
              { value: 'other', label: 'Other' },
            ]}
            {...register('gender')}
          />
        </div>
        ) : null}

        <PhoneField
          label="Phone"
          error={error('phone')}
          {...register('phone')}
        />

        <Field
          label="Email Address"
          type="email"
          autoComplete="email"
          placeholder="Enter email address"
          icon={<MailIcon />}
          error={error('email')}
          {...register('email')}
        />

        
        {role === 'patient' ? (
        <Field
          label="Location"
          autoComplete="address-level2"
          placeholder="Enter Location"
          icon={<PinIcon />}
          error={error('location')}
          {...register('location')}
        />
        ) : null}

        <PasswordField
          label="Password"
          autoComplete="new-password"
          placeholder="Enter password"
          hint={PASSWORD_HINT}
          error={error('password')}
          {...register('password')}
        />
        <PasswordField
          label="Confirm Password"
          autoComplete="new-password"
          placeholder="Enter confirm password"
          error={error('confirm_password')}
          {...register('confirm_password')}
        />

        <SubmitButton pending={formState.isSubmitting}>Sign Up</SubmitButton>
      </form>

      {/*
        The account exists but cannot be signed into yet. `signup.variables`
        is react-query holding on to what was submitted, which saves copying
        the number and address into state just to pass them along.
      */}
      {signup.isSuccess && signup.variables ? (
        <VerifyMethodDialog
          contacts={{ phone: signup.variables.phone, email: signup.variables.email }}
          role={role}
        />
      ) : null}

      <Divider />
      <SocialButtons />

      <p className="mt-6 text-center text-sm text-ink-500">
        Already have an account?{' '}
        <Link
          href={role === 'provider' ? '/login?role=provider' : '/login?role=patient'}
          className="font-semibold text-brand-600 hover:underline"
        >
          Sign In
        </Link>
      </p>
    </div>
  );
}

/** Stops the date picker offering a birthday in the future. */
function today(): string {
  return new Date().toISOString().slice(0, 10);
}
