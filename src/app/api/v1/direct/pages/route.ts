/**
 * direct/pages
 *
 * Generated shape: validate, delegate, respond. All behaviour lives in the
 * module service so it can be unit-tested without an HTTP layer.
 */
import { defineRoute } from '@/server/http/handler';
import { ok } from '@/server/http/response';
import { directService } from '@/server/modules/direct/direct.service';

/** IA: 8. Direct > Private Booking Page */
export const GET = defineRoute({
  access: 'user',
  permissions: ['direct.read'],
  handler: async ({ tx, ctx }) =>
    ok(await directService.listPages(tx, ctx)),
});

export const POST = defineRoute({
  access: 'user',
  permissions: ['direct.manage'],
  handler: async ({ tx, ctx, body }) =>
    ok(await directService.createPage(tx, ctx, body)),
});
