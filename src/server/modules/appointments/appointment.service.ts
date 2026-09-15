/**
 * The appointment lifecycle.
 *
 * Every status change does three things in one transaction: update the row,
 * append an `appointment_events` row, and queue the patient notification. They
 * belong together -- an appointment marked cancelled with no notification sent is
 * worse than one that failed outright.
 *
 * IA: 6. Unified Dashboard; 7. Scheduling
 */
import type { RequestContext } from '@/server/auth/context';
import type { Tx } from '@/server/db/tenant';
import { notImplemented } from '@/server/http/response';

export const appointmentService = {
  async list(tx: Tx, ctx: RequestContext, query: unknown): Promise<unknown> {
    return notImplemented('appointmentService.list');
  },

  /** Returns patient demographics, so it must write a phi_access_logs row. */
  async get(tx: Tx, ctx: RequestContext, id: string): Promise<unknown> {
    return notImplemented('appointmentService.get');
  },

  /** Staff booking on a patient's behalf; source is recorded as 'staff'. */
  async createForPatient(tx: Tx, ctx: RequestContext, body: unknown): Promise<unknown> {
    return notImplemented('appointmentService.createForPatient');
  },

  async update(tx: Tx, ctx: RequestContext, id: string, body: unknown): Promise<unknown> {
    return notImplemented('appointmentService.update');
  },

  /** IA: 6. Unified Dashboard > New Requests */
  async confirm(tx: Tx, ctx: RequestContext, id: string): Promise<unknown> {
    return notImplemented('appointmentService.confirm');
  },

  /** Reason is required -- it is a column on the Appointments Report. */
  async cancel(tx: Tx, ctx: RequestContext, id: string, body: unknown): Promise<unknown> {
    return notImplemented('appointmentService.cancel');
  },

  /**
   * Creates a new appointment linked by `rescheduledFromId` rather than
   * mutating times in place, so the history stays readable.
   */
  async reschedule(tx: Tx, ctx: RequestContext, id: string, body: unknown): Promise<unknown> {
    return notImplemented('appointmentService.reschedule');
  },

  /** IA: 6. Unified Dashboard > No-Shows */
  async markNoShow(tx: Tx, ctx: RequestContext, id: string): Promise<unknown> {
    return notImplemented('appointmentService.markNoShow');
  },
};
