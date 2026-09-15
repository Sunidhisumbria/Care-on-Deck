import { randomUUID } from 'node:crypto';
import { dependentSchema } from '@/features/patient/schemas/dependent.schema';
import { recordAudit } from '@/server/observability/audit';
/**
 * Everything a patient can do with their own record.
 *
 * Reads here are self-scoped: the RLS policy on `patients` resolves through
 * `current_user_id`, so a bug in this file cannot expose another patient. Insurance
 * member and group numbers are decrypted only on the detail read, never in a list.
 *
 * IA: 3. Patient Account
 */
import { and, asc, desc, eq, gte, inArray, isNull } from 'drizzle-orm';

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
import type { Tx } from '@/server/db/tenant';
import { ApiError } from '@/server/http/errors';
import { notImplemented } from '@/server/http/response';

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
  facility: { name: string; address: string | null } | null;
}

/** IA: 3. Patient Profile -- everything the Personal Information screen shows. */
export interface OwnProfile {
  patient_id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  preferred_name: string | null;
  date_of_birth: string | null;
  gender: string | null;
  email: string | null;
  phone: string | null;
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
    carrier: string | null;
    plan: string | null;
    member_id_last4: string | null;
  } | null;
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

    const [insurance] = await tx
      .select({
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
      .limit(1);

    return {
      patient_id: patient.id,
      first_name: patient.firstName,
      middle_name: patient.middleName,
      last_name: patient.lastName,
      preferred_name: patient.preferredName,
      date_of_birth: patient.dateOfBirth,
      gender: patient.gender,
      email: patient.email,
      phone: patient.phone,
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
            carrier: insurance.carrierName ?? insurance.carrierNameRaw,
            plan: insurance.planName,
            member_id_last4: insurance.memberIdLast4,
          }
        : null,
    };
  },

  async updateOwnProfile(tx: Tx, ctx: RequestContext, body: unknown): Promise<unknown> {
    return notImplemented('patientService.updateOwnProfile');
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
  async listOwnAppointments(tx: Tx, ctx: RequestContext): Promise<OwnAppointment[]> {
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
      })
      .from(appointments)
      .leftJoin(providers, eq(providers.id, appointments.providerId))
      .leftJoin(facilities, eq(facilities.id, appointments.facilityId))
      .where(
        and(
          eq(appointments.patientUserId, userId),
          isNull(appointments.deletedAt),
          gte(appointments.startsAt, new Date()),
          inArray(appointments.status, ['requested', 'confirmed', 'checked_in']),
        ),
      )
      .orderBy(asc(appointments.startsAt))
      .limit(20);

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
            specialty: specialtyByProvider.get(row.providerId) ?? null,
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
          }
        : null,
    }));
  },

  /** IA: 3. Saved Address */
  async listAddresses(tx: Tx, ctx: RequestContext): Promise<unknown> {
    return notImplemented('patientService.listAddresses');
  },

  async addAddress(tx: Tx, ctx: RequestContext, body: unknown): Promise<unknown> {
    return notImplemented('patientService.addAddress');
  },

  /** IA: 3. Saved Insurance */
  async listInsurance(tx: Tx, ctx: RequestContext): Promise<unknown> {
    return notImplemented('patientService.listInsurance');
  },

  /** Encrypts the member and group numbers; keeps only last4 in the clear. */
  async addInsurance(tx: Tx, ctx: RequestContext, body: unknown): Promise<unknown> {
    return notImplemented('patientService.addInsurance');
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
