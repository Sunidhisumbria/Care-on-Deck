'use client';

import { toast } from 'sonner';

import { HeartIcon } from '@/components/ui/icons';
import { toApiError } from '@/lib/http/errors';

import { useSavedProvider } from '../hooks';

/**
 * The heart on a provider card: filled when saved, outlined when not.
 *
 * `aria-pressed` makes it a toggle to a screen reader, and the label names the
 * provider -- a page of "Save" buttons with no subject is unusable by ear.
 */
export function SaveProviderButton({
  providerId,
  providerName,
  className = '',
  iconClassName = 'h-5 w-5',
}: {
  providerId: string;
  providerName: string;
  className?: string;
  iconClassName?: string;
}) {
  const { saved, loading, busy, toggle } = useSavedProvider(providerId);

  async function onClick() {
    try {
      await toggle();
    } catch (error) {
      toast.error(toApiError(error).message);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void onClick()}
      disabled={loading}
      aria-pressed={saved}
      aria-busy={busy}
      aria-label={saved ? `Remove ${providerName} from saved providers` : `Save ${providerName}`}
      title={saved ? 'Remove from saved providers' : 'Save provider'}
      className={`flex shrink-0 items-center justify-center rounded-full text-brand-600 transition-colors hover:bg-brand-50 disabled:cursor-wait disabled:opacity-50 ${className}`}
    >
      <HeartIcon className={iconClassName} filled={saved} />
    </button>
  );
}
