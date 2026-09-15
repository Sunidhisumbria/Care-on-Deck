/**
 * reports/appointments
 *
 * Generated shape: validate, delegate, respond. All behaviour lives in the
 * module service so it can be unit-tested without an HTTP layer.
 */
import { defineRoute } from '@/server/http/handler';
import { ok } from '@/server/http/response';
import { reportService } from '@/server/modules/reports/report.service';

/** IA: 13. Reports > Appointments Report */
export const GET = defineRoute({
  access: 'user',
  permissions: ['reports.read'],
  handler: async ({ tx, ctx, query }) =>
    ok(await reportService.getAppointmentsReport(tx, ctx, query)),
});
