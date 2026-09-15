/**
 * POST /api/v1/uploads
 *
 * Permission to upload one file. Returns where the browser should send it and
 * the signed form fields to send with it; the file itself never comes here.
 *
 * `access: 'account'`: a provider mid-application has no organization yet.
 */
import { defineRoute } from '@/server/http/handler';
import { ok } from '@/server/http/response';
import { createUploadSchema } from '@/server/modules/uploads/uploads.schemas';
import { uploadsService } from '@/server/modules/uploads/uploads.service';

export const POST = defineRoute({
  access: 'account',
  body: createUploadSchema,
  handler: async ({ tx, ctx, body }) => ok(await uploadsService.create(tx, ctx, body)),
});
