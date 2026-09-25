'use client';

import { PASSWORD_HINT, PasswordField, SubmitButton } from '@/components/ui/field';
import { useApiForm } from '@/lib/forms/use-api-form';

import { useChangePassword } from '../hooks';
import { changePasswordSchema } from '../schemas/password.schema';

/**
 * Change password, for any signed-in account.
 *
 * Deliberately owns no page chrome -- no hero, no card, no heading. Patients
 * and providers reach this from different shells with different headers and
 * different surrounding navigation; the only thing they share is the form, so
 * that is the only thing this component is. Each interface renders its own
 * frame around it.
 *
 * The endpoint behind it is `access: 'user'` for the same reason: nothing
 * about changing a password is specific to either interface.
 */
export function ChangePasswordForm() {
  const changePassword = useChangePassword();
  const { register, formState, submit, error } = useApiForm(changePasswordSchema, {
    current_password: '',
    password: '',
    confirm_password: '',
  });

  return (
    <form
      noValidate
      onSubmit={submit((values) => changePassword.mutateAsync(values))}
      className="space-y-5"
    >
      <PasswordField
        label="Old Password"
        autoComplete="current-password"
        placeholder="Enter old password"
        error={error('current_password')}
        {...register('current_password')}
      />

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
        placeholder="Enter confirm password"
        error={error('confirm_password')}
        {...register('confirm_password')}
      />

      {/*
        Worth saying before they submit rather than after: this is the part
        people are surprised by, and a surprise sign-out on a phone reads as
        the account being compromised rather than secured.
      */}
      <p className="rounded-field bg-brand-50 px-3.5 py-2.5 text-[0.8125rem] text-ink-700">
        Changing your password signs you out everywhere else. You will stay signed in here.
      </p>

      <SubmitButton pending={formState.isSubmitting}>Send</SubmitButton>
    </form>
  );
}
