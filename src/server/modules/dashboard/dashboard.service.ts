/**
 * The single screen an office lands on.
 *
 * Deliberately one aggregated query per panel rather than a chatty read per card:
 * this endpoint is hit on every page load by every staff member, all day.
 *
 * IA: 6. Unified Dashboard
 */
import type { RequestContext } from '@/server/auth/context';
import type { Tx } from '@/server/db/tenant';
import { notImplemented } from '@/server/http/response';

export const dashboardService = {
  /** IA: 6. Dashboard Home > Today, Appointment Summary, Facility Summary */
  async getSummary(tx: Tx, ctx: RequestContext, query: unknown): Promise<unknown> {
    return notImplemented('dashboardService.getSummary');
  },

  /**
   * IA: 6. Action Required > New Requests, Reschedules, No-Shows,
   * Needs Review, Billing Issues
   */
  async getActionItems(tx: Tx, ctx: RequestContext): Promise<unknown> {
    return notImplemented('dashboardService.getActionItems');
  },
};
