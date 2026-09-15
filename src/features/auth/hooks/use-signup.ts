'use client';

import { useMutation } from '@tanstack/react-query';

import { deviceInfo } from '@/lib/device';

import { authApi } from '../api/auth.api';
import { toSignupPayload, type SignupFormValues } from '../schemas/signup.schema';

/**
 * Creates the account.
 *
 * Deliberately stops there. Signup returns no session -- nothing has proved
 * the person holds either contact yet -- so there is no cache to invalidate,
 * and no code is sent because the next screen asks which contact to send it
 * to. The submitted values stay available as `signup.variables`, which is how
 * that screen knows the number and address without being handed them.
 */
export function useSignup() {
  return useMutation({
    mutationFn: (values: SignupFormValues) =>
      authApi.signup({ ...toSignupPayload(values), ...deviceInfo() }),
  });
}
