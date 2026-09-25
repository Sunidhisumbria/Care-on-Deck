/** pulse/agencies/[id]/remove -- IA: 9. Agency Detail > Remove. Ends the partnership; history is kept. */
import { defineRoute } from '@/server/http/handler';
import { ok } from '@/server/http/response';
import { pulseService } from '@/server/modules/pulse/pulse.service';

export const POST = defineRoute<{ id: string }>({
  access: 'user',
  permissions: ['pulse.agencies.manage'],
  handler: async ({ tx, ctx, params }) => ok(await pulseService.removeAgency(tx, ctx, params.id)),
});
