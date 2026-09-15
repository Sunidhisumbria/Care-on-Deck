/**
 * direct/pages/[id]/install
 *
 * Generated shape: validate, delegate, respond. All behaviour lives in the
 * module service so it can be unit-tested without an HTTP layer.
 */
import { defineRoute } from '@/server/http/handler';
import { ok } from '@/server/http/response';
import { directService } from '@/server/modules/direct/direct.service';

/** IA: 8. Website Install > Embed Code, Copy Link, Install Status */
export const GET = defineRoute<{ id: string }>({
  access: 'user',
  permissions: ['direct.read'],
  handler: async ({ tx, ctx, params }) =>
    ok(await directService.getInstall(tx, ctx, params.id)),
});

/** IA: 8. Website Install > Done For You Setup */
export const POST = defineRoute<{ id: string }>({
  access: 'user',
  permissions: ['direct.manage'],
  handler: async ({ tx, ctx, params }) =>
    ok(await directService.requestDoneForYou(tx, ctx, params.id)),
});
