import { NextResponse } from 'next/server';

import { ApiError } from './errors';

/**
 * One envelope for every response, so the frontend has a single shape to
 * narrow on rather than a per-endpoint guess.
 *
 * `success` is the discriminant. Note it is not the same thing as the HTTP
 * status: the status says what happened to the request, this says whether the
 * body holds a result or a failure, and clients branch on it before touching
 * either field.
 */
export type ApiResponse<T> =
  | { success: true; data: T; meta?: ResponseMeta }
  | {
      success: false;
      error: { code: string; message: string; details?: unknown };
      requestId: string;
    };

export interface ResponseMeta {
  /** Cursor pagination -- offsets drift on a table this write-heavy. */
  nextCursor?: string | null;
  total?: number;
  requestId?: string;
}

const NO_STORE = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, private',
} as const;

export function ok<T>(data: T, meta?: ResponseMeta, status = 200) {
  return NextResponse.json<ApiResponse<T>>(
    { success: true, data, meta },
    { status, headers: NO_STORE },
  );
}

export function created<T>(data: T, meta?: ResponseMeta) {
  return ok(data, meta, 201);
}

export function noContent() {
  return new NextResponse(null, { status: 204, headers: NO_STORE });
}

export function failure(error: ApiError, requestId: string) {
  return NextResponse.json<ApiResponse<never>>(
    {
      success: false,
      error: { code: error.code, message: error.message, details: error.details },
      requestId,
    },
    { status: error.status, headers: NO_STORE },
  );
}

/**
 * Marks an endpoint that is routed and typed but has no implementation yet.
 * Returning a real 501 rather than a stub payload keeps the frontend honest --
 * a screen wired to an unfinished endpoint fails visibly instead of rendering
 * plausible fake data that nobody notices until launch.
 */
export function notImplemented(what: string): never {
  throw ApiError.notImplemented(what);
}
