/**
 * reports/exports/[id]
 *
 * Generated shape: validate, delegate, respond. All behaviour lives in the
 * module service so it can be unit-tested without an HTTP layer.
 */
import { defineRoute } from '@/server/http/handler';
import { ok } from '@/server/http/response';
import { reportService } from '@/server/modules/reports/report.service';

/** Signed, audited download. Never a public storage URL. */
export const GET = defineRoute<{ id: string }>({
  access: 'user',
  permissions: ['reports.export'],
  handler: async ({ tx, ctx, params }) =>
    ok(await reportService.getExport(tx, ctx, params.id)),
});
