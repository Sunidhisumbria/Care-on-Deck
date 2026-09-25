import { randomUUID } from 'node:crypto';
import { dependentSchema } from '@/features/patient/schemas/dependent.schema';
import { recordAudit } from '@/server/observability/audit';
/**
 * Everything a patient can do with their own record.
 *
 * Reads here are self-scoped: the RLS policy on `patients` resolves through
 * `current_user_id`, so a bug in this file cannot expose another patient. Saved
 * insurance, with its encrypted member and group IDs, lives in insurance.service.
 *
 * IA: 3. Patient Account
 */
import { and, asc, desc, eq, gt, inArray, isNull, lte, or, sql } from 'drizzle-orm';

import type { RequestContext } from '@/server/auth/context';
import { appointments } from '@/server/db/schema/appointments';
import { insuranceCarriers, insurancePlans } from '@/server/db/schema/insurance';
import { facilities, specialties } from '@/server/db/schema/organizations';
import {
  patientAddresses,
  patientDependents,
  patientInsurance,
  patients,
} from '@/server/db/schema/patients';
import { providerSpecialties, providers } from '@/server/db/schema/providers';
import { visitReasons } from '@/server/db/schema/scheduling';

import type { AppointmentListStatus } from './own-appointments.schemas';
import type { Tx } from '@/server/db/tenant';
import { ApiError } from '@/server/http/errors';
import { notImplemented } from '@/server/http/response';
import type { ProfileUpdateInput } from '@/lib/patient-profile';
import { normalizeUsPhone } from '@/lib/practice';
import { users } from '@/server/db/schema/identity';
import { withElevated } from '@/server/db/tenant';
import { ownedFile } from '@/server/modules/uploads/uploads.service';

import { patientInsuranceService } from './insurance.service';

/** One row of IA: 3. Patient Dashboard > Upcoming Visits. */
export interface OwnAppointment {
  id: string;
  reference: string;
  status: string;
  starts_at: string;
  duration_minutes: number;
  provider: {
    name: string;
    specialty: string | null;
    rating_average: number | null;
    rating_count: number;
  } | null;
  /** `timezone` is the clinic's. Times are shown in it, never the reader's. */
  facility: { name: string; address: string | null; timezone: string } | null;
}

/** One appointment, opened from View Details. */
export interface OwnAppointmentDetail {
  id: string;
  reference: string;
  status: string;
  starts_at: string;
  ends_at: string;
  duration_minutes: number;
  requested_at: string;
  visit_reason: string | null;
  patient_note: string | null;
  /** The carrier's name and the card's last four only -- never a member ID. */
  payment:
    | { kind: 'self_pay' }
    | { kind: 'insurance'; carrier: string | null; member_id_last4: string | null };
  provider: {
    id: string;
    name: string;
    specialty: string | null;
    /** Null until patients have reviewed them. */
    rating_average: number | null;
    rating_count: number;
  } | null;
  /** Who the visit is for, as the patient record held them when this was read. */
  patient: { full_name: string; gender: string | null; age: number | null } | null;
  booking_for: 'self' | 'dependent';
  /** Upcoming and not yet closed by the practice, so Cancel and Reschedule are offered. */
  can_change: boolean;
  facility: {
    name: string;
    address_line1: string | null;
    address_line2: string | null;
    city: string | null;
    state: string | null;
    postal_code: string | null;
    phone: string | null;
    timezone: string;
  } | null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Whole years since a YYYY-MM-DD birth date, counting the birthday itself. */
function ageOn(dateOfBirth: string | Date | null, today = new Date()): number | null {
  if (!dateOfBirth) return null;
  const [year, month, day] = String(dateOfBirth).slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return null;

  const beforeBirthday =
    today.getUTCMonth() + 1 < month || (today.getUTCMonth() + 1 === month && today.getUTCDate() < day);
  return today.getUTCFullYear() - year - (beforeBirthday ? 1 : 0);
}

/**
 * A provider's specialty when they have not picked one: the NPI registry's.
 * `specialties` is reference data nobody has filled in yet.
 */
const registrySpecialty = sql<
  string | null
>`${providers.npiRegistrySnapshot} #>> '{profile,primary_taxonomy,desc}'`;

/** IA: 3. Patient Profile -- everything the Personal Information screen shows. */
export interface OwnProfile {
  patient_id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  preferred_name: string | null;
  date_of_birth: string | null;
  /** Sex assigned at birth. */
  gender: string | null;
  /** Optional; one of GENDER_IDENTITIES. */
  gender_identity: string | null;
  languages: string[];
  /** A `patient_photo` upload; opened through `/uploads/{id}/view`. */
  photo_media_id: string | null;
  email: string | null;
  phone: string | null;
  phone_type: string | null;
  secondary_phone: string | null;
  secondary_phone_type: string | null;
  /** The sign-in email has been verified: the profile marks it with a star. */
  email_verified: boolean;
  /** The coarse "where I am looking for care" from signup, not a mailing address. */
  location_label: string | null;
  address: {
    line1: string;
    line2: string | null;
    city: string;
    state: string;
    postal_code: string;
  } | null;
  insurance: {
    /** For `GET /patients/insurance/{id}`, which the edit screen uses to show the full member ID. */
    id: string;
    carrier: string | null;
    plan: string | null;
    member_id_last4: string | null;
  } | null;
  /** A second card on file, shown in summary; it is managed on the Insurance screen. */
  secondary_insurance: { id: string; carrier: string | null; member_id_last4: string | null } | null;
}

export interface DependentSummary {
  gender: string | null;
  phone: string | null;
  id: string;
  patient_id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  relationship: string;
  can_book_on_behalf: boolean;
}

/** Still to happen. A visit under way counts until it ends. */
const ACTIVE = ['requested', 'confirmed', 'checked_in'] as const;

/**
 * Which appointments each Appointments tab holds.
 *
 *   upcoming   active, and not yet over.
 *   completed  the visit's time has passed and it was not called off -- or the
 *              practice has closed it as completed or a no-show. Each keeps its
 *              real status badge, so a visit the practice never confirmed still
 *              says "Requested" rather than claiming it happened.
 *   canceled   cancelled by either side, or a request the practice declined.
 *
 * A rescheduled appointment is in none of them: its replacement is listed
 * instead, and showing both would count one visit twice.
 */
function tabCondition(status: AppointmentListStatus, now: Date) {
  switch (status) {
    case 'upcoming':
      return and(inArray(appointments.status, [...ACTIVE]), gt(appointments.endsAt, now));
    case 'completed':
      return or(
        inArray(appointments.status, ['completed', 'no_show']),
        and(inArray(appointments.status, [...ACTIVE]), lte(appointments.endsAt, now)),
      );
    case 'canceled':
      return inArray(appointments.status, ['cancelled', 'declined']);
  }
}

export const patientService = {
  /**
   * IA: 3. Patient Profile > Personal Details, Contact Details.
   *
   * Self-scoped by RLS: the policy on `patients` resolves through
   * `current_user_id`, so the `user_id` filter below is a readability aid, not
   * the thing keeping other people's records out.
   *
   * The default address and primary insurance ride along because the screen
   * shows all three together, and three round trips for one card is waste.
   * Member and group numbers stay encrypted -- only the last four are
   * returned, which is all the screen displays.
   */
  async getOwnProfile(tx: Tx, ctx: RequestContext): Promise<OwnProfile> {
    const userId = ctx.session?.userId;
    if (!userId) throw ApiError.unauthenticated();

    const [patient] = await tx
      .select()
      .from(patients)
      .where(and(eq(patients.userId, userId), isNull(patients.deletedAt)))
      .limit(1);

    if (!patient) throw ApiError.notFound('No patient record for this account.');

    const [address] = await tx
      .select()
      .from(patientAddresses)
      .where(and(eq(patientAddresses.patientId, patient.id), isNull(patientAddresses.deletedAt)))
      // The default one, else the most recent.
      .orderBy(desc(patientAddresses.isDefault), desc(patientAddresses.createdAt))
      .limit(1);

    const cards = await tx
      .select({
        id: patientInsurance.id,
        carrierName: insuranceCarriers.name,
        carrierNameRaw: patientInsurance.carrierNameRaw,
        planName: insurancePlans.name,
        memberIdLast4: patientInsurance.memberIdLast4,
      })
      .from(patientInsurance)
      .leftJoin(insuranceCarriers, eq(insuranceCarriers.id, patientInsurance.carrierId))
      .leftJoin(insurancePlans, eq(insurancePlans.id, patientInsurance.planId))
      .where(and(eq(patientInsurance.patientId, patient.id), isNull(patientInsurance.deletedAt)))
      .orderBy(desc(patientInsurance.isPrimary), desc(patientInsurance.createdAt))
      .limit(2);
    const [insurance, secondary] = cards;

    // `users` is the account, not the patient record; read elevated for this one flag.
    const [account] = await withElevated(tx, () =>
      tx.select({ emailVerifiedAt: users.emailVerifiedAt }).from(users).where(eq(users.id, userId)).limit(1),
    );

    return {
      patient_id: patient.id,
      first_name: patient.firstName,
      middle_name: patient.middleName,
      last_name: patient.lastName,
      preferred_name: patient.preferredName,
      date_of_birth: patient.dateOfBirth,
      gender: patient.gender,
      gender_identity: patient.genderIdentity,
      languages: patient.languages ?? [],
      photo_media_id: patient.photoMediaId,
      email: patient.email,
      phone: patient.phone,
      phone_type: patient.phoneType,
      secondary_phone: patient.secondaryPhone,
      secondary_phone_type: patient.secondaryPhoneType,
      email_verified: Boolean(account?.emailVerifiedAt),
      location_label: patient.locationLabel,
      address: address
        ? {
            line1: address.addressLine1,
            line2: address.addressLine2,
            city: address.city,
            state: address.state,
            postal_code: address.postalCode,
          }
        : null,
      insurance: insurance
        ? {
            // The directory name when it matched one, else what they typed.
            id: insurance.id,
            carrier: insurance.carrierName ?? insurance.carrierNameRaw,
            plan: insurance.planName,
            member_id_last4: insurance.memberIdLast4,
          }
        : null,
      secondary_insurance: secondary
        ? { id: secondary.id, carrier: secondary.carrierName ?? secondary.carrierNameRaw, member_id_last4: secondary.memberIdLast4 }
        : null,
    };
  },

  /**
   * IA: 3. Edit Profile. Personal details, the default address, and the primary
   * insurance card, saved together -- one Update button, one transaction, so a
   * rejected card number does not leave the name changed and the card not.
   *
   * Email and phone are not editable here; see lib/patient-profile.
   */
  async updateOwnProfile(tx: Tx, ctx: RequestContext, input: ProfileUpdateInput): Promise<OwnProfile> {
    const userId = ctx.session?.userId;
    if (!userId) throw ApiError.unauthenticated();

    const [patient] = await tx
      .select()
      .from(patients)
      .where(and(eq(patients.userId, userId), isNull(patients.deletedAt)))
      .limit(1);
    if (!patient) throw ApiError.notFound('No patient record for this account.');

    // Only the caller's own profile photo uploads may be attached.
    if (input.photo_media_id && input.photo_media_id !== patient.photoMediaId) {
      const photo = await ownedFile(tx, userId, input.photo_media_id, 'patient_photo');
      if (!photo) {
        const message = 'That photo was not recognised. Upload it again.';
        throw new ApiError('VALIDATION_FAILED', message, { details: [{ path: 'photo_media_id', message }] });
      }
    }

    const next = {
      preferredName: input.preferred_name || null,
      dateOfBirth: input.date_of_birth,
      gender: input.gender,
      genderIdentity: input.gender_identity,
      // One preferred language today; stored as a list so more can follow.
      languages: [input.language],
      phoneType: input.phone_type,
      secondaryPhone: input.secondary_phone ? normalizeUsPhone(input.secondary_phone) : null,
      secondaryPhoneType: input.secondary_phone ? input.secondary_phone_type : null,
      photoMediaId: input.photo_media_id,
    };

    // Names of what changed, never the values: audit rows are not a PHI store.
    const changed: string[] = (Object.keys(next) as Array<keyof typeof next>).filter(
      (key) => JSON.stringify(next[key]) !== JSON.stringify(patient[key] ?? null),
    );

    // The spec records when and where gender identity was last set.
    const identityChanged = changed.includes('genderIdentity');

    if (changed.length > 0) {
      await tx
        .update(patients)
        .set({
          ...next,
          ...(identityChanged ? { genderIdentityUpdatedAt: new Date(), genderIdentitySource: 'patient_profile' } : {}),
          updatedAt: new Date(),
        })
        .where(eq(patients.id, patient.id));
    }

    if (input.address) {
      if (await saveDefaultAddress(tx, patient.id, input.address)) changed.push('address');
    }

    if (input.insurance) {
      await patientInsuranceService.editCard(tx, ctx, input.insurance);
    }

    if (changed.length > 0) {
      await recordAudit(tx, ctx, {
        action: 'patient.profile.updated',
        resourceType: 'patient',
        resourceId: patient.id,
        metadata: { fields: changed },
      });
    }

    return patientService.getOwnProfile(tx, ctx);
  },

  /** IA: 3. Patient Dashboard > Upcoming, Confirmed, Past Visits */
  /**
   * The caller's own appointments, soonest first.
   *
   * Scoped by `patient_user_id` rather than by joining `patients`. That column
   * is denormalised precisely so this read works: the RLS policy on
   * `appointments` matches on it, and a policy that joined `patients` would
   * recurse, because the patients policy reads `appointments`. The filter here
   * is belt and braces on top of that policy, not a substitute for it.
   *
   * Cancelled visits are left out. This feeds a dashboard answering "what is
   * coming up", and a cancelled appointment is not.
   */
  async listOwnAppointments(
    tx: Tx,
    ctx: RequestContext,
    status: AppointmentListStatus = 'upcoming',
  ): Promise<OwnAppointment[]> {
    const userId = ctx.session?.userId;
    if (!userId) throw ApiError.unauthenticated();

    const rows = await tx
      .select({
        id: appointments.id,
        reference: appointments.reference,
        status: appointments.status,
        startsAt: appointments.startsAt,
        durationMinutes: appointments.durationMinutes,
        providerId: appointments.providerId,
        providerFirst: providers.firstName,
        providerLast: providers.lastName,
        providerDisplay: providers.displayName,
        providerCredentials: providers.credentials,
        ratingAverage: providers.ratingAverage,
        ratingCount: providers.ratingCount,
        facilityName: facilities.name,
        addressLine1: facilities.addressLine1,
        city: facilities.city,
        state: facilities.state,
        postalCode: facilities.postalCode,
        timezone: facilities.timezone,
        registrySpecialty,
      })
      .from(appointments)
      .leftJoin(providers, eq(providers.id, appointments.providerId))
      .leftJoin(facilities, eq(facilities.id, appointments.facilityId))
      .where(
        and(
          eq(appointments.patientUserId, userId),
          isNull(appointments.deletedAt),
          tabCondition(status, new Date()),
        ),
      )
      // Upcoming reads soonest first; the history tabs read most recent first.
      .orderBy(status === 'upcoming' ? asc(appointments.startsAt) : desc(appointments.startsAt))
      .limit(50);

    // One query for every specialty involved, rather than one per row.
    const providerIds = rows.map((r) => r.providerId).filter((id): id is string => Boolean(id));
    const specialtyByProvider = new Map<string, string>();

    if (providerIds.length > 0) {
      const found = await tx
        .select({ providerId: providerSpecialties.providerId, name: specialties.name })
        .from(providerSpecialties)
        .innerJoin(specialties, eq(specialties.id, providerSpecialties.specialtyId))
        .where(inArray(providerSpecialties.providerId, providerIds))
        .orderBy(desc(providerSpecialties.isPrimary));

      for (const row of found) {
        if (!specialtyByProvider.has(row.providerId)) {
          specialtyByProvider.set(row.providerId, row.name);
        }
      }
    }

    return rows.map((row) => ({
      id: row.id,
      reference: row.reference,
      status: row.status,
      starts_at: row.startsAt.toISOString(),
      duration_minutes: row.durationMinutes,
      provider: row.providerId
        ? {
            name:
              row.providerDisplay ??
              ['Dr.', row.providerFirst, row.providerLast].filter(Boolean).join(' ') +
                (row.providerCredentials ? `, ${row.providerCredentials}` : ''),
            specialty: specialtyByProvider.get(row.providerId) ?? row.registrySpecialty ?? null,
            rating_average: row.ratingAverage,
            rating_count: row.ratingCount ?? 0,
          }
        : null,
      facility: row.facilityName
        ? {
            name: row.facilityName,
            address:
              [row.addressLine1, row.city, row.state, row.postalCode]
                .filter(Boolean)
                .join(', ') || null,
            timezone: row.timezone ?? 'UTC',
          }
        : null,
    }));
  },

  /**
   * One of the caller's own appointments, for View Details.
   *
   * Scoped by `patient_user_id` like the list, so someone else's id, a
   * malformed id and a missing one all read the same: not found.
   */
  async getOwnAppointment(tx: Tx, ctx: RequestContext, id: string): Promise<OwnAppointmentDetail> {
    const userId = ctx.session?.userId;
    if (!userId) throw ApiError.unauthenticated();
    if (!UUID.test(id)) throw ApiError.notFound('That appointment was not found.');

    const [row] = await tx
      .select({
        id: appointments.id,
        reference: appointments.reference,
        status: appointments.status,
        startsAt: appointments.startsAt,
        endsAt: appointments.endsAt,
        durationMinutes: appointments.durationMinutes,
        requestedAt: appointments.requestedAt,
        patientNote: appointments.patientNote,
        patientInsuranceId: appointments.patientInsuranceId,
        carrierName: appointments.insuranceCarrierName,
        memberIdLast4: patientInsurance.memberIdLast4,
        visitReason: visitReasons.name,
        providerId: appointments.providerId,
        providerDisplay: providers.displayName,
        providerFirst: providers.firstName,
        providerLast: providers.lastName,
        providerRatingAverage: providers.ratingAverage,
        providerRatingCount: providers.ratingCount,
        registrySpecialty,
        patientFirst: patients.firstName,
        patientLast: patients.lastName,
        patientGender: patients.gender,
        patientDateOfBirth: patients.dateOfBirth,
        patientAccountUserId: patients.userId,
        facilityName: facilities.name,
        addressLine1: facilities.addressLine1,
        addressLine2: facilities.addressLine2,
        city: facilities.city,
        state: facilities.state,
        postalCode: facilities.postalCode,
        phone: facilities.phone,
        timezone: facilities.timezone,
      })
      .from(appointments)
      .leftJoin(providers, eq(providers.id, appointments.providerId))
      .leftJoin(facilities, eq(facilities.id, appointments.facilityId))
      .leftJoin(visitReasons, eq(visitReasons.id, appointments.visitReasonId))
      .leftJoin(patientInsurance, eq(patientInsurance.id, appointments.patientInsuranceId))
      .leftJoin(patients, eq(patients.id, appointments.patientId))
      .where(
        and(
          eq(appointments.id, id),
          eq(appointments.patientUserId, userId),
          isNull(appointments.deletedAt),
        ),
      )
      .limit(1);

    if (!row) throw ApiError.notFound('That appointment was not found.');

    return {
      id: row.id,
      reference: row.reference,
      status: row.status,
      starts_at: row.startsAt.toISOString(),
      ends_at: row.endsAt.toISOString(),
      duration_minutes: row.durationMinutes,
      requested_at: row.requestedAt.toISOString(),
      visit_reason: row.visitReason,
      patient_note: row.patientNote,
      payment: row.patientInsuranceId
        ? { kind: 'insurance', carrier: row.carrierName, member_id_last4: row.memberIdLast4 }
        : { kind: 'self_pay' },
      provider: row.providerId
        ? {
            id: row.providerId,
            name:
              row.providerDisplay ??
              ['Dr.', row.providerFirst, row.providerLast].filter(Boolean).join(' '),
            specialty: row.registrySpecialty,
            rating_average: row.providerRatingCount ? row.providerRatingAverage : null,
            rating_count: row.providerRatingCount ?? 0,
          }
        : null,
      patient: row.patientFirst
        ? {
            full_name: [row.patientFirst, row.patientLast].filter(Boolean).join(' '),
            gender: row.patientGender,
            age: ageOn(row.patientDateOfBirth),
          }
        : null,
      booking_for: row.patientAccountUserId === userId ? 'self' : 'dependent',
      can_change:
        ['requested', 'confirmed'].includes(row.status) && row.startsAt.getTime() > Date.now(),
      facility: row.facilityName
        ? {
            name: row.facilityName,
            address_line1: row.addressLine1,
            address_line2: row.addressLine2,
            city: row.city,
            state: row.state,
            postal_code: row.postalCode,
            phone: row.phone,
            timezone: row.timezone ?? 'UTC',
          }
        : null,
    };
  },

  /** IA: 3. Saved Address */
  async listAddresses(tx: Tx, ctx: RequestContext): Promise<unknown> {
    return notImplemented('patientService.listAddresses');
  },

  async addAddress(tx: Tx, ctx: RequestContext, body: unknown): Promise<unknown> {
    return notImplemented('patientService.addAddress');
  },

  /**
   * IA: 3. Dependents.
   *
   * Each dependent is a patient record in its own right, so this joins back to
   * `patients` for their details rather than duplicating name and date of
   * birth on the link row.
   */
  async listDependents(tx: Tx, ctx: RequestContext): Promise<DependentSummary[]> {
    const userId = ctx.session?.userId;
    if (!userId) throw ApiError.unauthenticated();

    const [guardian] = await tx
      .select({ id: patients.id })
      .from(patients)
      .where(and(eq(patients.userId, userId), isNull(patients.deletedAt)))
      .limit(1);

    if (!guardian) return [];

    const rows = await tx
      .select({
        id: patientDependents.id,
        patientId: patients.id,
        firstName: patients.firstName,
        lastName: patients.lastName,
        dateOfBirth: patients.dateOfBirth,
        gender: patients.gender,
        phone: patients.phone,
        relationship: patientDependents.relationship,
        canBookOnBehalf: patientDependents.canBookOnBehalf,
      })
      .from(patientDependents)
      .innerJoin(patients, eq(patients.id, patientDependents.dependentPatientId))
      .where(
        and(
          eq(patientDependents.guardianPatientId, guardian.id),
          isNull(patientDependents.deletedAt),
          isNull(patients.deletedAt),
        ),
      )
      .orderBy(patients.firstName);

    return rows.map((row) => ({
      id: row.id,
      patient_id: row.patientId,
      first_name: row.firstName,
      last_name: row.lastName,
      date_of_birth: row.dateOfBirth,
      gender: row.gender,
      phone: row.phone,
      relationship: row.relationship,
      can_book_on_behalf: row.canBookOnBehalf,
    }));
  },

  /**
   * Creates a full patient record for the dependent so they can own their own
   * appointments and insurance.
   */
  async addDependent(tx: Tx, ctx: RequestContext, body: unknown): Promise<DependentSummary> {
    const userId = ctx.session?.userId;
    if (!userId) throw ApiError.unauthenticated();
    const input = dependentSchema.parse(body);
    const [guardian] = await tx.select({ id: patients.id }).from(patients)
      .where(and(eq(patients.userId, userId), isNull(patients.deletedAt))).limit(1);
    if (!guardian) throw ApiError.badRequest('Complete your patient profile before adding a dependent.');

    const patientId = randomUUID();
    const linkId = randomUUID();
    // Insert without RETURNING: the new patient becomes readable under RLS only
    // after the guardian link exists. Both inserts use the route transaction.
    await tx.insert(patients).values({
      id: patientId, firstName: input.first_name, lastName: input.last_name,
      dateOfBirth: input.date_of_birth, gender: input.gender, phone: input.phone || null,
    });
    await tx.insert(patientDependents).values({
      id: linkId, guardianPatientId: guardian.id, guardianUserId: userId,
      dependentPatientId: patientId, relationship: input.relationship, canBookOnBehalf: true,
    });
    await recordAudit(tx, ctx, {
      action: 'patient.dependent.created', resourceType: 'patient_dependent', resourceId: linkId,
    });
    return {
      id: linkId, patient_id: patientId, first_name: input.first_name, last_name: input.last_name,
      date_of_birth: input.date_of_birth, gender: input.gender, phone: input.phone || null,
      relationship: input.relationship, can_book_on_behalf: true,
    };
  },

  async listOwnReviews(tx: Tx, ctx: RequestContext): Promise<unknown> {
    return notImplemented('patientService.listOwnReviews');
  },

  /**
   * Only for a completed appointment, and enters moderation before it lists.
   * IA: 14. Approvals > Review Moderation
   */
  async submitReview(tx: Tx, ctx: RequestContext, body: unknown): Promise<unknown> {
    return notImplemented('patientService.submitReview');
  },
};

/**
 * Writes the address Edit Profile shows: the default one, else the most recent,
 * else a new default. Returns whether anything changed.
 */
export async function saveDefaultAddress(
  tx: Tx,
  patientId: string,
  address: NonNullable<ProfileUpdateInput['address']>,
): Promise<boolean> {
  const values = {
    addressLine1: address.line1,
    addressLine2: address.line2 || null,
    city: address.city,
    state: address.state,
    postalCode: address.postal_code,
  };

  const [current] = await tx
    .select()
    .from(patientAddresses)
    .where(and(eq(patientAddresses.patientId, patientId), isNull(patientAddresses.deletedAt)))
    .orderBy(desc(patientAddresses.isDefault), desc(patientAddresses.createdAt))
    .limit(1);

  if (!current) {
    await tx.insert(patientAddresses).values({ patientId, ...values, isDefault: true });
    return true;
  }

  const same = (Object.keys(values) as Array<keyof typeof values>).every((key) => values[key] === current[key]);
  if (same) return false;

  await tx
    .update(patientAddresses)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(patientAddresses.id, current.id));
  return true;
}
