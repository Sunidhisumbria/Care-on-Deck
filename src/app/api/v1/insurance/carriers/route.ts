/**
 * GET /api/v1/insurance/carriers
 *
 * The active insurance carriers. Public: the directory is reference data, used
 * by patients filtering search and by providers choosing what they accept.
 */
import { defineRoute } from '@/server/http/handler';
import { ok } from '@/server/http/response';
import { insuranceService } from '@/server/modules/insurance/insurance.service';

export const GET = defineRoute({
  access: 'public',
  handler: async ({ tx }) => ok(await insuranceService.listCarriers(tx)),
});
