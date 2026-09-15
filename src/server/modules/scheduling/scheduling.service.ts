/**
 * Availability, the calendar, and bulk schedule editing.
 *
 * Bookable slots are derived from `availability_rules` at read time rather than
 * materialised, so an edit takes effect immediately. Derivation subtracts, in
 * order: date overrides, active booking holds, and appointments already taken.
 *
 * All arithmetic happens in the facility's timezone. Doing it in UTC quietly
 * breaks the week either side of a DST change.
 *
 * IA: 7. Scheduling
 */
import type { RequestContext } from '@/server/auth/context';
import type { Tx } from '@/server/db/tenant';
import { notImplemented } from '@/server/http/response';

export const schedulingService = {
  /**
   * Open slots for a provider or facility over a date range.
   * IA: 2. Select Date / Select Time
   */
  async getBookableSlots(tx: Tx, query: unknown): Promise<unknown> {
    return notImplemented('schedulingService.getBookableSlots');
  },

  /** IA: 7. Calendar > Day View, Week View, Provider View, Facility View */
  async getCalendar(tx: Tx, ctx: RequestContext, query: unknown): Promise<unknown> {
    return notImplemented('schedulingService.getCalendar');
  },

  async listRules(tx: Tx, ctx: RequestContext, query: unknown): Promise<unknown> {
    return notImplemented('schedulingService.listRules');
  },

  /**
   * Replaces a provider's weekly pattern wholesale. Existing appointments
   * outside the new pattern are reported back, never silently dropped.
   */
  async replaceRules(tx: Tx, ctx: RequestContext, body: unknown): Promise<unknown> {
    return notImplemented('schedulingService.replaceRules');
  },

  /** IA: 7. Schedule Editing > Templates */
  async listTemplates(tx: Tx, ctx: RequestContext): Promise<unknown> {
    return notImplemented('schedulingService.listTemplates');
  },

  async createTemplate(tx: Tx, ctx: RequestContext, body: unknown): Promise<unknown> {
    return notImplemented('schedulingService.createTemplate');
  },

  /**
   * Stages a bulk edit and returns the conflicts it would cause, so the UI can
   * show a diff first. IA: 7. Drag and Drop, Copy/Paste Day and Week
   */
  async proposeChanges(tx: Tx, ctx: RequestContext, body: unknown): Promise<unknown> {
    return notImplemented('schedulingService.proposeChanges');
  },

  /** Applies a staged change set atomically. IA: 7. Confirm Changes */
  async confirmChanges(tx: Tx, ctx: RequestContext, changeSetId: string): Promise<unknown> {
    return notImplemented('schedulingService.confirmChanges');
  },

  async listHolds(tx: Tx, ctx: RequestContext, query: unknown): Promise<unknown> {
    return notImplemented('schedulingService.listHolds');
  },

  /**
   * Pauses new bookings without touching existing ones.
   * IA: 7. Booking Holds > Today, This Week, This Month, Custom
   */
  async createHold(tx: Tx, ctx: RequestContext, body: unknown): Promise<unknown> {
    return notImplemented('schedulingService.createHold');
  },

  /** IA: 7. Booking Holds > Resume Bookings */
  async releaseHold(tx: Tx, ctx: RequestContext, holdId: string): Promise<unknown> {
    return notImplemented('schedulingService.releaseHold');
  },
};
