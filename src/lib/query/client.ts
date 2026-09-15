import { QueryClient } from '@tanstack/react-query';

import { ApiError } from '@/lib/http/errors';

/**
 * Defaults chosen for a signed-in app rather than a content site.
 *
 * The important one is `retry`: a 4xx means the request was wrong, and asking
 * again three times only delays the error the user needs to see. Retrying is
 * for the network and for 5xx.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: (failureCount, error) => {
          if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
          return failureCount < 2;
        },
        refetchOnWindowFocus: false,
      },
      mutations: {
        // Mutations are never retried: a second signup or a second payment is
        // worse than an error message.
        retry: false,
      },
    },
  });
}
