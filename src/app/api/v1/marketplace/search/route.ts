/**
 * marketplace/search
 *
 * Generated shape: validate, delegate, respond. All behaviour lives in the
 * module service so it can be unit-tested without an HTTP layer.
 */
import { defineRoute } from '@/server/http/handler';
import { ok } from '@/server/http/response';
import { providerSearchQuerySchema } from '@/server/modules/marketplace/marketplace.schemas';
import { marketplaceService } from '@/server/modules/marketplace/marketplace.service';

/** IA: 1. Public Marketplace > Search Results */
export const GET = defineRoute({
  access: 'public',
  query: providerSearchQuerySchema,
  handler: async ({ tx, query }) => ok(await marketplaceService.search(tx, query)),
});
