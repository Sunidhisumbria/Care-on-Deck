/**
 * Open slots, derived from the weekly schedule a provider set during onboarding.
 *
 * Rules are stored as local clock times ("09:00") against the clinic's own
 * timezone, so every conversion goes through luxon rather than the server's
 * zone: a server in UTC and a clinic in Oregon disagree by most of a working
 * day, and the difference only shows up as slots offered at the wrong hour.
 *
 * Booked times are read with the actor raised to system. Appointments are
 * invisible to the public and must stay that way -- nothing here returns one,
 * only the times that are no longer free. That is the whole reason this lives
 * in the server and not in a query the browser could make itself.
 *
 * IA: 2. Booking > Select Date / Select Time
 */
import { and, eq, gt, gte, inArray, isNull, lt, lte, ne, or } from 'drizzle-orm';
import { DateTime } from 'luxon';

import {
  appointments,
  availabilityOverrides,
  availabilityRules,
  bookingHolds,
  facilities,
  providerFacilities,
} from '@/server/db/schema';
import { withElevated, type Tx } from '@/server/db/tenant';

/**
 * Statuses that still hold their slot. `rescheduled` means superseded by a
 * newer appointment, so it releases the time -- see enums.ts.
 */
const BUSY_STATUSES = ['requested', 'confirmed', 'checked_in', 'completed'] as const;

/** Nothing is offered closer than this, so a booking cannot land minutes from now. */
const LEAD_MINUTES = 60;

/** How far ahead "next available" looks before giving up. */
export const NEXT_AVAILABLE_DAYS = 30;

export interface Slot {
  /** Start of the appointment, UTC ISO. The browser renders it in its own zone. */
  starts_at: string;
  ends_at: string;
  duration_minutes: number;
}

export interface ProviderSlots {
  providerId: string;
  facilityId: string;
  timezone: string;
  slots: Slot[];
}

interface Interval {
  start: number;
  end: number;
}

/**
 * Free slots for each provider between `from` and `to`.
 *
 * One pass over the database for every provider asked about, because the
 * search results page needs this for a whole page of providers at once and
 * a query per card is how a list becomes slow.
 */
export async function openSlots(
  tx: Tx,
  options: {
    providerIds: string[];
    from: Date;
    to: Date;
    /** Stops early once this many are found per provider. */
    maxPerProvider?: number;
    /**
     * Whole days, counted from today IN THE CLINIC'S ZONE: {0,0} is today,
     * {1,1} tomorrow, {0,6} the week. Days rather than instants because
     * "tomorrow" starts at a different moment in Gresham than it does on a
     * server in Mumbai, and the patient means the clinic's.
     */
    days?: { start: number; end: number };
    /** An explicit span of calendar dates, read in the clinic's zone. */
    dates?: { from: string; to: string };
    /**
     * Treat this appointment's time as free. For rescheduling: the booking being
     * moved must not stop its own patient picking an overlapping slot.
     */
    ignoreAppointmentId?: string;
  },
): Promise<Map<string, ProviderSlots>> {
  const { providerIds, from, to, maxPerProvider, days, dates, ignoreAppointmentId } = options;
  const found = new Map<string, ProviderSlots>();
  if (providerIds.length === 0) return found;

  const rules = await tx
    .select({
      providerId: availabilityRules.providerId,
      facilityId: availabilityRules.facilityId,
      weekday: availabilityRules.weekday,
      startTime: availabilityRules.startTime,
      endTime: availabilityRules.endTime,
      interval: availabilityRules.slotIntervalMinutes,
      effectiveFrom: availabilityRules.effectiveFrom,
      effectiveTo: availabilityRules.effectiveTo,
      timezone: facilities.timezone,
    })
    .from(availabilityRules)
    .innerJoin(facilities, eq(facilities.id, availabilityRules.facilityId))
    .where(
      and(
        inArray(availabilityRules.providerId, providerIds),
        eq(availabilityRules.isActive, true),
        eq(facilities.isPubliclyListed, true),
      ),
    );

  if (rules.length === 0) return found;

  const fromIso = DateTime.fromJSDate(from).toISODate()!;
  const toIso = DateTime.fromJSDate(to).toISODate()!;

  const overrides = await tx
    .select({
      providerId: availabilityOverrides.providerId,
      facilityId: availabilityOverrides.facilityId,
      onDate: availabilityOverrides.onDate,
      isAvailable: availabilityOverrides.isAvailable,
      startTime: availabilityOverrides.startTime,
      endTime: availabilityOverrides.endTime,
    })
    .from(availabilityOverrides)
    .where(
      and(
        gte(availabilityOverrides.onDate, fromIso),
        lte(availabilityOverrides.onDate, toIso),
        or(
          inArray(availabilityOverrides.providerId, providerIds),
          isNull(availabilityOverrides.providerId),
        ),
      ),
    );

  const busy = await busyIntervals(tx, providerIds, from, to, ignoreAppointmentId);

  for (const providerId of providerIds) {
    const own = rules.filter((rule) => rule.providerId === providerId);
    if (own.length === 0) continue;

    const zone = own[0]!.timezone;
    const slots = buildSlots({
      rules: own,
      overrides: overrides.filter(
        (o) => o.providerId === providerId || o.providerId === null,
      ),
      busy: busy.get(providerId) ?? [],
      zone,
      from,
      to,
      max: maxPerProvider,
      days,
      dates,
    });

    found.set(providerId, {
      providerId,
      facilityId: own[0]!.facilityId,
      timezone: zone,
      slots,
    });
  }

  return found;
}

/** The first open slot for each provider, or null when there is none in the next month. */
export async function nextAvailable(
  tx: Tx,
  providerIds: string[],
  now = new Date(),
): Promise<Map<string, string | null>> {
  const horizon = DateTime.fromJSDate(now).plus({ days: NEXT_AVAILABLE_DAYS }).toJSDate();
  const open = await openSlots(tx, { providerIds, from: now, to: horizon, maxPerProvider: 1 });

  return new Map(providerIds.map((id) => [id, open.get(id)?.slots[0]?.starts_at ?? null]));
}

/**
 * Times that are already taken: booked appointments, plus any booking hold the
 * office placed over the provider or the whole location.
 *
 * Raised to system deliberately. The public cannot read `appointments`, and
 * this returns only start and end instants -- no patient, no reason, no id.
 */
async function busyIntervals(
  tx: Tx,
  providerIds: string[],
  from: Date,
  to: Date,
  ignoreAppointmentId?: string,
): Promise<Map<string, Interval[]>> {
  const byProvider = new Map<string, Interval[]>();
  const add = (providerId: string, interval: Interval) => {
    const list = byProvider.get(providerId);
    if (list) list.push(interval);
    else byProvider.set(providerId, [interval]);
  };

  await withElevated(tx, async () => {
    const booked = await tx
      .select({
        providerId: appointments.providerId,
        startsAt: appointments.startsAt,
        endsAt: appointments.endsAt,
      })
      .from(appointments)
      .where(
        and(
          inArray(appointments.providerId, providerIds),
          inArray(appointments.status, [...BUSY_STATUSES]),
          lt(appointments.startsAt, to),
          gt(appointments.endsAt, from),
          ignoreAppointmentId ? ne(appointments.id, ignoreAppointmentId) : undefined,
        ),
      );

    for (const row of booked) {
      if (!row.providerId) continue;
      add(row.providerId, { start: row.startsAt.getTime(), end: row.endsAt.getTime() });
    }

    const holds = await tx
      .select({
        providerId: bookingHolds.providerId,
        facilityId: bookingHolds.facilityId,
        startsAt: bookingHolds.startsAt,
        endsAt: bookingHolds.endsAt,
      })
      .from(bookingHolds)
      .where(
        and(
          isNull(bookingHolds.releasedAt),
          lt(bookingHolds.startsAt, to),
          gt(bookingHolds.endsAt, from),
        ),
      );

    if (holds.length === 0) return;

    // A hold with no provider closes the whole location, so it applies to
    // every provider who works there.
    const rosters = await tx
      .select({
        providerId: providerFacilities.providerId,
        facilityId: providerFacilities.facilityId,
      })
      .from(providerFacilities)
      .where(inArray(providerFacilities.providerId, providerIds));

    for (const hold of holds) {
      const interval = { start: hold.startsAt.getTime(), end: hold.endsAt.getTime() };
      if (hold.providerId) {
        if (providerIds.includes(hold.providerId)) add(hold.providerId, interval);
        continue;
      }
      for (const row of rosters) {
        if (row.facilityId === hold.facilityId) add(row.providerId, interval);
      }
    }
  });

  return byProvider;
}

type RuleRow = {
  weekday: number;
  startTime: string;
  endTime: string;
  interval: number;
  effectiveFrom: string | null;
  effectiveTo: string | null;
};

type OverrideRow = {
  onDate: string;
  isAvailable: boolean;
  startTime: string | null;
  endTime: string | null;
};

/** Walks the days in the clinic's zone and cuts each open window into slots. */
function buildSlots(input: {
  rules: RuleRow[];
  overrides: OverrideRow[];
  busy: Interval[];
  zone: string;
  from: Date;
  to: Date;
  max?: number;
  days?: { start: number; end: number };
  dates?: { from: string; to: string };
}): Slot[] {
  const { rules, overrides, busy, zone, from, to, max, days, dates } = input;
  const earliest = Math.max(from.getTime(), Date.now() + LEAD_MINUTES * 60_000);
  const latest = to.getTime();
  const slots: Slot[] = [];

  const zonedToday = DateTime.now().setZone(zone).startOf('day');
  let day = dates
    ? DateTime.fromISO(dates.from, { zone }).startOf('day')
    : days
      ? zonedToday.plus({ days: days.start })
      : DateTime.fromJSDate(from, { zone }).startOf('day');
  const lastDay = dates
    ? DateTime.fromISO(dates.to, { zone }).startOf('day')
    : days
      ? zonedToday.plus({ days: days.end })
      : DateTime.fromJSDate(to, { zone }).startOf('day');

  while (day <= lastDay) {
    const date = day.toISODate()!;
    // luxon counts Monday as 1 and Sunday as 7; the column stores Sunday as 0.
    const weekday = day.weekday % 7;
    const today = overrides.filter((o) => o.onDate === date);

    if (!today.some((o) => !o.isAvailable && !o.startTime)) {
      const closed = today
        .filter((o) => !o.isAvailable && o.startTime && o.endTime)
        .map((o) => ({
          start: at(date, o.startTime!, zone),
          end: at(date, o.endTime!, zone),
        }));

      const windows = rules
        .filter((rule) => rule.weekday === weekday && inEffect(rule, date))
        .map((rule) => ({ start: rule.startTime, end: rule.endTime, interval: rule.interval }));

      for (const extra of today.filter((o) => o.isAvailable && o.startTime && o.endTime)) {
        windows.push({
          start: extra.startTime!,
          end: extra.endTime!,
          interval: rules[0]?.interval ?? 30,
        });
      }

      for (const window of windows) {
        const opens = at(date, window.start, zone);
        const closes = at(date, window.end, zone);
        const step = window.interval * 60_000;

        for (let start = opens; start + step <= closes; start += step) {
          const end = start + step;
          if (start < earliest || start >= latest) continue;
          if (overlaps(start, end, busy) || overlaps(start, end, closed)) continue;

          slots.push({
            starts_at: new Date(start).toISOString(),
            ends_at: new Date(end).toISOString(),
            duration_minutes: window.interval,
          });
        }
      }
    }

    if (max && slots.length >= max) break;
    day = day.plus({ days: 1 });
  }

  slots.sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  return max ? slots.slice(0, max) : slots;
}

/** "2026-09-17" + "09:00:00" in the clinic's zone, as an epoch millisecond. */
function at(date: string, time: string, zone: string): number {
  return DateTime.fromISO(`${date}T${time}`, { zone }).toMillis();
}

function inEffect(rule: RuleRow, date: string): boolean {
  if (rule.effectiveFrom && date < rule.effectiveFrom) return false;
  if (rule.effectiveTo && date > rule.effectiveTo) return false;
  return true;
}

function overlaps(start: number, end: number, intervals: Interval[]): boolean {
  return intervals.some((interval) => start < interval.end && end > interval.start);
}
