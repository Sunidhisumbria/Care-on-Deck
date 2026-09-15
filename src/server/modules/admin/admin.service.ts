/**
 * Control Center: the platform-operations surface.
 *
 * Every method here reads across tenants, which is exactly why every method here
 * writes an audit row. `withInternal` is not a shortcut past accountability -- it
 * is a different accountability path.
 *
 * IA: 14. Control Center
 */
import type { RequestContext } from '@/server/auth/context';
import type { Tx } from '@/server/db/tenant';
import { notImplemented } from '@/server/http/response';

export const adminService = {
  /** IA: 14. Admin Home */
  async getOverview(tx: Tx, ctx: RequestContext): Promise<unknown> {
    return notImplemented('adminService.getOverview');
  },

  /**
   * IA: 14. User Management > Patients, Providers, Facilities, Staff,
   * Organizations, Internal Users
   */
  async listUsers(tx: Tx, ctx: RequestContext, query: unknown): Promise<unknown> {
    return notImplemented('adminService.listUsers');
  },

  /** IA: 14. Account Status. Suspension also revokes live sessions. */
  async setAccountStatus(tx: Tx, ctx: RequestContext, userId: string, body: unknown): Promise<unknown> {
    return notImplemented('adminService.setAccountStatus');
  },

  /** IA: 14. Approvals > Provider, Facility, Photo Review, Review Moderation */
  async listApprovals(tx: Tx, ctx: RequestContext, query: unknown): Promise<unknown> {
    return notImplemented('adminService.listApprovals');
  },

  /** Approve, reject, or return with a checklist of requested changes. */
  async decideApproval(tx: Tx, ctx: RequestContext, id: string, body: unknown): Promise<unknown> {
    return notImplemented('adminService.decideApproval');
  },

  async listTransfers(tx: Tx, ctx: RequestContext, query: unknown): Promise<unknown> {
    return notImplemented('adminService.listTransfers');
  },

  /** IA: 14. Provider Transfer > Current Facility, Target Facility */
  async createTransfer(tx: Tx, ctx: RequestContext, body: unknown): Promise<unknown> {
    return notImplemented('adminService.createTransfer');
  },

  /**
   * IA: 14. Provider Transfer > Waiting Period, Early Release,
   * Complete Transfer
   */
  async updateTransfer(tx: Tx, ctx: RequestContext, id: string, body: unknown): Promise<unknown> {
    return notImplemented('adminService.updateTransfer');
  },

  async listCarriers(tx: Tx, ctx: RequestContext, query: unknown): Promise<unknown> {
    return notImplemented('adminService.listCarriers');
  },

  async createCarrier(tx: Tx, ctx: RequestContext, body: unknown): Promise<unknown> {
    return notImplemented('adminService.createCarrier');
  },

  /** IA: 14. Insurance Directory > Plans, Aliases, Regions */
  async listPlans(tx: Tx, ctx: RequestContext, query: unknown): Promise<unknown> {
    return notImplemented('adminService.listPlans');
  },

  async createPlan(tx: Tx, ctx: RequestContext, body: unknown): Promise<unknown> {
    return notImplemented('adminService.createPlan');
  },

  /**
   * IA: 14. Pricing Configuration > Marketplace, Direct, Pulse, Bundles,
   * Add-ons, Sponsored Placement
   */
  async getPricing(tx: Tx, ctx: RequestContext): Promise<unknown> {
    return notImplemented('adminService.getPricing');
  },

  async updatePricing(tx: Tx, ctx: RequestContext, body: unknown): Promise<unknown> {
    return notImplemented('adminService.updatePricing');
  },

  /** IA: 14. Usage Tracking. Credits billed against vendor cost, per meter. */
  async getUsageTracking(tx: Tx, ctx: RequestContext, query: unknown): Promise<unknown> {
    return notImplemented('adminService.getUsageTracking');
  },

  /** IA: 14. Feature Flags */
  async listFeatureFlags(tx: Tx, ctx: RequestContext): Promise<unknown> {
    return notImplemented('adminService.listFeatureFlags');
  },

  async setFeatureFlag(tx: Tx, ctx: RequestContext, body: unknown): Promise<unknown> {
    return notImplemented('adminService.setFeatureFlag');
  },

  /** IA: 14. Audit Logs */
  async listAuditLogs(tx: Tx, ctx: RequestContext, query: unknown): Promise<unknown> {
    return notImplemented('adminService.listAuditLogs');
  },
};
