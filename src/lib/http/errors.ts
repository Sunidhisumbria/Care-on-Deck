import { AxiosError } from 'axios';

/**
 * One error type for everything the API can go wrong with.
 *
 * Callers should never have to tell an axios error from a network failure
 * from a validation rejection -- `toApiError` flattens all three into this,
 * and `fields` is already in the shape a form can hand to its inputs.
 */
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  /** Field name -> message, from the server's `error.details`. */
  readonly fields: Record<string, string>;
  /**
   * The server's `error.details` as it came. Some failures carry a next step
   * rather than field messages -- PHONE_UNVERIFIED names the destination to
   * send a code to -- and those callers read this.
   */
  readonly details: unknown;
  readonly requestId?: string;

  constructor(init: {
    message: string;
    code: string;
    status: number;
    fields?: Record<string, string>;
    details?: unknown;
    requestId?: string;
  }) {
    super(init.message);
    this.name = 'ApiError';
    this.code = init.code;
    this.status = init.status;
    this.fields = init.fields ?? {};
    this.details = init.details;
    this.requestId = init.requestId;
  }

  /** True when at least one message belongs on a specific input. */
  get hasFieldErrors(): boolean {
    return Object.keys(this.fields).length > 0;
  }
}

interface ErrorEnvelope {
  error?: { code?: string; message?: string; details?: unknown };
  requestId?: string;
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  if (error instanceof AxiosError) {
    const body = error.response?.data as ErrorEnvelope | undefined;

    // No response at all: offline, DNS, connection refused, timeout.
    if (!error.response) {
      return new ApiError({
        code: 'NETWORK',
        status: 0,
        message: 'Could not reach the server. Check your connection and try again.',
      });
    }

    return new ApiError({
      code: body?.error?.code ?? 'INTERNAL',
      status: error.response.status,
      message: body?.error?.message ?? 'Something went wrong. Please try again.',
      fields: toFieldErrors(body?.error?.details),
      details: body?.error?.details,
      requestId: body?.requestId,
    });
  }

  return new ApiError({
    code: 'INTERNAL',
    status: 0,
    message: error instanceof Error ? error.message : 'Something went wrong. Please try again.',
  });
}

/** `details: [{ path, message }]` becomes `{ path: message }` for the form. */
function toFieldErrors(details: unknown): Record<string, string> {
  if (!Array.isArray(details)) return {};

  const fields: Record<string, string> = {};
  for (const item of details) {
    if (!item || typeof item !== 'object') continue;
    const { path, message } = item as { path?: unknown; message?: unknown };
    // First message wins: the field shows one line, not a list.
    if (typeof path === 'string' && typeof message === 'string') fields[path] ??= message;
  }
  return fields;
}
