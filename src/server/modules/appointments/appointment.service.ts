/**
 * The appointment lifecycle, as the practice runs it.
 *
 * Every status change does three things in one transaction: update the row,
 * append an `appointment_events` row, and queue the patient notification. They
 * belong together -- an appointment marked cancelled with no notification sent is
 * worse than one that failed outright.
 *
 * Everything runs as the signed-in member inside their organization, so the
 * tenant policies keep each practice to its own appointments and the patients
 * booked with it. A wrong id and another practice's appointment both read as
 * not found.
 *
 * IA: 6. Unified Dashboard; 7. Scheduling
 */
import { and, asc, desc, eq, gt, ilike, inArray, isNull, lte, or, sql, type SQL } from 'drizzle-orm';

import type { RequestContext } from '@/server/auth/context';
import { appointmentEvents, appointments } from '@/server/db/schema/appointments';
import { notifications } from '@/server/db/schema/notifications';
import { facilities } from '@/server/db/schema/organizations';
import { patientAddresses, patients } from '@/server/db/schema/patients';
import { visitReasons } from '@/server/db/schema/scheduling';
import type { Tx } from '@/server/db/tenant';
import { ApiError } from '@/server/http/errors';
import { notImplemented } from '@/server/http/response';
import { recordAudit } from '@/server/observability/audit';
import { newBookingReference } from '@/server/modules/booking/reference';
import { openSlots } from '@/server/modules/scheduling/availability';

import type {
  PracticeAppointmentListQuery,
  PracticeCancelInput,
  PracticeRescheduleInput,
  PracticeTab,
} from './appointment.schemas';

type Status = (typeof appointments.$inferSelect)['status'];

/** A row on the Appointments table. */
export interface PracticeAppointment {
  id: string;
  reference: string;
  status: Status;
  starts_at: string;
  ends_at: string;
  timezone: string;
  patient: { name: string };
  booking_for: 'self' | 'dependent';
  problem: string | null;
  insurance: string | null;
}

/** The practice's Appointment Details. */
export interface PracticeAppointmentDetail extends PracticeAppointment {
  patient: {
    name: string;
    email: string | null;
    phone: string | null;
    gender: string | null;
    age: number | null;
    address: string | null;
  };
  patient_note: string | null;
  provider_id: string | null;
  /** A request waiting on the practice. */
  can_confirm: boolean;
  /** Still ahead and not closed: Reschedule and Cancel are offered. */
  can_change: boolean;
  /** Its time has passed and it was never closed: No-show is offered. */
  can_mark_no_show: boolean;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const OPEN: Status[] = ['requested', 'confirmed'];

export const appointmentService = {
  /** IA: 6. Appointments > Upcoming, Pending, Completed, Canceled, No-Show */
  async list(tx: Tx, ctx: RequestContext, query: PracticeAppointmentListQuery): Promise<PracticeAppointment[]> {
    const organizationId = requireOrg(ctx);
    const now = new Date();

    const conditions: SQL[] = [
      eq(appointments.organizationId, organizationId),
      isNull(appointments.deletedAt),
      tabCondition(query.tab, now),
    ];
    if (query.q) {
      const term = `%${query.q.replace(/[%_]/g, '\\$&')}%`;
      conditions.push(
        or(
          ilike(sql`${patients.firstName} || ' ' || ${patients.lastName}`, term),
          ilike(appointments.reference, term),
        )!,
      );
    }

    const past = query.tab === 'completed' || query.tab === 'canceled' || query.tab === 'no_show';
    const rows = await baseSelect(tx)
      .where(and(...conditions))
      .orderBy(past ? desc(appointments.startsAt) : asc(appointments.startsAt))
      .limit(200);

    return rows.map(toRow);
  },

  async get(tx: Tx, ctx: RequestContext, id: string): Promise<PracticeAppointmentDetail> {
    const organizationId = requireOrg(ctx);
    const row = await findOwn(tx, organizationId, id);
    const now = Date.now();

    const address =
      row.snapshot?.address ??
      (await defaultAddress(tx, row.patientId));

    return {
      ...toRow(row),
      patient: {
        name: fullName(row),
        email: row.email,
        phone: row.phone,
        gender: row.gender,
        age: ageOn(row.dateOfBirth),
        address,
      },
      patient_note: row.patientNote,
      provider_id: row.providerId,
      can_confirm: row.status === 'requested' && row.startsAt.getTime() > now,
      can_change: OPEN.includes(row.status) && row.startsAt.getTime() > now,
      can_mark_no_show: OPEN.includes(row.status) && row.startsAt.getTime() <= now,
    };
  },

  async createForPatient(tx: Tx, ctx: RequestContext, body: unknown): Promise<unknown> {
    return notImplemented('appointmentService.createForPatient');
  },

  async update(tx: Tx, ctx: RequestContext, id: string, body: unknown): Promise<unknown> {
    return notImplemented('appointmentService.update');
  },

  /** IA: 6. Action Required > New Request > Confirm */
  async confirm(tx: Tx, ctx: RequestContext, id: string): Promise<PracticeAppointmentDetail> {
    const organizationId = requireOrg(ctx);
    const row = await findOwn(tx, organizationId, id);
    if (row.status !== 'requested') throw ApiError.conflict(`This appointment is already ${label(row.status)}.`);
    if (row.startsAt.getTime() <= Date.now()) throw ApiError.conflict('This request is for a time that has passed.');

    const now = new Date();
    await transition(tx, ctx, row, 'confirmed', { confirmedAt: now }, 'confirmed');
    await notifyPatient(tx, row, {
      kind: 'confirmed',
      title: 'Your appointment is confirmed',
      body: `${row.facilityName} confirmed your visit on ${when(row.startsAt, row.timezone)}.`,
    });

    return appointmentService.get(tx, ctx, row.id);
  },

  /** IA: 6. Appointment Details > Cancel. Frees the slot and tells the patient why. */
  async cancel(tx: Tx, ctx: RequestContext, id: string, body: PracticeCancelInput): Promise<PracticeAppointmentDetail> {
    const organizationId = requireOrg(ctx);
    const row = await findOwn(tx, organizationId, id);
    assertChangeable(row);

    const now = new Date();
    await transition(
      tx,
      ctx,
      row,
      'cancelled',
      { cancelledAt: now, cancelledByUserId: ctx.session!.userId, cancellationReason: body.reason },
      'cancelled',
      { by: 'practice', reason: body.reason, had_message: Boolean(body.message) },
    );
    await notifyPatient(tx, row, {
      kind: 'cancelled',
      title: 'Your appointment was cancelled',
      body: [
        `${row.facilityName} cancelled your visit on ${when(row.startsAt, row.timezone)} (${body.reason.toLowerCase()}).`,
        body.message ?? null,
      ]
        .filter(Boolean)
        .join('\n\n'),
    });

    return appointmentService.get(tx, ctx, row.id);
  },

  /**
   * IA: 7. Reschedule. The practice picks the new time, so the new appointment
   * is confirmed straight away; the old one is superseded, as when a patient
   * moves a visit. The slot is re-derived here, never trusted from the browser.
   */
  async reschedule(
    tx: Tx,
    ctx: RequestContext,
    id: string,
    body: PracticeRescheduleInput,
  ): Promise<PracticeAppointmentDetail> {
    const organizationId = requireOrg(ctx);
    const row = await findOwn(tx, organizationId, id);
    assertChangeable(row);

    if (!row.providerId) throw ApiError.conflict('This appointment has no provider, so it cannot be moved.');
    const startsAt = new Date(body.starts_at);
    if (startsAt.getTime() === row.startsAt.getTime()) {
      throw ApiError.badRequest('That is the time already booked. Pick a different one.');
    }

    const day = body.starts_at.slice(0, 10);
    const open = await openSlots(tx, {
      providerIds: [row.providerId],
      from: new Date(startsAt.getTime() - 86_400_000),
      to: new Date(startsAt.getTime() + 86_400_000),
      dates: { from: day, to: addDay(day) },
      ignoreAppointmentId: row.id,
    });
    const slot = open.get(row.providerId)?.slots.find((candidate) => candidate.starts_at === startsAt.toISOString());
    if (!slot) throw ApiError.slotUnavailable('That time is no longer available. Please pick another.');

    const now = new Date();
    // Supersede first: the exclusion constraint refuses the new booking while
    // the old one still holds an overlapping slot.
    await transition(tx, ctx, row, 'rescheduled', {}, 'rescheduled', { by: 'practice' });

    const [original] = await tx.select().from(appointments).where(eq(appointments.id, row.id)).limit(1);
    if (!original) throw ApiError.internal('Could not move that appointment.');

    const [created] = await tx
      .insert(appointments)
      .values({
        reference: newBookingReference(),
        organizationId: original.organizationId,
        facilityId: original.facilityId,
        providerId: original.providerId,
        patientId: original.patientId,
        patientUserId: original.patientUserId,
        visitReasonId: original.visitReasonId,
        status: 'confirmed',
        confirmedAt: now,
        source: original.source,
        visitType: original.visitType,
        startsAt: new Date(slot.starts_at),
        endsAt: new Date(slot.ends_at),
        durationMinutes: slot.duration_minutes,
        patientNote: original.patientNote,
        staffNote: original.staffNote,
        patientInsuranceId: original.patientInsuranceId,
        insuranceCarrierName: original.insuranceCarrierName,
        patientSnapshot: original.patientSnapshot,
        rescheduledFromId: original.id,
        directPageId: original.directPageId,
        campaignId: original.campaignId,
        attribution: original.attribution,
        createdByUserId: ctx.session!.userId,
      })
      .returning({ id: appointments.id });
    if (!created) throw ApiError.internal('Could not move that appointment.');

    await tx.insert(appointmentEvents).values({
      organizationId,
      appointmentId: created.id,
      kind: 'created',
      toStatus: 'confirmed',
      actorUserId: ctx.session!.userId,
      payload: { rescheduled_from: original.id },
    });

    if (body.notify) {
      await notifyPatient(tx, { ...row, id: created.id }, {
        kind: 'rescheduled',
        title: 'Your appointment was moved',
        body: `${row.facilityName} moved your visit from ${when(row.startsAt, row.timezone)} to ${when(new Date(slot.starts_at), row.timezone)}.`,
      });
    }

    await recordAudit(tx, ctx, {
      action: 'appointment.rescheduled',
      resourceType: 'appointment',
      resourceId: created.id,
      organizationId,
      metadata: { by: 'practice', from_appointment_id: original.id, notified: body.notify },
    });

    return appointmentService.get(tx, ctx, created.id);
  },

  /** IA: 6. Action Required > No-Show. Only once the visit's time has come. */
  async markNoShow(tx: Tx, ctx: RequestContext, id: string): Promise<PracticeAppointmentDetail> {
    const organizationId = requireOrg(ctx);
    const row = await findOwn(tx, organizationId, id);
    if (!OPEN.includes(row.status)) throw ApiError.conflict(`This appointment is already ${label(row.status)}.`);
    if (row.startsAt.getTime() > Date.now()) throw ApiError.conflict('A visit can be marked a no-show once its time has come.');

    const now = new Date();
    await transition(tx, ctx, row, 'no_show', { isNoShow: true, noShowMarkedAt: now }, 'no_show');
    return appointmentService.get(tx, ctx, row.id);
  },
};

// --- helpers -----------------------------------------------------------------

function requireOrg(ctx: RequestContext): string {
  if (!ctx.session) throw ApiError.unauthenticated();
  if (!ctx.organizationId) throw ApiError.badRequest('No active organization.');
  return ctx.organizationId;
}

function tabCondition(tab: PracticeTab, now: Date): SQL {
  switch (tab) {
    case 'upcoming':
      return and(eq(appointments.status, 'confirmed'), gt(appointments.endsAt, now))!;
    case 'pending':
      return and(eq(appointments.status, 'requested'), gt(appointments.endsAt, now))!;
    case 'completed':
      return or(
        eq(appointments.status, 'completed'),
        and(inArray(appointments.status, ['confirmed', 'checked_in']), lte(appointments.endsAt, now)),
      )!;
    case 'canceled':
      return inArray(appointments.status, ['cancelled', 'declined']);
    case 'no_show':
      return eq(appointments.status, 'no_show');
  }
}

function baseSelect(tx: Tx) {
  return tx
    .select({
      id: appointments.id,
      reference: appointments.reference,
      status: appointments.status,
      startsAt: appointments.startsAt,
      endsAt: appointments.endsAt,
      organizationId: appointments.organizationId,
      providerId: appointments.providerId,
      patientId: appointments.patientId,
      patientUserId: appointments.patientUserId,
      patientNote: appointments.patientNote,
      snapshot: appointments.patientSnapshot,
      insuranceCarrierName: appointments.insuranceCarrierName,
      firstName: patients.firstName,
      lastName: patients.lastName,
      patientOwnUserId: patients.userId,
      email: patients.email,
      phone: patients.phone,
      gender: patients.gender,
      dateOfBirth: patients.dateOfBirth,
      reason: visitReasons.name,
      facilityName: facilities.name,
      timezone: facilities.timezone,
    })
    .from(appointments)
    .innerJoin(patients, eq(patients.id, appointments.patientId))
    .innerJoin(facilities, eq(facilities.id, appointments.facilityId))
    .leftJoin(visitReasons, eq(visitReasons.id, appointments.visitReasonId));
}

type Row = Awaited<ReturnType<ReturnType<typeof baseSelect>['where']>>[number];

async function findOwn(tx: Tx, organizationId: string, id: string): Promise<Row> {
  if (!UUID.test(id)) throw ApiError.notFound('That appointment was not found.');
  const [row] = await baseSelect(tx)
    .where(and(eq(appointments.id, id), eq(appointments.organizationId, organizationId), isNull(appointments.deletedAt)))
    .limit(1);
  if (!row) throw ApiError.notFound('That appointment was not found.');
  return row;
}

function toRow(row: Row): PracticeAppointment {
  return {
    id: row.id,
    reference: row.reference,
    status: row.status,
    starts_at: row.startsAt.toISOString(),
    ends_at: row.endsAt.toISOString(),
    timezone: row.timezone,
    patient: { name: fullName(row) },
    // Booked by someone other than the patient themself: a guardian for a dependent.
    booking_for: row.patientUserId && row.patientOwnUserId && row.patientUserId !== row.patientOwnUserId ? 'dependent' : 'self',
    problem: row.reason,
    insurance: row.insuranceCarrierName,
  };
}

function assertChangeable(row: Row) {
  if (!OPEN.includes(row.status)) throw ApiError.conflict(`This appointment is ${label(row.status)} and can no longer be changed.`);
  if (row.startsAt.getTime() <= Date.now()) throw ApiError.conflict('This appointment has already started.');
}

/** Status change + timeline event + audit, the three that must never be split. */
async function transition(
  tx: Tx,
  ctx: RequestContext,
  row: Row,
  to: Status,
  columns: Partial<typeof appointments.$inferInsert>,
  kind: string,
  metadata: Record<string, unknown> = {},
) {
  const updated = await tx
    .update(appointments)
    .set({ ...columns, status: to, updatedAt: new Date() })
    .where(and(eq(appointments.id, row.id), eq(appointments.status, row.status)))
    .returning({ id: appointments.id });
  // Nothing matched: someone else changed it first. Better an error than a silent no-op.
  if (updated.length === 0) throw ApiError.conflict('This appointment was just changed. Refresh and try again.');

  await tx.insert(appointmentEvents).values({
    organizationId: row.organizationId,
    appointmentId: row.id,
    kind,
    fromStatus: row.status,
    toStatus: to,
    actorUserId: ctx.session!.userId,
    payload: metadata,
  });

  await recordAudit(tx, ctx, {
    action: `appointment.${kind}`,
    resourceType: 'appointment',
    resourceId: row.id,
    organizationId: row.organizationId,
    metadata: { by: 'practice', ...metadata },
  });
}

/** An in-app notification for the patient who booked, linking to the visit. */
async function notifyPatient(
  tx: Tx,
  row: Pick<Row, 'id' | 'organizationId' | 'patientUserId'>,
  message: { title: string; body: string; kind?: string },
) {
  if (!row.patientUserId) return;
  await tx.insert(notifications).values({
    organizationId: row.organizationId,
    recipientUserId: row.patientUserId,
    category: 'appointment_update',
    title: message.title,
    body: message.body,
    actionUrl: `/appointments/${row.id}`,
    actionLabel: 'View appointment',
    subjectType: 'appointment',
    subjectId: row.id,
    data: { kind: message.kind ?? 'update' },
  });
}

async function defaultAddress(tx: Tx, patientId: string): Promise<string | null> {
  const [address] = await tx
    .select()
    .from(patientAddresses)
    .where(and(eq(patientAddresses.patientId, patientId), isNull(patientAddresses.deletedAt)))
    .orderBy(desc(patientAddresses.isDefault), desc(patientAddresses.createdAt))
    .limit(1);
  if (!address) return null;
  return [address.addressLine1, address.addressLine2, address.city, `${address.state} ${address.postalCode}`]
    .filter(Boolean)
    .join(', ');
}

function fullName(row: Pick<Row, 'firstName' | 'lastName'>): string {
  return `${row.firstName} ${row.lastName}`.trim();
}

function ageOn(dateOfBirth: string | null): number | null {
  if (!dateOfBirth) return null;
  const born = new Date(`${dateOfBirth}T00:00:00Z`);
  const today = new Date();
  let age = today.getUTCFullYear() - born.getUTCFullYear();
  const beforeBirthday =
    today.getUTCMonth() < born.getUTCMonth() ||
    (today.getUTCMonth() === born.getUTCMonth() && today.getUTCDate() < born.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age >= 0 ? age : null;
}

/** "Aug 26, 2026 at 3:30 PM", in the clinic's zone. */
function when(instant: Date, timezone: string): string {
  const date = instant.toLocaleDateString('en-US', { timeZone: timezone, month: 'short', day: 'numeric', year: 'numeric' });
  const time = instant.toLocaleTimeString('en-US', { timeZone: timezone, hour: 'numeric', minute: '2-digit' });
  return `${date} at ${time}`;
}

function label(status: Status): string {
  return status.replace('_', ' ');
}

/** "2026-09-17" -> "2026-09-18". */
function addDay(date: string): string {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString().slice(0, 10);
}
