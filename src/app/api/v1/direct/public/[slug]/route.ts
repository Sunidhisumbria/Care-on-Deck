/**
 * direct/public/[slug]
 *
 * Generated shape: validate, delegate, respond. All behaviour lives in the
 * module service so it can be unit-tested without an HTTP layer.
 */
import { defineRoute } from '@/server/http/handler';
import { ok } from '@/server/http/response';
import { directService } from '@/server/modules/direct/direct.service';

/** The unauthenticated Direct booking page. IA: 8. Private URL */
export const GET = defineRoute<{ slug: string }>({
  access: 'public',
  handler: async ({ tx, query, params }) =>
    ok(await directService.getPublicPage(tx, params.slug, query)),
});
