/**
 * The practice calendar and booking holds.
 *
 * Whose calendar: a member who is a provider sees their own appointments and
 * pauses their own bookings. A member who is not (front-desk staff) sees the
 * whole location and pauses the location. A hold with no provider already
 * closes every provider at its facility -- see busyIntervals in availability.
 *
 * All day arithmetic is done in the clinic's zone with Luxon. A hold for
 * "today" is the clinic's today, and a week never loses or gains an hour
 * across a DST change.
 *
 * IA: 7. Calendar; 7. Booking Holds
 */
import { and, asc, desc, eq, gt, inArray, isNull, lt, notInArray, or, type SQL } from 'drizzle-orm';
import { DateTime } from 'luxon';

import { toMinutes, WEEKDAYS, workingWindows, type ScheduleValues } from '@/lib/schedule';
import type { RequestContext } from '@/server/auth/context';
import { appointments } from '@/server/db/schema/appointments';
import { facilities } from '@/server/db/schema/organizations';
import { patients } from '@/server/db/schema/patients';
import { providerFacilities, providers } from '@/server/db/schema/providers';
import { availabilityRules, bookingHolds, visitReasons } from '@/server/db/schema/scheduling';
import type { Tx } from '@/server/db/tenant';
import { ApiError } from '@/server/http/errors';
import { recordAudit } from '@/server/observability/audit';

import type { CalendarQuery, CreateHoldInput } from './scheduling.schemas';

type Status = (typeof appointments.$inferSelect)['status'];

export interface BookingHold {
  id: string;
  scope: 'today' | 'this_week' | 'this_month' | 'custom';
  starts_at: string;
  /** Exclusive: the first instant bookings are open again. */
  ends_at: string;
  reason: string | null;
  /** Null when it holds the whole location. */
  provider_id: string | null;
}

export interface PracticeCalendar {
  timezone: string;
  /** The length of one bookable slot, for the day view's rows. */
  slot_minutes: number;
  /** Working hours as "HH:MM", widest across the week; null when none are set. */
  hours: { start: string; end: string } | null;
  /** Weekdays with working hours: 0 = Sunday … 6 = Saturday. */
  working_days: number[];
  appointments: Array<{
    id: string;
    starts_at: string;
    ends_at: string;
    patient_name: string;
    problem: string | null;
    status: Status;
  }>;
  /** Unreleased holds that have not ended yet. */
  holds: BookingHold[];
}

/** Not on a calendar: called off, turned down, or superseded by a reschedule. */
const OFF_CALENDAR: Status[] = ['cancelled', 'declined', 'rescheduled'];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getCalendar(tx: Tx, ctx: RequestContext, query: CalendarQuery): Promise<PracticeCalendar> {
  const scope = await resolveScope(tx, ctx);
  const zone = scope.facility.timezone;
  const from = DateTime.fromISO(query.from, { zone }).startOf('day');
  const to = DateTime.fromISO(query.to, { zone }).plus({ days: 1 }).startOf('day');

  const rows = await tx
    .select({
      id: appointments.id,
      startsAt: appointments.startsAt,
      endsAt: appointments.endsAt,
      status: appointments.status,
      firstName: patients.firstName,
      lastName: patients.lastName,
      reason: visitReasons.name,
    })
    .from(appointments)
    .innerJoin(patients, eq(patients.id, appointments.patientId))
    .leftJoin(visitReasons, eq(visitReasons.id, appointments.visitReasonId))
    .where(
      and(
        eq(appointments.organizationId, scope.organizationId),
        scope.providerId ? eq(appointments.providerId, scope.providerId) : eq(appointments.facilityId, scope.facility.id),
        isNull(appointments.deletedAt),
        notInArray(appointments.status, OFF_CALENDAR),
        lt(appointments.startsAt, to.toJSDate()),
        gt(appointments.endsAt, from.toJSDate()),
      ),
    )
    .orderBy(asc(appointments.startsAt));

  const rules = await tx
    .select({
      weekday: availabilityRules.weekday,
      startTime: availabilityRules.startTime,
      endTime: availabilityRules.endTime,
      slotIntervalMinutes: availabilityRules.slotIntervalMinutes,
    })
    .from(availabilityRules)
    .where(
      and(
        eq(availabilityRules.organizationId, scope.organizationId),
        eq(availabilityRules.isActive, true),
        scope.providerId
          ? eq(availabilityRules.providerId, scope.providerId)
          : eq(availabilityRules.facilityId, scope.facility.id),
      ),
    );

  const starts = rules.map((rule) => rule.startTime.slice(0, 5)).sort();
  const ends = rules.map((rule) => rule.endTime.slice(0, 5)).sort();

  return {
    timezone: zone,
    slot_minutes: rules.length > 0 ? Math.min(...rules.map((rule) => rule.slotIntervalMinutes)) : 30,
    hours: rules.length > 0 ? { start: starts[0]!, end: ends[ends.length - 1]! } : null,
    working_days: [...new Set(rules.map((rule) => rule.weekday))].sort(),
    appointments: rows.map((row) => ({
      id: row.id,
      starts_at: row.startsAt.toISOString(),
      ends_at: row.endsAt.toISOString(),
      patient_name: `${row.firstName} ${row.lastName}`.trim(),
      problem: row.reason,
      status: row.status,
    })),
    holds: await activeHolds(tx, scope),
  };
}

export async function listHolds(tx: Tx, ctx: RequestContext): Promise<BookingHold[]> {
  return activeHolds(tx, await resolveScope(tx, ctx));
}

/** Pauses new bookings over a period. Appointments already booked are untouched. */
export async function createHold(tx: Tx, ctx: RequestContext, input: CreateHoldInput): Promise<BookingHold> {
  const scope = await resolveScope(tx, ctx);
  const zone = scope.facility.timezone;
  const today = DateTime.now().setZone(zone).startOf('day');

  let start = today;
  let end: DateTime;
  switch (input.scope) {
    case 'today':
      end = today.plus({ days: 1 });
      break;
    case 'this_week':
      // Luxon weeks are ISO weeks: Monday to Sunday, so this runs to the end of Sunday.
      end = today.endOf('week').plus({ milliseconds: 1 });
      break;
    case 'this_month':
      end = today.endOf('month').plus({ milliseconds: 1 });
      break;
    case 'custom': {
      start = DateTime.fromISO(input.from, { zone }).startOf('day');
      end = DateTime.fromISO(input.to, { zone }).plus({ days: 1 }).startOf('day');
      const fail = (path: string, message: string) =>
        new ApiError('VALIDATION_FAILED', message, { details: [{ path, message }] });
      if (!start.isValid || !end.isValid) throw fail('from', 'Choose valid dates.');
      if (start < today) throw fail('from', 'A hold cannot start in the past.');
      if (end <= start) throw fail('to', 'The last day comes before the first.');
      if (end.diff(start, 'days').days > 366) throw fail('to', 'Hold bookings for a year or less.');
      break;
    }
  }

  const [row] = await tx
    .insert(bookingHolds)
    .values({
      organizationId: scope.organizationId,
      facilityId: scope.facility.id,
      providerId: scope.providerId,
      scope: input.scope,
      startsAt: start.toJSDate(),
      endsAt: end.toJSDate(),
      reason: input.scope === 'custom' ? (input.reason ?? null) : null,
      createdByUserId: ctx.session!.userId,
    })
    .returning();
  if (!row) throw ApiError.internal('Could not pause bookings.');

  await recordAudit(tx, ctx, {
    action: 'schedule.hold_created',
    resourceType: 'booking_hold',
    resourceId: row.id,
    organizationId: scope.organizationId,
    metadata: { scope: input.scope, starts_at: row.startsAt.toISOString(), ends_at: row.endsAt.toISOString() },
  });

  return toHold(row);
}

/** Resumes bookings over a hold's period. Releasing one already released changes nothing. */
export async function releaseHold(tx: Tx, ctx: RequestContext, holdId: string): Promise<BookingHold> {
  const scope = await resolveScope(tx, ctx);
  if (!UUID.test(holdId)) throw ApiError.notFound('That hold was not found.');

  const [hold] = await tx
    .select()
    .from(bookingHolds)
    .where(and(eq(bookingHolds.id, holdId), holdsFor(scope)))
    .limit(1);
  if (!hold) throw ApiError.notFound('That hold was not found.');
  if (hold.releasedAt) return toHold(hold);

  const [released] = await tx
    .update(bookingHolds)
    .set({ releasedAt: new Date(), releasedByUserId: ctx.session!.userId, updatedAt: new Date() })
    .where(eq(bookingHolds.id, hold.id))
    .returning();
  if (!released) throw ApiError.internal('Could not resume bookings.');

  await recordAudit(tx, ctx, {
    action: 'schedule.hold_released',
    resourceType: 'booking_hold',
    resourceId: hold.id,
    organizationId: scope.organizationId,
  });

  return toHold(released);
}

export interface ScheduleConflict {
  id: string;
  starts_at: string;
  patient_name: string;
}

/**
 * The provider's weekly hours in the shape the Availability form edits.
 * Rules are stored as working windows, so a break is the gap between two
 * windows on a day; days without rules come back switched off.
 */
export async function getWeeklySchedule(tx: Tx, ctx: RequestContext): Promise<ScheduleValues> {
  const scope = await providerScope(tx, ctx);
  const rules = await tx
    .select({
      weekday: availabilityRules.weekday,
      start: availabilityRules.startTime,
      end: availabilityRules.endTime,
      slot: availabilityRules.slotIntervalMinutes,
    })
    .from(availabilityRules)
    .where(and(eq(availabilityRules.providerId, scope.providerId), eq(availabilityRules.isActive, true)))
    .orderBy(asc(availabilityRules.weekday), asc(availabilityRules.startTime));

  const byDay = new Map<number, Array<{ start: string; end: string }>>();
  for (const rule of rules) {
    byDay.set(rule.weekday, [...(byDay.get(rule.weekday) ?? []), { start: rule.start.slice(0, 5), end: rule.end.slice(0, 5) }]);
  }
  const breaks = new Map<string, { start: string; end: string }>();
  for (const windows of byDay.values()) {
    for (let index = 1; index < windows.length; index += 1) {
      const gap = { start: windows[index - 1]!.end, end: windows[index]!.start };
      if (gap.start < gap.end) breaks.set(`${gap.start}-${gap.end}`, gap);
    }
  }

  return {
    appointment_minutes: rules.length > 0 ? Math.min(...rules.map((rule) => rule.slot)) : 30,
    days: WEEKDAYS.map(({ weekday }) => {
      const windows = byDay.get(weekday);
      return windows
        ? { weekday, enabled: true, start: windows[0]!.start, end: windows[windows.length - 1]!.end }
        : { weekday, enabled: false, start: '09:00', end: '17:00' };
    }),
    breaks: [...breaks.values()].sort((a, b) => a.start.localeCompare(b.start)).slice(0, 3),
  };
}

/**
 * Replaces the provider's weekly hours wholesale. Nothing already booked is
 * touched: upcoming appointments that fall outside the new hours are kept and
 * returned, so the provider can decide what to do with each.
 */
export async function replaceWeeklySchedule(
  tx: Tx,
  ctx: RequestContext,
  input: ScheduleValues,
): Promise<{ schedule: ScheduleValues; conflicts: ScheduleConflict[] }> {
  const scope = await providerScope(tx, ctx);
  const minutes = Number(input.appointment_minutes);

  const windowsByDay = new Map<number, Array<{ start: string; end: string }>>();
  for (const day of input.days) {
    if (day.enabled) windowsByDay.set(day.weekday, workingWindows(day, input.breaks, minutes));
  }

  // Retired, not deleted: practice members may not delete rows (feature code
  // soft-deletes; see the tenant policies in rls.sql). A delete here matched
  // nothing and the new hours were added on top of the old. Every reader --
  // the booking engine included -- takes only active rules.
  await tx
    .update(availabilityRules)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(availabilityRules.providerId, scope.providerId), eq(availabilityRules.isActive, true)));
  const rows = [...windowsByDay.entries()].flatMap(([weekday, windows]) =>
    windows.map((window) => ({
      organizationId: scope.organizationId,
      facilityId: scope.facility.id,
      providerId: scope.providerId,
      weekday,
      startTime: `${window.start}:00`,
      endTime: `${window.end}:00`,
      slotIntervalMinutes: minutes,
      capacity: 1,
      isActive: true,
    })),
  );
  if (rows.length > 0) await tx.insert(availabilityRules).values(rows);

  const upcoming = await tx
    .select({
      id: appointments.id,
      startsAt: appointments.startsAt,
      endsAt: appointments.endsAt,
      firstName: patients.firstName,
      lastName: patients.lastName,
    })
    .from(appointments)
    .innerJoin(patients, eq(patients.id, appointments.patientId))
    .where(
      and(
        eq(appointments.providerId, scope.providerId),
        inArray(appointments.status, ['requested', 'confirmed']),
        gt(appointments.startsAt, new Date()),
        isNull(appointments.deletedAt),
      ),
    )
    .orderBy(asc(appointments.startsAt));

  const zone = scope.facility.timezone;
  const conflicts = upcoming
    .filter((appointment) => {
      const start = DateTime.fromJSDate(appointment.startsAt).setZone(zone);
      const end = DateTime.fromJSDate(appointment.endsAt).setZone(zone);
      const from = start.hour * 60 + start.minute;
      const to = end.hasSame(start, 'day') ? end.hour * 60 + end.minute : 24 * 60;
      const windows = windowsByDay.get(start.weekday % 7) ?? [];
      return !windows.some((window) => toMinutes(window.start) <= from && to <= toMinutes(window.end));
    })
    .map((appointment) => ({
      id: appointment.id,
      starts_at: appointment.startsAt.toISOString(),
      patient_name: `${appointment.firstName} ${appointment.lastName}`.trim(),
    }));

  await recordAudit(tx, ctx, {
    action: 'schedule.hours_updated',
    resourceType: 'provider',
    resourceId: scope.providerId,
    organizationId: scope.organizationId,
    metadata: { days: windowsByDay.size, breaks: input.breaks.length, outside_hours: conflicts.length },
  });

  return { schedule: await getWeeklySchedule(tx, ctx), conflicts };
}

/** Hours belong to a provider: staff without a provider record have none to edit. */
async function providerScope(tx: Tx, ctx: RequestContext) {
  const scope = await resolveScope(tx, ctx);
  if (!scope.providerId) throw ApiError.forbidden('Only providers have working hours to edit.');
  return { ...scope, providerId: scope.providerId };
}

// --- helpers -----------------------------------------------------------------

interface Scope {
  organizationId: string;
  facility: { id: string; timezone: string };
  providerId: string | null;
}

/**
 * The member's own provider record, at its primary location; otherwise the
 * session's facility, else the organization's first.
 */
async function resolveScope(tx: Tx, ctx: RequestContext): Promise<Scope> {
  if (!ctx.session) throw ApiError.unauthenticated();
  const organizationId = ctx.organizationId;
  if (!organizationId) throw ApiError.badRequest('No active organization.');

  const [provider] = await tx
    .select({ id: providers.id, facilityId: providerFacilities.facilityId })
    .from(providers)
    .leftJoin(providerFacilities, eq(providerFacilities.providerId, providers.id))
    .where(
      and(
        eq(providers.userId, ctx.session.userId),
        eq(providers.organizationId, organizationId),
        isNull(providers.deletedAt),
      ),
    )
    // The primary location first.
    .orderBy(desc(providerFacilities.isPrimary))
    .limit(1);

  const facilityId = provider?.facilityId ?? ctx.facilityId;
  const [facility] = await tx
    .select({ id: facilities.id, timezone: facilities.timezone })
    .from(facilities)
    .where(
      and(
        eq(facilities.organizationId, organizationId),
        isNull(facilities.deletedAt),
        facilityId ? eq(facilities.id, facilityId) : undefined,
      ),
    )
    .orderBy(asc(facilities.createdAt))
    .limit(1);
  if (!facility) throw ApiError.notFound('This practice has no location yet.');

  return { organizationId, facility, providerId: provider?.id ?? null };
}

/** Holds that affect this calendar: its own, and any over the whole location. */
function holdsFor(scope: Scope): SQL {
  return and(
    eq(bookingHolds.organizationId, scope.organizationId),
    eq(bookingHolds.facilityId, scope.facility.id),
    scope.providerId
      ? or(eq(bookingHolds.providerId, scope.providerId), isNull(bookingHolds.providerId))
      : isNull(bookingHolds.providerId),
  )!;
}

async function activeHolds(tx: Tx, scope: Scope): Promise<BookingHold[]> {
  const rows = await tx
    .select()
    .from(bookingHolds)
    .where(and(holdsFor(scope), isNull(bookingHolds.releasedAt), gt(bookingHolds.endsAt, new Date())))
    .orderBy(asc(bookingHolds.startsAt));
  return rows.map(toHold);
}

function toHold(row: typeof bookingHolds.$inferSelect): BookingHold {
  return {
    id: row.id,
    scope: row.scope,
    starts_at: row.startsAt.toISOString(),
    ends_at: row.endsAt.toISOString(),
    reason: row.reason,
    provider_id: row.providerId,
  };
}
