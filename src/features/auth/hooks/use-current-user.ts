'use client';

import { useQuery } from '@tanstack/react-query';

import { ApiError } from '@/lib/http/errors';
import { authKeys } from '@/lib/query/keys';

import { authApi } from '../api/auth.api';

/**
 * Who is signed in, according to the server.
 *
 * The only source of truth for that question -- the session lives in an
 * httpOnly cookie, so the browser cannot read it and must ask.
 *
 * Three answers come back and two of them mean "show the signed-out header":
 * no credential at all (200, `user: null`), and a credential that no longer
 * resolves (401). They are kept apart in `sessionExpired` because a screen
 * that was showing someone's data needs to react to the second one, while the
 * public header does not care which it was.
 */
export function useCurrentUser() {
  const query = useQuery({
    queryKey: authKeys.currentUser(),
    queryFn: authApi.currentUser,
  });

  const sessionExpired = query.error instanceof ApiError && query.error.status === 401;

  return {
    ...query,
    user: query.data?.user ?? null,
    isSignedIn: Boolean(query.data?.user),
    sessionExpired,
  };
}
