/**
 * Reporting and export.
 *
 * Interactive reports are paginated and capped. Anything larger becomes an async
 * export, because a year of appointments will not render inside a request.
 *
 * Every export that contains patient data writes a phi_access_logs row, carries a
 * mandatory expiry, and is downloaded through a signed route -- never a public
 * storage URL.
 *
 * IA: 13. Reports
 */
import type { RequestContext } from '@/server/auth/context';
import type { Tx } from '@/server/db/tenant';
import { notImplemented } from '@/server/http/response';

export const reportService = {
  /** IA: 13. Reports > Appointments Report -- all 22 columns from the IA. */
  async getAppointmentsReport(tx: Tx, ctx: RequestContext, query: unknown): Promise<unknown> {
    return notImplemented('reportService.getAppointmentsReport');
  },

  async getFacilityReport(tx: Tx, ctx: RequestContext, query: unknown): Promise<unknown> {
    return notImplemented('reportService.getFacilityReport');
  },

  async getProviderReport(tx: Tx, ctx: RequestContext, query: unknown): Promise<unknown> {
    return notImplemented('reportService.getProviderReport');
  },

  async getOrganizationReport(tx: Tx, ctx: RequestContext, query: unknown): Promise<unknown> {
    return notImplemented('reportService.getOrganizationReport');
  },

  async listExports(tx: Tx, ctx: RequestContext, query: unknown): Promise<unknown> {
    return notImplemented('reportService.listExports');
  },

  /** Queues a CSV or PDF export. IA: 13/9. Reports > CSV Export, PDF Export */
  async requestExport(tx: Tx, ctx: RequestContext, body: unknown): Promise<unknown> {
    return notImplemented('reportService.requestExport');
  },

  /** Issues a short-lived signed URL and records the download. */
  async getExport(tx: Tx, ctx: RequestContext, id: string): Promise<unknown> {
    return notImplemented('reportService.getExport');
  },
};
