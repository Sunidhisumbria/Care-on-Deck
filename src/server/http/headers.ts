import { ApiError } from './errors';

export const TOKEN_HEADERS = {
  verification: 'x-verification-token',
  refresh: 'x-refresh-token',
  provider: 'x-provider-token',
} as const;

export function readTokenHeader(request: Request, header: string): string | null {
  const value = request.headers.get(header)?.trim();
  return value ? value : null;
}

export function requireTokenHeader(request: Request, header: string, what: string): string {
  const value = readTokenHeader(request, header);
  if (!value) {
    throw ApiError.badRequest(`${what} is missing. Send it in the ${header} header.`);
  }
  return value;
}
