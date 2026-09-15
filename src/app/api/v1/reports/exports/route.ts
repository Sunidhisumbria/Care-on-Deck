/**
 * reports/exports
 *
 * Generated shape: validate, delegate, respond. All behaviour lives in the
 * module service so it can be unit-tested without an HTTP layer.
 */
import { defineRoute } from '@/server/http/handler';
import { ok } from '@/server/http/response';
import { reportService } from '@/server/modules/reports/report.service';

export const GET = defineRoute({
  access: 'user',
  permissions: ['reports.read'],
  handler: async ({ tx, ctx, query }) =>
    ok(await reportService.listExports(tx, ctx, query)),
});

/** IA: 13/9. Reports > CSV Export, PDF Export. Async; returns a job. */
export const POST = defineRoute({
  access: 'user',
  permissions: ['reports.export'],
  handler: async ({ tx, ctx, body }) =>
    ok(await reportService.requestExport(tx, ctx, body)),
});
