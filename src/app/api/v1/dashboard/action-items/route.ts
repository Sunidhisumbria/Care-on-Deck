/**
 * dashboard/action-items
 *
 * Generated shape: validate, delegate, respond. All behaviour lives in the
 * module service so it can be unit-tested without an HTTP layer.
 */
import { defineRoute } from '@/server/http/handler';
import { ok } from '@/server/http/response';
import { dashboardService } from '@/server/modules/dashboard/dashboard.service';

/** IA: 6. Action Required > New Requests, Reschedules, No-Shows, Billing Issues */
export const GET = defineRoute({
  access: 'user',
  permissions: ['appointments.read'],
  handler: async ({ tx, ctx }) =>
    ok(await dashboardService.getActionItems(tx, ctx)),
});
