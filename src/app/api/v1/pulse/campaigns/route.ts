/**
 * pulse/campaigns
 *
 * Generated shape: validate, delegate, respond. All behaviour lives in the
 * module service so it can be unit-tested without an HTTP layer.
 */
import { defineRoute } from '@/server/http/handler';
import { ok } from '@/server/http/response';
import { createCampaignSchema } from '@/lib/pulse';
import { pulseService } from '@/server/modules/pulse/pulse.service';

/** IA: 9. Campaigns > Campaign List */
export const GET = defineRoute({
  access: 'user',
  permissions: ['pulse.read'],
  handler: async ({ tx, ctx, query }) =>
    ok(await pulseService.listCampaigns(tx, ctx, query)),
});

/** IA: 9. Campaigns > Create Campaign */
export const POST = defineRoute({
  access: 'user',
  permissions: ['pulse.manage'],
  body: createCampaignSchema,
  handler: async ({ tx, ctx, body }) =>
    ok(await pulseService.createCampaign(tx, ctx, body)),
});
