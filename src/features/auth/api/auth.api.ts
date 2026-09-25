import { apiDelete, apiGet, apiPost } from '@/lib/http/client';

import type {
  ChangePasswordResponse,
  CurrentUser,
  LoginResponse,
  ResetPasswordResponse,
  SendOtpResponse,
  SignupResponse,
  VerifyOtpResponse,
} from '../types';
import type { LoginValues } from '../schemas/login.schema';
import type { SignupValues } from '../schemas/signup.schema';
import type {
  ChangePasswordValues,
  ForgotPasswordValues,
  ResetPasswordValues,
} from '../schemas/password.schema';
import type { SendOtpValues, VerifyOtpValues } from '../schemas/otp.schema';

/**
 * The auth endpoints, and nothing else.
 *
 * Deliberately free of React: no hooks, no toasts, no navigation. Each
 * function is one request in and one payload out, which is what makes the
 * hooks in ../hooks thin and these callable from anywhere.
 */
export const authApi = {
  signup: (input: SignupValues) => apiPost<SignupResponse>('/auth/signup', input),

  login: (input: LoginValues) => apiPost<LoginResponse>('/auth/login', input),

  sendOtp: (input: SendOtpValues) => apiPost<SendOtpResponse>('/auth/otp', input),
  /** Change the email or phone you sign in with: a code goes to the new address. */
  changeContact: (input: { channel: 'sms' | 'email'; destination: string }) =>
    apiPost<SendOtpResponse>('/auth/contact', input),
  /** ...and the code that arrived there. */
  confirmContact: (input: { channel: 'sms' | 'email'; destination: string; code: string }) =>
    apiPost<{ channel: 'sms' | 'email'; destination: string }>('/auth/contact/confirm', input),

  verifyOtp: (input: VerifyOtpValues) => apiPost<VerifyOtpResponse>('/auth/otp/verify', input),

  forgotPassword: (input: ForgotPasswordValues) =>
    apiPost<SendOtpResponse>('/auth/password/forgot', input),

  /** The proof travels in a header, so it never appears in a logged body. */
  resetPassword: ({ verification_token, ...body }: ResetPasswordValues & { verification_token: string }) =>
    apiPost<ResetPasswordResponse>('/auth/password/reset', body, {
      'x-verification-token': verification_token,
    }),

  /** `confirm_password` is a client-side check; the API never needs it. */
  changePassword: ({ confirm_password: _confirm, ...body }: ChangePasswordValues) =>
    apiPost<ChangePasswordResponse>('/auth/password/change', body),

  currentUser: () => apiGet<CurrentUser>('/auth/session'),

  signOut: () => apiDelete<{ signed_out: true }>('/auth/session'),
};
