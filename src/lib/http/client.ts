import axios from 'axios';

import { toApiError } from './errors';

/**
 * The one way the browser talks to our API.
 *
 * Auth rides on the session cookie, which is httpOnly -- so there is no token
 * for JavaScript to hold, forget to attach, or leak. `withCredentials` is the
 * whole of the auth setup.
 *
 * Every response is unwrapped from the `{ success, data }` envelope and every
 * failure is normalised to `ApiError`, so callers see either the payload they
 * asked for or one predictable error.
 */
export const http = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
  timeout: 20_000,
});

http.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(toApiError(error)),
);

/** The success envelope. Failures never reach here -- they throw. */
interface Envelope<T> {
  success: true;
  data: T;
  meta?: { nextCursor?: string | null; total?: number };
}

/**
 * Extra headers for a single call.
 *
 * This is how credentials reach the API -- a verification proof, a provider
 * token. They are never put in the body: a body is what request logging
 * captures in full and what devtools shows to anyone looking over a shoulder.
 */
export type RequestHeaders = Record<string, string>;

export async function apiGet<T>(
  url: string,
  params?: Record<string, unknown>,
  headers?: RequestHeaders,
): Promise<T> {
  const response = await http.get<Envelope<T>>(url, { params, headers });
  return response.data.data;
}

export async function apiPost<T>(
  url: string,
  body?: unknown,
  headers?: RequestHeaders,
): Promise<T> {
  const response = await http.post<Envelope<T>>(url, body, { headers });
  return response.data.data;
}

export async function apiPatch<T>(
  url: string,
  body?: unknown,
  headers?: RequestHeaders,
): Promise<T> {
  const response = await http.patch<Envelope<T>>(url, body, { headers });
  return response.data.data;
}

export async function apiDelete<T>(url: string): Promise<T> {
  const response = await http.delete<Envelope<T>>(url);
  return response.data.data;
}
