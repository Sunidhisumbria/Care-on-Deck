/**
 * POST /api/v1/uploads/complete
 *
 * Reports an upload finished. The server checks what actually arrived in the
 * store -- type and size by the store's own inspection -- before recording it,
 * and deletes a file that breaks the rules.
 */
import { defineRoute } from '@/server/http/handler';
import { ok } from '@/server/http/response';
import { completeUploadSchema } from '@/server/modules/uploads/uploads.schemas';
import { uploadsService } from '@/server/modules/uploads/uploads.service';

export const POST = defineRoute({
  access: 'account',
  body: completeUploadSchema,
  handler: async ({ tx, ctx, body }) => ok(await uploadsService.complete(tx, ctx, body)),
});
