/**
 * direct/pages/[id]
 *
 * Generated shape: validate, delegate, respond. All behaviour lives in the
 * module service so it can be unit-tested without an HTTP layer.
 */
import { defineRoute } from '@/server/http/handler';
import { ok } from '@/server/http/response';
import { directService } from '@/server/modules/direct/direct.service';

export const GET = defineRoute<{ id: string }>({
  access: 'user',
  permissions: ['direct.read'],
  handler: async ({ tx, ctx, params }) =>
    ok(await directService.getPage(tx, ctx, params.id)),
});

/** IA: 8. Direct Settings > Branding, Add-ons, Auto-Replenish */
export const PATCH = defineRoute<{ id: string }>({
  access: 'user',
  permissions: ['direct.manage'],
  handler: async ({ tx, ctx, body, params }) =>
    ok(await directService.updatePage(tx, ctx, params.id, body)),
});
