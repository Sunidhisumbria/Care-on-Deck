/**
 * A patient's saved insurance.
 *
 * IA: 3. Patient Dashboard > Saved Insurance; 2. Booking > Insurance.
 *
 * Member and group IDs are encrypted by the application before they reach the
 * database (see security/phi). Only the last four characters of the member ID
 * are kept in the clear, which is all a list, or a staff member confirming a
 * card, needs. The full member ID is decrypted only when the patient opens a
 * card to edit it, and that read is audited. Audit rows carry ids and the
 * insurance type, never a member or group ID.
 *
 * Every read and write is scoped to the caller's own patient record, in the
 * query and by the row-level security policy on `patient_insurance`.
 */
import { and, desc, eq, isNull } from 'drizzle-orm';

import type { InsuranceType, PatientInsuranceInput, Relationship } from '@/lib/patient-insurance';
import type { ProfileUpdateInput } from '@/lib/patient-profile';
import type { RequestContext } from '@/server/auth/context';
import { insuranceCarriers } from '@/server/db/schema/insurance';
import { patientInsurance, patients } from '@/server/db/schema/patients';
import type { Tx } from '@/server/db/tenant';
import { ApiError } from '@/server/http/errors';
import { ownedFile } from '@/server/modules/uploads/uploads.service';
import { recordAudit } from '@/server/observability/audit';
import { decryptField, decryptOptional, encryptField, encryptOptional, last4 } from '@/server/security/phi';

type Row = typeof patientInsurance.$inferSelect;

export interface SavedInsurance {
  id: string;
  insurance_type: InsuranceType;
  carrier: { id: string | null; name: string };
  member_id_last4: string | null;
  group_id: string | null;
  policyholder_name: string | null;
  relationship: Relationship | null;
  is_primary: boolean;
  /** The photo of the card's front, when one was uploaded. */
  card_media_id: string | null;
  updated_at: string;
}

/** A card opened for editing: the patient must be able to see and correct the whole member ID. */
export interface SavedInsuranceDetail extends SavedInsurance {
  member_id: string;
}

interface Carrier {
  id: string | null;
  name: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const patientInsuranceService = {
  async list(tx: Tx, ctx: RequestContext): Promise<SavedInsurance[]> {
    const patientId = await ownPatientId(tx, ctx);

    const rows = await tx
      .select({ row: patientInsurance, carrierName: insuranceCarriers.name })
      .from(patientInsurance)
      .leftJoin(insuranceCarriers, eq(insuranceCarriers.id, patientInsurance.carrierId))
      .where(and(eq(patientInsurance.patientId, patientId), isNull(patientInsurance.deletedAt)))
      .orderBy(desc(patientInsurance.isPrimary), desc(patientInsurance.createdAt));

    return rows.map(({ row, carrierName }) => toView(row, carrierName));
  },

  async get(tx: Tx, ctx: RequestContext, id: string): Promise<SavedInsuranceDetail> {
    const patientId = await ownPatientId(tx, ctx);
    const found = await findOwn(tx, patientId, id);
    if (!found) throw ApiError.notFound('That insurance was not found.');

    await recordAudit(tx, ctx, {
      action: 'patient.insurance.viewed',
      resourceType: 'patient_insurance',
      resourceId: found.row.id,
    });

    return {
      ...toView(found.row, found.carrierName),
      member_id: decryptOptional(found.row.memberIdEncrypted) ?? '',
    };
  },

  /**
   * Adds a card. The same card added again -- a returning patient entering it
   * for a second booking -- updates the one on file instead of saving a copy.
   * Member IDs are encrypted with a fresh IV each time, so "the same" is decided
   * by decrypting the patient's few cards of the same type and carrier.
   */
  async create(tx: Tx, ctx: RequestContext, input: PatientInsuranceInput): Promise<SavedInsurance> {
    const patientId = await ownPatientId(tx, ctx);
    const carrier = await resolveCarrier(tx, input);
    const values = toValues(input, carrier);

    const onFile = await tx
      .select()
      .from(patientInsurance)
      .where(and(eq(patientInsurance.patientId, patientId), isNull(patientInsurance.deletedAt)));

    const same = onFile.find(
      (row) =>
        row.insuranceType === values.insuranceType &&
        sameCarrier(row, values) &&
        Boolean(row.memberIdEncrypted) &&
        comparable(decryptField(row.memberIdEncrypted!)) === comparable(input.member_id),
    );
    if (same) return writeUpdate(tx, ctx, same.id, values, carrier);

    const [row] = await tx
      .insert(patientInsurance)
      .values({ patientId, ...values, isPrimary: onFile.length === 0 })
      .returning();
    if (!row) throw ApiError.internal('Could not save your insurance.');

    await recordAudit(tx, ctx, {
      action: 'patient.insurance.created',
      resourceType: 'patient_insurance',
      resourceId: row.id,
      metadata: { insurance_type: row.insuranceType, carrier_id: row.carrierId },
    });

    return toView(row, carrier.id ? carrier.name : null);
  },

  async update(tx: Tx, ctx: RequestContext, id: string, input: PatientInsuranceInput): Promise<SavedInsurance> {
    const patientId = await ownPatientId(tx, ctx);
    const found = await findOwn(tx, patientId, id);
    if (!found) throw ApiError.notFound('That insurance was not found.');

    const carrier = await resolveCarrier(tx, input);
    return writeUpdate(tx, ctx, found.row.id, toValues(input, carrier), carrier);
  },

  /**
   * Edit Profile's insurance section: carrier, member ID, group ID and the card
   * photo of a card already on file. The screen does not ask the card's type or
   * who the policyholder is, so those are kept exactly as they were.
   */
  async editCard(
    tx: Tx,
    ctx: RequestContext,
    input: NonNullable<ProfileUpdateInput['insurance']>,
  ): Promise<SavedInsurance> {
    const patientId = await ownPatientId(tx, ctx);
    const found = await findOwn(tx, patientId, input.id);
    if (!found) throw ApiError.notFound('That insurance was not found.');

    const { row } = found;
    const merged: PatientInsuranceInput = {
      insurance_type: row.insuranceType,
      carrier_id: input.carrier_id,
      ...(input.carrier_name ? { carrier_name: input.carrier_name } : {}),
      member_id: input.member_id,
      ...(input.group_id ? { group_id: input.group_id } : {}),
      ...(row.subscriberName ? { policyholder_name: row.subscriberName } : {}),
      // The profile now asks this, per the spec; it is required there.
      relationship: input.relationship,
    };

    // A photo id must be one of the caller's own insurance card uploads, so an
    // id lifted from somebody else's request cannot be attached here.
    if (input.card_media_id && input.card_media_id !== row.cardFrontMediaId) {
      const photo = await ownedFile(tx, ctx.session!.userId, input.card_media_id, 'insurance_card');
      if (!photo) {
        const message = 'That card photo was not recognised. Upload it again.';
        throw new ApiError('VALIDATION_FAILED', message, { details: [{ path: 'insurance.card_media_id', message }] });
      }
    }

    const carrier = await resolveCarrier(tx, merged);
    return writeUpdate(
      tx,
      ctx,
      row.id,
      { ...toValues(merged, carrier), cardFrontMediaId: input.card_media_id },
      carrier,
    );
  },
};

async function writeUpdate(
  tx: Tx,
  ctx: RequestContext,
  id: string,
  values: ReturnType<typeof toValues> & { cardFrontMediaId?: string | null },
  carrier: Carrier,
): Promise<SavedInsurance> {
  const [row] = await tx
    .update(patientInsurance)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(patientInsurance.id, id))
    .returning();
  if (!row) throw ApiError.internal('Could not save your insurance.');

  await recordAudit(tx, ctx, {
    action: 'patient.insurance.updated',
    resourceType: 'patient_insurance',
    resourceId: row.id,
    metadata: { insurance_type: row.insuranceType, carrier_id: row.carrierId },
  });

  return toView(row, carrier.id ? carrier.name : null);
}

/** A directory carrier must exist and still be listed. A carrier that is not listed is kept by name. */
async function resolveCarrier(tx: Tx, input: PatientInsuranceInput): Promise<Carrier> {
  if (!input.carrier_id) return { id: null, name: input.carrier_name!.replace(/\s+/g, ' ') };

  const [carrier] = await tx
    .select({ id: insuranceCarriers.id, name: insuranceCarriers.name })
    .from(insuranceCarriers)
    .where(and(eq(insuranceCarriers.id, input.carrier_id), eq(insuranceCarriers.isActive, true)))
    .limit(1);

  if (!carrier) {
    const message = 'That carrier is no longer listed. Choose another, or pick "My carrier isn’t listed".';
    throw new ApiError('VALIDATION_FAILED', message, { details: [{ path: 'carrier_id', message }] });
  }
  return carrier;
}

function toValues(input: PatientInsuranceInput, carrier: Carrier) {
  // Stored without spaces, so "1155 5658 8ula" and "115556588ULA" are one number with one last four.
  const memberId = compact(input.member_id);
  const groupId = input.group_id ? compact(input.group_id) : null;

  return {
    insuranceType: input.insurance_type,
    carrierId: carrier.id,
    carrierNameRaw: carrier.id ? null : carrier.name,
    memberIdEncrypted: encryptField(memberId),
    memberIdLast4: last4(memberId),
    groupNumberEncrypted: encryptOptional(groupId),
    subscriberName: input.policyholder_name ? tidy(input.policyholder_name) : null,
    subscriberRelationship: input.relationship,
  };
}

function toView(row: Row, directoryName: string | null): SavedInsurance {
  return {
    id: row.id,
    insurance_type: row.insuranceType,
    carrier: { id: row.carrierId, name: directoryName ?? row.carrierNameRaw ?? 'Insurance carrier' },
    member_id_last4: row.memberIdLast4,
    group_id: decryptOptional(row.groupNumberEncrypted),
    policyholder_name: row.subscriberName,
    relationship: row.subscriberRelationship as Relationship | null,
    is_primary: row.isPrimary,
    card_media_id: row.cardFrontMediaId,
    updated_at: row.updatedAt.toISOString(),
  };
}

function sameCarrier(row: Row, values: ReturnType<typeof toValues>): boolean {
  if (row.carrierId !== values.carrierId) return false;
  if (values.carrierId) return true;
  return (row.carrierNameRaw ?? '').toLowerCase() === (values.carrierNameRaw ?? '').toLowerCase();
}

/** "1155 56588-ula" and "115556588ULA" are the same card. */
function comparable(value: string): string {
  return value.replace(/[\s-]/g, '').toUpperCase();
}

function compact(value: string): string {
  return value.replace(/\s+/g, '').toUpperCase();
}

function tidy(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

async function ownPatientId(tx: Tx, ctx: RequestContext): Promise<string> {
  const userId = ctx.session?.userId;
  if (!userId) throw ApiError.unauthenticated();

  const [patient] = await tx
    .select({ id: patients.id })
    .from(patients)
    .where(and(eq(patients.userId, userId), isNull(patients.deletedAt)))
    .limit(1);
  if (!patient) throw ApiError.notFound('No patient record for this account.');

  return patient.id;
}

/** A wrong or malformed id, or someone else's card, all read as not found. */
async function findOwn(tx: Tx, patientId: string, id: string) {
  if (!UUID.test(id)) return null;

  const [found] = await tx
    .select({ row: patientInsurance, carrierName: insuranceCarriers.name })
    .from(patientInsurance)
    .leftJoin(insuranceCarriers, eq(insuranceCarriers.id, patientInsurance.carrierId))
    .where(
      and(
        eq(patientInsurance.id, id),
        eq(patientInsurance.patientId, patientId),
        isNull(patientInsurance.deletedAt),
      ),
    )
    .limit(1);

  return found ?? null;
}
