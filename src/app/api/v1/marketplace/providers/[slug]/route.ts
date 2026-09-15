/**
 * marketplace/providers/[slug]
 *
 * Generated shape: validate, delegate, respond. All behaviour lives in the
 * module service so it can be unit-tested without an HTTP layer.
 */
import { defineRoute } from '@/server/http/handler';
import { ok } from '@/server/http/response';
import { marketplaceService } from '@/server/modules/marketplace/marketplace.service';

/** IA: 1. Provider Profile */
export const GET = defineRoute<{ slug: string }>({
  access: 'public',
  handler: async ({ tx, params }) =>
    ok(await marketplaceService.getProviderProfile(tx, params.slug)),
});
