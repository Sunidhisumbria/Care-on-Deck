/**
 * A patient cancelling or moving their own appointment.
 *
 * Both run as the patient, under the `appointments_patient_update` policy,
 * which lets a patient touch only their own rows and only into `cancelled` or
 * `rescheduled`. This file decides which columns change with the status -- the
 * policy cannot, so nothing else may run these updates.
 *
 * A reschedule is not an edit. The old appointment is marked `rescheduled`
 * (superseded) and a new one is booked that points back at it, so the practice
 * sees a request for a new time rather than a confirmed visit silently moving.
 *
 * IA: 3. Appointments > Cancel, Reschedule
 */
import { and, eq, isNull } from 'drizzle-orm';

import type { RequestContext } from '@/server/auth/context';
import { appointments } from '@/server/db/schema/appointments';
import { facilities } from '@/server/db/schema/organizations';
import { patients } from '@/server/db/schema/patients';
import type { Tx } from '@/server/db/tenant';
import { ApiError } from '@/server/http/errors';
import { recordAudit } from '@/server/observability/audit';
import { newBookingReference } from '@/server/modules/booking/reference';
import { clinicWhen, notifyProvider } from '@/server/modules/notifications/notify';
import { openSlots } from '@/server/modules/scheduling/availability';

import type {
  CancelOwnAppointmentInput,
  RescheduleOwnAppointmentInput,
} from './own-appointments.schemas';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Only a visit that has not happened, and that the practice has not closed, can change. */
const CHANGEABLE = ['requested', 'confirmed'];

export interface CancelledAppointment {
  id: string;
  status: 'cancelled';
}

export interface RescheduledAppointment {
  /** The new appointment. The old one is now `rescheduled`. */
  id: string;
  reference: string;
  status: 'requested';
  starts_at: string;
  ends_at: string;
}

export const ownAppointmentsService = {
  /** Frees the slot. The appointment stays on record as cancelled, with who and why. */
  async cancel(
    tx: Tx,
    ctx: RequestContext,
    id: string,
    body: CancelOwnAppointmentInput,
  ): Promise<CancelledAppointment> {
    const userId = requireUser(ctx);
    const current = await findChangeable(tx, userId, id);
    const now = new Date();

    const [updated] = await tx
      .update(appointments)
      .set({
        status: 'cancelled',
        cancelledAt: now,
        cancelledByUserId: userId,
        cancellationReason: body.reason ?? null,
        updatedAt: now,
      })
      .where(eq(appointments.id, current.id))
      .returning({ id: appointments.id });

    if (!updated) throw ApiError.internal('Could not cancel that appointment.');

    await recordAudit(tx, ctx, {
      action: 'appointment.cancelled',
      resourceType: 'appointment',
      resourceId: current.id,
      organizationId: current.organizationId,
      metadata: { by: 'patient', had_reason: Boolean(body.reason) },
    });

    const who = await context(tx, current);
    await notifyProvider(tx, {
      providerId: current.providerId,
      organizationId: current.organizationId,
      appointmentId: current.id,
      kind: 'cancelled',
      title: 'Appointment Cancelled',
      body: `${who.name} cancelled their appointment on ${clinicWhen(current.startsAt, who.timezone)}.`,
    });

    return { id: current.id, status: 'cancelled' };
  },

  /**
   * Books the new time and supersedes the old appointment, in one transaction.
   *
   * The new slot is re-derived here rather than trusted from the browser, with
   * the appointment being moved left out of the busy times -- otherwise a
   * patient could never move to a slot that overlaps their own current one.
   */
  async reschedule(
    tx: Tx,
    ctx: RequestContext,
    id: string,
    body: RescheduleOwnAppointmentInput,
  ): Promise<RescheduledAppointment> {
    const userId = requireUser(ctx);
    const current = await findChangeable(tx, userId, id);

    if (!current.providerId) {
      throw ApiError.conflict('This appointment has no provider, so it cannot be moved online.');
    }
    if (Date.parse(body.starts_at) === current.startsAt.getTime()) {
      throw ApiError.badRequest('That is the time already booked. Pick a different one.');
    }

    const day = body.starts_at.slice(0, 10);
    const open = await openSlots(tx, {
      providerIds: [current.providerId],
      from: new Date(Date.parse(body.starts_at) - 86_400_000),
      to: new Date(Date.parse(body.starts_at) + 86_400_000),
      dates: { from: day, to: addDay(day) },
      ignoreAppointmentId: current.id,
    });

    const slot = open
      .get(current.providerId)
      ?.slots.find((candidate) => candidate.starts_at === new Date(body.starts_at).toISOString());
    if (!slot) {
      throw ApiError.slotUnavailable('That time is no longer available. Please pick another.');
    }

    const now = new Date();

    // Supersede first. The exclusion constraint would refuse the new booking
    // while the old one still holds an overlapping slot.
    const superseded = await tx
      .update(appointments)
      .set({ status: 'rescheduled', updatedAt: now })
      .where(eq(appointments.id, current.id))
      .returning({ id: appointments.id });

    // Row-level security refuses an update by matching no rows, not by raising
    // an error. Without this check a missing policy would book the new time and
    // leave the old one standing -- two live appointments for one visit. Throwing
    // rolls the whole transaction back, so nothing is booked at all.
    if (superseded.length === 0) {
      throw ApiError.internal('Could not move that appointment.');
    }

    const [created] = await tx
      .insert(appointments)
      .values({
        reference: newBookingReference(),
        organizationId: current.organizationId,
        facilityId: current.facilityId,
        providerId: current.providerId,
        patientId: current.patientId,
        patientUserId: current.patientUserId,
        visitReasonId: current.visitReasonId,
        status: 'requested',
        source: current.source,
        visitType: current.visitType,
        startsAt: new Date(slot.starts_at),
        endsAt: new Date(slot.ends_at),
        durationMinutes: slot.duration_minutes,
        patientNote: current.patientNote,
        patientInsuranceId: current.patientInsuranceId,
        insuranceCarrierName: current.insuranceCarrierName,
        patientSnapshot: current.patientSnapshot,
        rescheduledFromId: current.id,
        directPageId: current.directPageId,
        campaignId: current.campaignId,
        attribution: current.attribution,
      })
      .returning({ id: appointments.id, reference: appointments.reference });

    if (!created) throw ApiError.internal('Could not move that appointment.');

    await recordAudit(tx, ctx, {
      action: 'appointment.rescheduled',
      resourceType: 'appointment',
      resourceId: created.id,
      organizationId: current.organizationId,
      metadata: { by: 'patient', from_appointment_id: current.id },
    });

    const who = await context(tx, current);
    await notifyProvider(tx, {
      providerId: current.providerId,
      organizationId: current.organizationId,
      appointmentId: created.id,
      kind: 'rescheduled',
      title: 'Appointment Rescheduled',
      body: `${who.name} requested to move their appointment from ${clinicWhen(current.startsAt, who.timezone)} to ${clinicWhen(new Date(slot.starts_at), who.timezone)}.`,
    });

    return {
      id: created.id,
      reference: created.reference,
      status: 'requested',
      starts_at: slot.starts_at,
      ends_at: slot.ends_at,
    };
  },
};

function requireUser(ctx: RequestContext): string {
  const userId = ctx.session?.userId;
  if (!userId) throw ApiError.unauthenticated();
  return userId;
}

/**
 * The caller's own appointment, if it can still be changed. Someone else's, a
 * malformed id and a missing one are all "not found".
 */
async function findChangeable(tx: Tx, userId: string, id: string) {
  if (!UUID.test(id)) throw ApiError.notFound('That appointment was not found.');

  const [row] = await tx
    .select()
    .from(appointments)
    .where(
      and(
        eq(appointments.id, id),
        eq(appointments.patientUserId, userId),
        isNull(appointments.deletedAt),
      ),
    )
    .limit(1);

  if (!row) throw ApiError.notFound('That appointment was not found.');

  if (!CHANGEABLE.includes(row.status)) {
    throw ApiError.conflict(`This appointment is ${row.status.replace('_', ' ')} and can no longer be changed.`);
  }
  if (row.startsAt.getTime() <= Date.now()) {
    throw ApiError.conflict('This appointment has already started, so it cannot be changed online.');
  }

  return row;
}

/** "2026-09-17" -> "2026-09-18". */
function addDay(date: string): string {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString().slice(0, 10);
}

/** The patient's name and the clinic's zone, for the doctor's notification. */
async function context(tx: Tx, row: { patientId: string; facilityId: string }): Promise<{ name: string; timezone: string }> {
  const [patient] = await tx
    .select({ first: patients.firstName, last: patients.lastName })
    .from(patients)
    .where(eq(patients.id, row.patientId))
    .limit(1);
  const [facility] = await tx.select({ timezone: facilities.timezone }).from(facilities).where(eq(facilities.id, row.facilityId)).limit(1);
  return { name: patient ? `${patient.first} ${patient.last}`.trim() : 'A patient', timezone: facility?.timezone ?? 'UTC' };
}
