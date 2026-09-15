/**
 * dashboard/summary
 *
 * Generated shape: validate, delegate, respond. All behaviour lives in the
 * module service so it can be unit-tested without an HTTP layer.
 */
import { defineRoute } from '@/server/http/handler';
import { ok } from '@/server/http/response';
import { dashboardService } from '@/server/modules/dashboard/dashboard.service';

/** IA: 6. Dashboard Home > Today / Appointment Summary / Facility Summary */
export const GET = defineRoute({
  access: 'user',
  permissions: ['appointments.read'],
  handler: async ({ tx, ctx, query }) =>
    ok(await dashboardService.getSummary(tx, ctx, query)),
});
