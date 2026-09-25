/**
 * The single screen an office lands on.
 *
 * Deliberately one aggregated query per panel rather than a chatty read per card:
 * this endpoint is hit on every page load by every staff member, all day.
 *
 * "Today" is the clinic's today, in its own zone -- a practice in Honolulu and
 * a reviewer in New York must agree on which appointments are today's.
 *
 * IA: 6. Unified Dashboard
 */
import { and, asc, desc, eq, gte, inArray, isNotNull, isNull, lt, notInArray } from 'drizzle-orm';
import { DateTime } from 'luxon';

import type { RequestContext } from '@/server/auth/context';
import { appointments } from '@/server/db/schema/appointments';
import { facilities } from '@/server/db/schema/organizations';
import { patients } from '@/server/db/schema/patients';
import { providers } from '@/server/db/schema/providers';
import { visitReasons } from '@/server/db/schema/scheduling';
import type { Tx } from '@/server/db/tenant';
import { ApiError } from '@/server/http/errors';

type Status = (typeof appointments.$inferSelect)['status'];

export interface DashboardSummary {
  /** "Dr. Johnson"; null when the member is staff rather than a provider. */
  greeting_name: string | null;
  facility: { name: string; timezone: string } | null;
  /** YYYY-MM-DD in the clinic's zone. */
  today: string;
  today_appointments: { total: number; upcoming: number };
  patients_today: number;
  pending_requests: number;
  /** Null: payments are not recorded yet, so there is no honest number to show. */
  revenue_this_month_cents: number | null;
  schedule: Array<{
    id: string;
    starts_at: string;
    patient_name: string;
    problem: string | null;
    status: Status;
  }>;
}

export interface ActionItem {
  kind: 'new_request' | 'reschedule' | 'no_show';
  appointment_id: string;
  patient_name: string;
  starts_at: string;
  timezone: string;
  /** When the request arrived, for "Just now" / "2h ago". */
  occurred_at: string;
}

/** Not visits: a cancelled or superseded booking is not on today's list. */
const NOT_VISITS: Status[] = ['cancelled', 'declined', 'rescheduled'];

export const dashboardService = {
  /** IA: 6. Dashboard Home > Today, Appointment Summary, Facility Summary */
  async getSummary(tx: Tx, ctx: RequestContext, _query: unknown): Promise<DashboardSummary> {
    const organizationId = requireOrg(ctx);
    const facility = await activeFacility(tx, ctx, organizationId);
    const zone = facility?.timezone ?? 'UTC';
    const now = DateTime.now().setZone(zone);
    const dayStart = now.startOf('day').toJSDate();
    const dayEnd = now.endOf('day').toJSDate();

    const [provider] = await tx
      .select({ lastName: providers.lastName, displayName: providers.displayName })
      .from(providers)
      .where(
        and(
          eq(providers.userId, ctx.session!.userId),
          eq(providers.organizationId, organizationId),
          isNull(providers.deletedAt),
        ),
      )
      .limit(1);

    const today = await tx
      .select({
        id: appointments.id,
        startsAt: appointments.startsAt,
        endsAt: appointments.endsAt,
        status: appointments.status,
        patientId: appointments.patientId,
        firstName: patients.firstName,
        lastName: patients.lastName,
        reason: visitReasons.name,
      })
      .from(appointments)
      .innerJoin(patients, eq(patients.id, appointments.patientId))
      .leftJoin(visitReasons, eq(visitReasons.id, appointments.visitReasonId))
      .where(
        and(
          eq(appointments.organizationId, organizationId),
          isNull(appointments.deletedAt),
          notInArray(appointments.status, NOT_VISITS),
          gte(appointments.startsAt, dayStart),
          lt(appointments.startsAt, dayEnd),
        ),
      )
      .orderBy(asc(appointments.startsAt));

    const pending = await tx
      .select({ id: appointments.id })
      .from(appointments)
      .where(
        and(
          eq(appointments.organizationId, organizationId),
          isNull(appointments.deletedAt),
          eq(appointments.status, 'requested'),
          gte(appointments.startsAt, new Date()),
        ),
      );

    const nowMs = Date.now();
    return {
      greeting_name: provider ? `Dr. ${provider.lastName}` : null,
      facility: facility ? { name: facility.name, timezone: zone } : null,
      today: now.toISODate()!,
      today_appointments: {
        total: today.length,
        upcoming: today.filter((row) => row.startsAt.getTime() > nowMs).length,
      },
      patients_today: new Set(today.map((row) => row.patientId)).size,
      pending_requests: pending.length,
      revenue_this_month_cents: null,
      schedule: today.map((row) => ({
        id: row.id,
        starts_at: row.startsAt.toISOString(),
        patient_name: `${row.firstName} ${row.lastName}`.trim(),
        problem: row.reason,
        status: row.status,
      })),
    };
  },

  /**
   * IA: 6. Action Required > New Requests, Reschedules, No-Shows.
   *
   * A request waiting on the practice is a new request, or a reschedule when
   * the patient moved an earlier booking. A visit whose time has passed today
   * and was never closed is a possible no-show.
   */
  async getActionItems(tx: Tx, ctx: RequestContext): Promise<ActionItem[]> {
    const organizationId = requireOrg(ctx);
    const facility = await activeFacility(tx, ctx, organizationId);
    const zone = facility?.timezone ?? 'UTC';
    const dayStart = DateTime.now().setZone(zone).startOf('day').toJSDate();
    const now = new Date();

    const columns = {
      id: appointments.id,
      startsAt: appointments.startsAt,
      requestedAt: appointments.requestedAt,
      rescheduledFromId: appointments.rescheduledFromId,
      firstName: patients.firstName,
      lastName: patients.lastName,
      timezone: facilities.timezone,
    };

    const requests = await tx
      .select(columns)
      .from(appointments)
      .innerJoin(patients, eq(patients.id, appointments.patientId))
      .innerJoin(facilities, eq(facilities.id, appointments.facilityId))
      .where(
        and(
          eq(appointments.organizationId, organizationId),
          isNull(appointments.deletedAt),
          eq(appointments.status, 'requested'),
          gte(appointments.startsAt, now),
        ),
      )
      .orderBy(desc(appointments.requestedAt))
      .limit(20);

    const missed = await tx
      .select(columns)
      .from(appointments)
      .innerJoin(patients, eq(patients.id, appointments.patientId))
      .innerJoin(facilities, eq(facilities.id, appointments.facilityId))
      .where(
        and(
          eq(appointments.organizationId, organizationId),
          isNull(appointments.deletedAt),
          inArray(appointments.status, ['confirmed', 'requested']),
          gte(appointments.startsAt, dayStart),
          lt(appointments.endsAt, now),
        ),
      )
      .orderBy(desc(appointments.startsAt))
      .limit(10);

    const item = (kind: ActionItem['kind'], row: (typeof requests)[number]): ActionItem => ({
      kind,
      appointment_id: row.id,
      patient_name: `${row.firstName} ${row.lastName}`.trim(),
      starts_at: row.startsAt.toISOString(),
      timezone: row.timezone,
      occurred_at: (kind === 'no_show' ? row.startsAt : row.requestedAt).toISOString(),
    });

    return [
      ...requests.map((row) => item(row.rescheduledFromId ? 'reschedule' : 'new_request', row)),
      ...missed.map((row) => item('no_show', row)),
    ];
  },
};

function requireOrg(ctx: RequestContext): string {
  if (!ctx.session) throw ApiError.unauthenticated();
  if (!ctx.organizationId) throw ApiError.badRequest('No active organization.');
  return ctx.organizationId;
}

/** The session's facility, else the organization's first one. */
async function activeFacility(tx: Tx, ctx: RequestContext, organizationId: string) {
  const [facility] = await tx
    .select({ name: facilities.name, timezone: facilities.timezone })
    .from(facilities)
    .where(
      and(
        eq(facilities.organizationId, organizationId),
        isNull(facilities.deletedAt),
        ctx.facilityId ? eq(facilities.id, ctx.facilityId) : isNotNull(facilities.id),
      ),
    )
    .orderBy(asc(facilities.createdAt))
    .limit(1);
  return facility ?? null;
}
