/**
 * GET /api/v1/uploads/[id]/view
 *
 * A link to open a stored file, valid for five minutes. For the uploader and
 * for CareOndeck staff; anyone else gets 404, the same as a file that does not
 * exist. Every link issued is audited.
 */
import { defineRoute } from '@/server/http/handler';
import { ok } from '@/server/http/response';
import { uploadsService } from '@/server/modules/uploads/uploads.service';

export const GET = defineRoute<{ id: string }>({
  access: 'account',
  handler: async ({ tx, ctx, params }) => ok(await uploadsService.viewLink(tx, ctx, params.id)),
});
