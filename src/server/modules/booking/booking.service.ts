/**
 * The booking funnel, from Select Provider through Appointment Created.
 *
 * The critical section is requestAppointment: it re-checks availability inside
 * the same transaction that inserts the appointment. Checking first and
 * inserting after is a race two patients will find within a week. The exclusion
 * constraint on `appointments` is the backstop when they do.
 *
 * IA: 2. Patient Booking
 */
import { and, asc, eq, isNull, or } from 'drizzle-orm';

import type { RequestContext } from '@/server/auth/context';
import {
  appointments,
  facilities,
  insuranceCarriers,
  patientInsurance,
  patients,
  providerFacilities,
  providers,
  visitReasons,
} from '@/server/db/schema';
import type { Tx } from '@/server/db/tenant';
import { ApiError } from '@/server/http/errors';
import { notImplemented } from '@/server/http/response';
import { recordAudit } from '@/server/observability/audit';
import { openSlots } from '@/server/modules/scheduling/availability';

import type { BookingRequestInput, VisitReasonsQuery } from './booking.schemas';
import { newBookingReference } from './reference';

export interface VisitReasonOption {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
}

export interface BookingConfirmation {
  reference: string;
  status: string;
  starts_at: string;
  ends_at: string;
  timezone: string;
  provider_name: string;
  facility_name: string;
}

export const bookingService = {
  /**
   * The reasons this provider's practice offers, for the Visit Reason step.
   * Public: the list is part of the storefront, and RLS shows only the ones a
   * practice has marked bookable online.
   *
   * IA: 2. Patient Booking > Select Visit Reason
   */
  async listVisitReasons(tx: Tx, query: VisitReasonsQuery): Promise<VisitReasonOption[]> {
    const where = await providerPractice(tx, query.provider_id);

    return tx
      .select({
        id: visitReasons.id,
        name: visitReasons.name,
        description: visitReasons.description,
        duration_minutes: visitReasons.durationMinutes,
      })
      .from(visitReasons)
      .where(
        and(
          eq(visitReasons.organizationId, where.organizationId),
          or(isNull(visitReasons.facilityId), eq(visitReasons.facilityId, where.facilityId)),
          eq(visitReasons.isActive, true),
          eq(visitReasons.isBookableOnline, true),
          isNull(visitReasons.deletedAt),
        ),
      )
      .orderBy(asc(visitReasons.displayOrder), asc(visitReasons.name));
  },

  /**
   * Books the slot for the signed-in patient.
   *
   * The patient is whoever is signed in -- never a patient id from the body,
   * which would let anyone book in someone else's name. The demographic
   * snapshot is frozen onto the appointment so the practice sees who booked it
   * even if the patient edits their profile afterwards.
   *
   * IA: 2. Almost There -> Appointment Created
   */
  async requestAppointment(
    tx: Tx,
    ctx: RequestContext,
    body: BookingRequestInput,
  ): Promise<BookingConfirmation> {
    const userId = ctx.session?.userId;
    if (!userId) throw ApiError.unauthenticated();

    const [patient] = await tx
      .select({
        id: patients.id,
        firstName: patients.firstName,
        lastName: patients.lastName,
        dateOfBirth: patients.dateOfBirth,
        phone: patients.phone,
        email: patients.email,
      })
      .from(patients)
      .where(and(eq(patients.userId, userId), isNull(patients.deletedAt)))
      .limit(1);
    if (!patient) throw ApiError.notFound('No patient record for this account.');

    const practice = await providerPractice(tx, body.provider_id);

    // Re-derive the slot rather than trusting the one that was on screen.
    const day = body.starts_at.slice(0, 10);
    const open = await openSlots(tx, {
      providerIds: [body.provider_id],
      from: new Date(Date.parse(body.starts_at) - 86_400_000),
      to: new Date(Date.parse(body.starts_at) + 86_400_000),
      dates: { from: day, to: addDay(day) },
    });

    const slot = open
      .get(body.provider_id)
      ?.slots.find((candidate) => candidate.starts_at === body.starts_at);
    if (!slot) {
      throw ApiError.slotUnavailable('That time is no longer available. Please pick another.');
    }

    const reason = body.visit_reason_id
      ? await visitReasonFor(tx, practice.organizationId, body.visit_reason_id)
      : null;

    const insurance = await insuranceFor(tx, patient.id, body);

    const row = {
      reference: newBookingReference(),
      organizationId: practice.organizationId,
      facilityId: practice.facilityId,
      providerId: body.provider_id,
      patientId: patient.id,
      patientUserId: userId,
      visitReasonId: reason?.id ?? null,
      status: 'requested' as const,
      source: 'marketplace' as const,
      visitType: reason?.visitType ?? ('new_patient' as const),
      startsAt: new Date(slot.starts_at),
      endsAt: new Date(slot.ends_at),
      durationMinutes: slot.duration_minutes,
      patientNote: body.patient_note ?? null,
      patientInsuranceId: insurance?.id ?? null,
      insuranceCarrierName: insurance?.carrierName ?? null,
      patientSnapshot: {
        firstName: patient.firstName,
        lastName: patient.lastName,
        dateOfBirth: patient.dateOfBirth,
        phone: patient.phone,
        email: patient.email,
        address: null,
      },
    };

    const [created] = await tx
      .insert(appointments)
      .values(row)
      .returning({ id: appointments.id, reference: appointments.reference });

    if (!created) throw ApiError.internal('Could not book that appointment.');

    await recordAudit(tx, ctx, {
      action: 'booking.requested',
      resourceType: 'appointment',
      resourceId: created.id,
      organizationId: practice.organizationId,
      metadata: {
        source: 'marketplace',
        provider_id: body.provider_id,
        paid_by: body.payment.kind,
      },
    });

    return {
      reference: created.reference,
      status: 'requested',
      starts_at: slot.starts_at,
      ends_at: slot.ends_at,
      timezone: practice.timezone,
      provider_name: practice.providerName,
      facility_name: practice.facilityName,
    };
  },

  /** IA: 2. Appointment Created > Confetti Success, Next Steps */
  async getConfirmation(tx: Tx, reference: string): Promise<unknown> {
    return notImplemented('bookingService.getConfirmation');
  },
};

/**
 * The practice a provider works at, as the public can see it.
 *
 * A provider who is not listed, or whose location is not, is simply not found:
 * the booking flow must not become a way to discover practices that have not
 * been approved.
 */
async function providerPractice(tx: Tx, providerId: string) {
  const [found] = await tx
    .select({
      organizationId: providers.organizationId,
      providerName: providers.displayName,
      facilityId: facilities.id,
      facilityName: facilities.name,
      timezone: facilities.timezone,
    })
    .from(providers)
    .innerJoin(providerFacilities, eq(providerFacilities.providerId, providers.id))
    .innerJoin(facilities, eq(facilities.id, providerFacilities.facilityId))
    .where(
      and(
        eq(providers.id, providerId),
        eq(providers.isPubliclyListed, true),
        eq(providers.status, 'active'),
        isNull(providers.deletedAt),
        eq(facilities.isPubliclyListed, true),
        eq(facilities.status, 'active'),
      ),
    )
    .limit(1);

  if (!found) throw ApiError.notFound('That provider is not taking bookings.');

  return { ...found, providerName: found.providerName ?? 'Your provider' };
}

/** A reason must belong to the practice being booked, and still be offered. */
async function visitReasonFor(tx: Tx, organizationId: string, visitReasonId: string) {
  const [reason] = await tx
    .select({
      id: visitReasons.id,
      visitType: visitReasons.visitType,
    })
    .from(visitReasons)
    .where(
      and(
        eq(visitReasons.id, visitReasonId),
        eq(visitReasons.organizationId, organizationId),
        eq(visitReasons.isActive, true),
        eq(visitReasons.isBookableOnline, true),
        isNull(visitReasons.deletedAt),
      ),
    )
    .limit(1);

  if (!reason) throw ApiError.badRequest('That visit reason is not offered here.');

  return reason;
}

/**
 * The saved card being used, if any.
 *
 * Only the carrier's name is copied onto the appointment. The member ID stays
 * encrypted on the insurance record, where reading it is audited.
 */
async function insuranceFor(tx: Tx, patientId: string, body: BookingRequestInput) {
  if (body.payment.kind === 'self_pay') return null;

  const [card] = await tx
    .select({
      id: patientInsurance.id,
      carrierName: insuranceCarriers.name,
      carrierNameRaw: patientInsurance.carrierNameRaw,
    })
    .from(patientInsurance)
    .leftJoin(insuranceCarriers, eq(insuranceCarriers.id, patientInsurance.carrierId))
    .where(
      and(
        eq(patientInsurance.id, body.payment.patient_insurance_id),
        eq(patientInsurance.patientId, patientId),
        isNull(patientInsurance.deletedAt),
      ),
    )
    .limit(1);

  if (!card) throw ApiError.notFound('That insurance was not found.');

  return { id: card.id, carrierName: card.carrierName ?? card.carrierNameRaw };
}

/** "2026-09-17" -> "2026-09-18". */
function addDay(date: string): string {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString().slice(0, 10);
}
