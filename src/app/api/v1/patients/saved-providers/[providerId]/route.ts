/**
 * patients/saved-providers/[providerId]
 *
 * IA: 3. Patient Dashboard > Saved Providers. Keyed by provider, not by the
 * saved row, because the heart on a card only knows who the provider is.
 */
import { defineRoute } from '@/server/http/handler';
import { ok } from '@/server/http/response';
import { savedProvidersService } from '@/server/modules/patients/saved-providers.service';

/** Unsaves. Unsaving one that is not saved succeeds and changes nothing. */
export const DELETE = defineRoute<{ providerId: string }>({
  access: 'patient',
  handler: async ({ tx, ctx, params }) => ok(await savedProvidersService.remove(tx, ctx, params.providerId)),
});
