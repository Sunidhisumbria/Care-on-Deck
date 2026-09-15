/**
 * Organization and facility settings, staff, roles and the permission matrix.
 *
 * Facility settings inherit from organization settings: a null field means
 * "follow the org", which is why they are stored as sparse JSONB rather than a
 * fully populated row per facility.
 *
 * IA: 12. Settings
 */
import type { RequestContext } from '@/server/auth/context';
import type { Tx } from '@/server/db/tenant';
import { notImplemented } from '@/server/http/response';

export const settingsService = {
  async getOrganization(tx: Tx, ctx: RequestContext): Promise<unknown> {
    return notImplemented('settingsService.getOrganization');
  },

  async updateOrganization(tx: Tx, ctx: RequestContext, body: unknown): Promise<unknown> {
    return notImplemented('settingsService.updateOrganization');
  },

  /** Returns effective settings -- the facility overlay merged onto the org. */
  async getFacility(tx: Tx, ctx: RequestContext, id: string): Promise<unknown> {
    return notImplemented('settingsService.getFacility');
  },

  async updateFacility(tx: Tx, ctx: RequestContext, id: string, body: unknown): Promise<unknown> {
    return notImplemented('settingsService.updateFacility');
  },

  /** IA: 12. Settings > Security Settings, MFA, Trusted Device */
  async getSecurity(tx: Tx, ctx: RequestContext): Promise<unknown> {
    return notImplemented('settingsService.getSecurity');
  },

  async updateSecurity(tx: Tx, ctx: RequestContext, body: unknown): Promise<unknown> {
    return notImplemented('settingsService.updateSecurity');
  },

  /** IA: 12. Settings > Staff */
  async listStaff(tx: Tx, ctx: RequestContext, query: unknown): Promise<unknown> {
    return notImplemented('settingsService.listStaff');
  },

  async inviteStaff(tx: Tx, ctx: RequestContext, body: unknown): Promise<unknown> {
    return notImplemented('settingsService.inviteStaff');
  },

  async updateStaff(tx: Tx, ctx: RequestContext, id: string, body: unknown): Promise<unknown> {
    return notImplemented('settingsService.updateStaff');
  },

  /** Soft-deletes the membership and revokes that user's sessions for this org. */
  async removeStaff(tx: Tx, ctx: RequestContext, id: string): Promise<unknown> {
    return notImplemented('settingsService.removeStaff');
  },

  /** IA: 12. Settings > Roles */
  async listRoles(tx: Tx, ctx: RequestContext): Promise<unknown> {
    return notImplemented('settingsService.listRoles');
  },

  async createRole(tx: Tx, ctx: RequestContext, body: unknown): Promise<unknown> {
    return notImplemented('settingsService.createRole');
  },

  /** IA: 12. Settings > Permission Matrix. System roles are not editable. */
  async updateRole(tx: Tx, ctx: RequestContext, id: string, body: unknown): Promise<unknown> {
    return notImplemented('settingsService.updateRole');
  },

  async listPermissions(tx: Tx, ctx: RequestContext): Promise<unknown> {
    return notImplemented('settingsService.listPermissions');
  },
};
