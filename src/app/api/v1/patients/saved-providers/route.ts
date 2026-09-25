/**
 * patients/saved-providers
 *
 * IA: 3. Patient Dashboard > Saved Providers. The caller's own list only.
 */
import { defineRoute } from '@/server/http/handler';
import { ok } from '@/server/http/response';
import { saveProviderSchema } from '@/server/modules/patients/saved-providers.schemas';
import { savedProvidersService } from '@/server/modules/patients/saved-providers.service';

/** Most recently saved first. Providers no longer listed are left out. */
export const GET = defineRoute({
  access: 'patient',
  handler: async ({ tx, ctx }) => ok(await savedProvidersService.list(tx, ctx)),
});

/** Saves a provider. Saving one already saved succeeds and changes nothing. */
export const POST = defineRoute({
  access: 'patient',
  body: saveProviderSchema,
  handler: async ({ tx, ctx, body }) => ok(await savedProvidersService.save(tx, ctx, body.provider_id)),
});
