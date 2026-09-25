/**
 * What the auth endpoints return. Snake_case, because that is the API's
 * convention at the HTTP boundary -- these are wire types, not view models.
 */

export type UserType = 'patient' | 'staff' | 'provider' | 'internal';
export type InterfaceRole = 'patient' | 'provider';
export type Channel = 'sms' | 'email';
export type OtpPurpose =
  | 'verify_mobile'
  | 'verify_email'
  | 'signup'
  | 'login'
  | 'password_reset';

/** Where a code can be sent. At least one is always present. */
export interface Contacts {
  phone: string | null;
  email: string | null;
}

/** Present on every response that signs someone in. */
export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: 'Bearer';
  expires_in: number;
}

export interface SignupResponse {
  user_id: string;
  /** Null for a provider, who has no patient record. */
  patient_id: string | null;
  /** The provider's onboarding application; null for a patient. */
  onboarding_session_id: string | null;
  user_type: UserType;
  phone_verified: boolean;
  email_verified: boolean;
  next_step: 'verify_mobile';
}

export interface LoginResponse extends TokenPair {
  user_id: string;
  user_type: UserType;
  signed_in: true;
}

export interface SendOtpResponse {
  channel: Channel;
  /** Masked: +1......4567. Never the raw destination. */
  destination: string;
  expires_in: number;
  resend_in: number;
  /** Local development only, when no SMS or email vendor is configured. */
  dev_code?: string;
}

export interface VerifyOtpResponse extends Partial<TokenPair> {
  verified: true;
  purpose: OtpPurpose;
  verification_token: string;
  verification_expires_in: number;
  signed_in?: boolean;
  user_id?: string;
  user_type?: UserType;
}

export interface ResetPasswordResponse {
  password_changed: true;
  sessions_revoked: number;
}

/**
 * Same shape, deliberately aliased rather than redeclared -- a change also
 * revokes sessions, and if one endpoint's response grows a field the other's
 * should too.
 */
export type ChangePasswordResponse = ResetPasswordResponse;

export interface CurrentUser {
  user: {
    id: string;
    type: UserType;
    email: string | null;
    email_verified: boolean;
    phone: string | null;
    phone_verified: boolean;
    first_name: string | null;
    last_name: string | null;
    preferred_name: string | null;
    avatar_url: string | null;
    mfa_enabled: boolean;
  } | null;
  memberships: Array<{ organization_id: string; organization_name: string; role: string }>;
  active_organization_id: string | null;
  active_facility_id: string | null;
  permissions: string[];
}
