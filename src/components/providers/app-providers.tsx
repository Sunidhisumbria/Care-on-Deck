'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { Toaster } from 'sonner';

import { createQueryClient } from '@/lib/query/client';

/**
 * Client-side providers for the whole app.
 *
 * The QueryClient is created inside `useState` rather than at module scope on
 * purpose: a module-level client is shared by every request the server
 * renders, which on a server would leak one user's cached data into another's
 * page. This gives each browser session its own.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* No close button: toasts dismiss themselves, and the cross only added
          a hit target to a message nobody needs to act on. */}
      <Toaster position="top-right" richColors toastOptions={{ className: 'font-sans' }} />
    </QueryClientProvider>
  );
}
