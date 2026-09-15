
export type ApiErrorCode =
  | 'BAD_REQUEST'
  | 'VALIDATION_FAILED'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'ACCOUNT_UNVERIFIED'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'SLOT_UNAVAILABLE'
  | 'RATE_LIMITED'
  | 'PAYMENT_REQUIRED'
  | 'INSUFFICIENT_CREDITS'
  | 'INTEGRATION_UNAVAILABLE'
  | 'NOT_IMPLEMENTED'
  | 'INTERNAL';

const STATUS: Record<ApiErrorCode, number> = {
  BAD_REQUEST: 400,
  VALIDATION_FAILED: 422,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  ACCOUNT_UNVERIFIED: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  SLOT_UNAVAILABLE: 409,
  RATE_LIMITED: 429,
  PAYMENT_REQUIRED: 402,
  INSUFFICIENT_CREDITS: 402,
  INTEGRATION_UNAVAILABLE: 503,
  NOT_IMPLEMENTED: 501,
  INTERNAL: 500,
};

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  /** Field-level detail for VALIDATION_FAILED, safe to show in the UI. */
  readonly details?: unknown;
  /** Attached to the log line but never returned to the caller. */
  readonly cause?: unknown;

  constructor(
    code: ApiErrorCode,
    message: string,
    options: { details?: unknown; cause?: unknown } = {},
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = STATUS[code];
    this.details = options.details;
    this.cause = options.cause;
  }

  static badRequest(message = 'Malformed request.', details?: unknown) {
    return new ApiError('BAD_REQUEST', message, { details });
  }
  static unauthenticated(message = 'Sign in to continue.') {
    return new ApiError('UNAUTHENTICATED', message);
  }
  static forbidden(message = 'You do not have access to this.') {
    return new ApiError('FORBIDDEN', message);
  }
  /**
   * The credentials were right but the account has never proved it holds
   * either of the contacts it signed up with.
   *
   * Distinct from FORBIDDEN so the client can act on it -- there is a way
   * forward here, and it is not "try a different password". Both contacts are
   * named so the client can offer the same choice signup does; that is safe
   * because this is only ever reached after the password has been verified,
   * so it tells the caller nothing they have not already proved they know.
   */
  static accountUnverified(contacts: { phone: string | null; email: string | null }) {
    return new ApiError(
      'ACCOUNT_UNVERIFIED',
      'Verify your account to finish setting it up.',
      { details: { next_step: 'verify_account', ...contacts } },
    );
  }
  static notFound(message = 'Not found.') {
    return new ApiError('NOT_FOUND', message);
  }
  static conflict(message: string, details?: unknown) {
    return new ApiError('CONFLICT', message, { details });
  }
  /** The chosen time was taken between rendering the picker and submitting. */
  static slotUnavailable(message = 'That time is no longer available.') {
    return new ApiError('SLOT_UNAVAILABLE', message);
  }
  static notImplemented(what: string) {
    return new ApiError('NOT_IMPLEMENTED', `${what} is not implemented yet.`);
  }
  static internal(message = 'Something went wrong.', cause?: unknown) {
    return new ApiError('INTERNAL', message, { cause });
  }
}

/** Thrown by an integration adapter whose credentials are absent. */
export class IntegrationNotConfiguredError extends ApiError {
  constructor(vendor: string) {
    super('INTEGRATION_UNAVAILABLE', `The ${vendor} integration is not configured.`);
    this.name = 'IntegrationNotConfiguredError';
  }
}
