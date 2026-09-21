import { relations } from 'drizzle-orm';
import {
  boolean,
  date,
  doublePrecision,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { pk, softDelete, timestamps } from './_shared';
import { accountStatusEnum, insuranceTypeEnum } from './enums';
import { users } from './identity';
import { insuranceCarriers, insurancePlans } from './insurance';
import { facilities, organizations } from './organizations';

/**
 * PHI boundary.
 *
 * A patient is a platform-level record, not a tenant one -- the same person
 * books across many facilities and must not be duplicated per office. An
 * organization therefore gets no blanket read on this table; its policy grants
 * access only where an appointment ties that patient to the org. See
 * drizzle/sql/rls.sql, policy `patients_org_via_appointment`.
 *
 * IA: 3. Patient Account
 */
export const patients = pgTable(
  'patients',
  {
    id: pk(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    status: accountStatusEnum('status').notNull().default('active'),

    /** IA: 3. Patient Profile > Personal Details */
    firstName: varchar('first_name', { length: 100 }).notNull(),
    middleName: varchar('middle_name', { length: 100 }),
    lastName: varchar('last_name', { length: 100 }).notNull(),
    preferredName: varchar('preferred_name', { length: 100 }),
    dateOfBirth: date('date_of_birth'),
    gender: varchar('gender', { length: 20 }),
    languages: jsonb('languages').$type<string[]>(),

    /** IA: 3. Patient Profile > Contact Details */
    email: varchar('email', { length: 320 }),
    phone: varchar('phone', { length: 20 }),

    /**
     * Where this person is looking for care -- the Location field on signup,
     * filled by Google Places autocomplete.
     *
     * Deliberately not a `patient_addresses` row: that table holds mailing
     * addresses, which the IA collects later during booking (2. Patient
     * Booking > Almost There > Address). This is coarser -- usually a city --
     * and exists to seed the marketplace's distance sort.
     */
    locationPlaceId: varchar('location_place_id', { length: 255 }),
    locationLabel: varchar('location_label', { length: 300 }),
    locationLatitude: doublePrecision('location_latitude'),
    locationLongitude: doublePrecision('location_longitude'),

    /**
     * Set when the record was created by staff or an import rather than by the
     * person themself; such a record can later be claimed and merged.
     */
    isGuestRecord: boolean('is_guest_record').notNull().default(false),
    mergedIntoPatientId: uuid('merged_into_patient_id'),

    ...timestamps,
    ...softDelete,
  },
  (t) => [
    index('patients_user_idx').on(t.userId),
    index('patients_name_dob_idx').on(t.lastName, t.firstName, t.dateOfBirth),
    index('patients_phone_idx').on(t.phone),
    index('patients_email_idx').on(t.email),
  ],
);

/** IA: 3. Patient Dashboard > Saved Address; 2. Patient Booking > Almost There > Address */
export const patientAddresses = pgTable(
  'patient_addresses',
  {
    id: pk(),
    patientId: uuid('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'cascade' }),
    label: varchar('label', { length: 60 }),
    addressLine1: varchar('address_line1', { length: 200 }).notNull(),
    addressLine2: varchar('address_line2', { length: 200 }),
    city: varchar('city', { length: 120 }).notNull(),
    state: varchar('state', { length: 2 }).notNull(),
    postalCode: varchar('postal_code', { length: 12 }).notNull(),
    countryCode: varchar('country_code', { length: 2 }).notNull().default('US'),
    /** Populated by Google Address Autocomplete. IA: 16. Shared Components */
    googlePlaceId: varchar('google_place_id', { length: 255 }),
    isDefault: boolean('is_default').notNull().default(false),
    ...timestamps,
    ...softDelete,
  },
  (t) => [index('patient_addresses_patient_idx').on(t.patientId)],
);

/**
 * IA: 3. Patient Dashboard > Saved Insurance.
 * `memberIdEncrypted` and `groupNumberEncrypted` hold app-layer ciphertext --
 * see src/server/security/phi.ts. Never store these in the clear.
 */
export const patientInsurance = pgTable(
  'patient_insurance',
  {
    id: pk(),
    patientId: uuid('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'cascade' }),
    carrierId: uuid('carrier_id').references(() => insuranceCarriers.id, { onDelete: 'set null' }),
    planId: uuid('plan_id').references(() => insurancePlans.id, { onDelete: 'set null' }),
    /** What the patient typed, when it matched no directory entry. */
    carrierNameRaw: varchar('carrier_name_raw', { length: 200 }),
    /** Health or dental. Chosen by the patient before any card is read, never inferred from the card. */
    insuranceType: insuranceTypeEnum('insurance_type').notNull(),

    memberIdEncrypted: text('member_id_encrypted'),
    groupNumberEncrypted: text('group_number_encrypted'),
    /** Last 4 of the member ID, for staff to confirm a card without decrypting. */
    memberIdLast4: varchar('member_id_last4', { length: 4 }),

    subscriberName: varchar('subscriber_name', { length: 200 }),
    subscriberRelationship: varchar('subscriber_relationship', { length: 40 }),
    subscriberDateOfBirth: date('subscriber_date_of_birth'),

    cardFrontMediaId: uuid('card_front_media_id'),
    cardBackMediaId: uuid('card_back_media_id'),

    isPrimary: boolean('is_primary').notNull().default(true),
    effectiveOn: date('effective_on'),
    expiresOn: date('expires_on'),
    ...timestamps,
    ...softDelete,
  },
  (t) => [index('patient_insurance_patient_idx').on(t.patientId)],
);

/**
 * IA: 3. Patient Account > Dependents.
 * A guardian books on behalf of a dependent, who is itself a patient record so
 * the dependent can own appointments, insurance and history in their own right.
 */
export const patientDependents = pgTable(
  'patient_dependents',
  {
    id: pk(),
    guardianPatientId: uuid('guardian_patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'cascade' }),
    dependentPatientId: uuid('dependent_patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'cascade' }),
    /**
     * Denormalised from `patients.user_id` of the guardian, and load-bearing:
     * it lets the RLS policy on this table answer "is this mine?" without
     * reading `patients`. Without it the two policies reference each other and
     * Postgres raises "infinite recursion detected in policy". Kept in step by
     * the trigger in drizzle/sql/rls.sql.
     */
    guardianUserId: uuid('guardian_user_id'),
    relationship: varchar('relationship', { length: 40 }).notNull(),
    canBookOnBehalf: boolean('can_book_on_behalf').notNull().default(true),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    uniqueIndex('patient_dependents_unique').on(t.guardianPatientId, t.dependentPatientId),
    index('patient_dependents_dependent_idx').on(t.dependentPatientId),
    index('patient_dependents_guardian_user_idx').on(t.guardianUserId),
  ],
);

/**
 * Maps a patient to their chart in a facility's practice-management system.
 * IA: 15. External Services > Integrations > OpenDental
 */
export const patientFacilityRecords = pgTable(
  'patient_facility_records',
  {
    id: pk(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    facilityId: uuid('facility_id')
      .notNull()
      .references(() => facilities.id, { onDelete: 'cascade' }),
    patientId: uuid('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'cascade' }),
    /** e.g. OpenDental PatNum */
    externalSystem: varchar('external_system', { length: 40 }).notNull(),
    externalPatientId: varchar('external_patient_id', { length: 80 }).notNull(),
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('patient_facility_records_unique').on(
      t.facilityId,
      t.externalSystem,
      t.externalPatientId,
    ),
    index('patient_facility_records_patient_idx').on(t.patientId),
  ],
);

export const patientsRelations = relations(patients, ({ one, many }) => ({
  user: one(users, { fields: [patients.userId], references: [users.id] }),
  addresses: many(patientAddresses),
  insurance: many(patientInsurance),
}));

export const patientInsuranceRelations = relations(patientInsurance, ({ one }) => ({
  patient: one(patients, { fields: [patientInsurance.patientId], references: [patients.id] }),
  carrier: one(insuranceCarriers, {
    fields: [patientInsurance.carrierId],
    references: [insuranceCarriers.id],
  }),
  plan: one(insurancePlans, { fields: [patientInsurance.planId], references: [insurancePlans.id] }),
}));

export type Patient = typeof patients.$inferSelect;
export type NewPatient = typeof patients.$inferInsert;
