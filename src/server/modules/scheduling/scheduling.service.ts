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
import { DateTime } from 'luxon';

import type { ScheduleValues } from '@/lib/schedule';

import type { RequestContext } from '@/server/auth/context';
import type { Tx } from '@/server/db/tenant';
import { ApiError } from '@/server/http/errors';
import { notImplemented } from '@/server/http/response';

import { NEXT_AVAILABLE_DAYS, openSlots, type Slot } from './availability';
import * as practiceCalendar from './practice-calendar';
import type { BookableSlotsQuery, CalendarQuery, CreateHoldInput } from './scheduling.schemas';

export interface BookableDay {
  /** Calendar date in the clinic's zone. */
  date: string;
  slots: Slot[];
}

export interface BookableSlotsResult {
  provider_id: string;
  timezone: string;
  days: BookableDay[];
}

export const schedulingService = {
  /**
   * Open slots for a provider over a span of dates.
   *
   * Only days with something open are returned. A date the calendar does not
   * get back is a date that cannot be booked -- a closed Saturday and a fully
   * taken Tuesday look the same to a patient, and both are unpickable.
   *
   * Public: this is what the booking picker reads before anyone signs in.
   * It exposes free time only -- who booked the rest is never part of it.
   */
  async getBookableSlots(tx: Tx, query: BookableSlotsQuery): Promise<BookableSlotsResult> {
    const found = await openSlots(tx, {
      providerIds: [query.provider_id],
      // Wide enough to cover the requested dates in any clinic zone; the dates
      // themselves are resolved against the clinic's calendar inside.
      from: DateTime.now().minus({ days: 1 }).toJSDate(),
      to: DateTime.now().plus({ days: NEXT_AVAILABLE_DAYS * 3 }).toJSDate(),
      dates: {
        from: query.from ?? DateTime.now().toISODate()!,
        to: query.to ?? DateTime.now().plus({ days: NEXT_AVAILABLE_DAYS }).toISODate()!,
      },
    });

    const provider = found.get(query.provider_id);
    if (!provider) {
      // Either there is no such provider, or they are not listed. Both are the
      // same answer to someone who cannot see them.
      throw ApiError.notFound('That provider is not taking bookings.');
    }

    const byDate = new Map<string, Slot[]>();
    for (const slot of provider.slots) {
      const date = DateTime.fromISO(slot.starts_at).setZone(provider.timezone).toISODate()!;
      const list = byDate.get(date);
      if (list) list.push(slot);
      else byDate.set(date, [slot]);
    }

    return {
      provider_id: query.provider_id,
      timezone: provider.timezone,
      days: [...byDate.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, slots]) => ({ date, slots })),
    };
  },

  /** IA: 7. Calendar > Day View, Week View, Provider View, Facility View */
  async getCalendar(tx: Tx, ctx: RequestContext, query: CalendarQuery): Promise<practiceCalendar.PracticeCalendar> {
    return practiceCalendar.getCalendar(tx, ctx, query);
  },

  async listRules(tx: Tx, ctx: RequestContext, _query: unknown): Promise<ScheduleValues> {
    return practiceCalendar.getWeeklySchedule(tx, ctx);
  },

  /**
   * Replaces a provider's weekly pattern wholesale. Existing appointments
   * outside the new pattern are reported back, never silently dropped.
   */
  async replaceRules(
    tx: Tx,
    ctx: RequestContext,
    body: ScheduleValues,
  ): Promise<{ schedule: ScheduleValues; conflicts: practiceCalendar.ScheduleConflict[] }> {
    return practiceCalendar.replaceWeeklySchedule(tx, ctx, body);
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

  async listHolds(tx: Tx, ctx: RequestContext, _query: unknown): Promise<practiceCalendar.BookingHold[]> {
    return practiceCalendar.listHolds(tx, ctx);
  },

  /**
   * Pauses new bookings without touching existing ones.
   * IA: 7. Booking Holds > Today, This Week, This Month, Custom
   */
  async createHold(tx: Tx, ctx: RequestContext, body: CreateHoldInput): Promise<practiceCalendar.BookingHold> {
    return practiceCalendar.createHold(tx, ctx, body);
  },

  /** IA: 7. Booking Holds > Resume Bookings */
  async releaseHold(tx: Tx, ctx: RequestContext, holdId: string): Promise<practiceCalendar.BookingHold> {
    return practiceCalendar.releaseHold(tx, ctx, holdId);
  },
};
