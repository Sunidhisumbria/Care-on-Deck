import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { pk, softDelete, timestamps } from './_shared';
import { accountStatusEnum, verificationStatusEnum } from './enums';
import { users } from './identity';
import { facilities, organizations, specialties } from './organizations';

/**
 * A clinician. Tenant-scoped to the organization that currently holds them --
 * moving a provider between organizations goes through `providerTransfers`
 * (IA: 14. Control Center > Provider Transfer) rather than a direct update.
 *
 * IA: 1. Public Marketplace > Provider Profile; 4. Provider Onboarding
 */
export const providers = pgTable(
  'providers',
  {
    id: pk(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    /** Null until the clinician claims their profile and signs in. */
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    status: accountStatusEnum('status').notNull().default('pending_review'),

    /** IA: 4. Provider Onboarding > NPI Lookup (NPPES NPI Registry) */
    npi: varchar('npi', { length: 10 }),
    npiVerificationStatus: verificationStatusEnum('npi_verification_status')
      .notNull()
      .default('unverified'),
    npiVerifiedAt: timestamp('npi_verified_at', { withTimezone: true }),
    /** Raw NPPES payload kept for audit of what we verified against. */
    npiRegistrySnapshot: jsonb('npi_registry_snapshot').$type<Record<string, unknown>>(),

    firstName: varchar('first_name', { length: 100 }).notNull(),
    middleName: varchar('middle_name', { length: 100 }),
    lastName: varchar('last_name', { length: 100 }).notNull(),
    /** IA: 1. Provider Profile > Credentials -- e.g. DDS, MD, DO */
    credentials: varchar('credentials', { length: 60 }),
    displayName: varchar('display_name', { length: 220 }),
    slug: varchar('slug', { length: 160 }),

    gender: varchar('gender', { length: 20 }),
    /** IA: 1. Search Results > Filters > Language */
    languages: jsonb('languages').$type<string[]>().notNull().default(sql`'[]'::jsonb`),

    bio: text('bio'),
    headshotMediaId: uuid('headshot_media_id'),
    /**
     * IA: 1. Provider Profile > Credentials. Up to two uploaded certificates,
     * in the order the provider gave them. Media ids in the practice's store.
     */
    certificateMediaIds: jsonb('certificate_media_ids').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    yearsExperience: integer('years_experience'),

    ratingAverage: doublePrecision('rating_average'),
    ratingCount: integer('rating_count').notNull().default(0),
    isPubliclyListed: boolean('is_publicly_listed').notNull().default(false),
    acceptingNewPatients: boolean('accepting_new_patients').notNull().default(true),

    ...timestamps,
    ...softDelete,
  },
  (t) => [
    uniqueIndex('providers_org_npi_unique')
      .on(t.organizationId, t.npi)
      .where(sql`npi is not null and deleted_at is null`),
    uniqueIndex('providers_org_slug_unique')
      .on(t.organizationId, t.slug)
      .where(sql`slug is not null`),
    index('providers_org_idx').on(t.organizationId),
    index('providers_listed_idx')
      .on(t.isPubliclyListed, t.status)
      .where(sql`deleted_at is null`),
  ],
);

/**
 * Where a provider practices. IA: 1. Provider Profile > Locations
 * A provider can hold hours at several facilities inside the organization.
 */
export const providerFacilities = pgTable(
  'provider_facilities',
  {
    id: pk(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    providerId: uuid('provider_id')
      .notNull()
      .references(() => providers.id, { onDelete: 'cascade' }),
    facilityId: uuid('facility_id')
      .notNull()
      .references(() => facilities.id, { onDelete: 'cascade' }),
    isPrimary: boolean('is_primary').notNull().default(false),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('provider_facilities_unique').on(t.providerId, t.facilityId),
    index('provider_facilities_facility_idx').on(t.facilityId),
  ],
);

/** IA: 1. Provider Profile > Specialty */
export const providerSpecialties = pgTable(
  'provider_specialties',
  {
    id: pk(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    providerId: uuid('provider_id')
      .notNull()
      .references(() => providers.id, { onDelete: 'cascade' }),
    specialtyId: uuid('specialty_id')
      .notNull()
      .references(() => specialties.id, { onDelete: 'cascade' }),
    isPrimary: boolean('is_primary').notNull().default(false),
    ...timestamps,
  },
  (t) => [uniqueIndex('provider_specialties_unique').on(t.providerId, t.specialtyId)],
);

/** IA: 4. Provider Onboarding > License Verification */
export const providerLicenses = pgTable(
  'provider_licenses',
  {
    id: pk(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    providerId: uuid('provider_id')
      .notNull()
      .references(() => providers.id, { onDelete: 'cascade' }),
    state: varchar('state', { length: 2 }).notNull(),
    licenseNumber: varchar('license_number', { length: 60 }).notNull(),
    issuedOn: date('issued_on'),
    expiresOn: date('expires_on'),
    status: verificationStatusEnum('status').notNull().default('pending'),
    verifiedByUserId: uuid('verified_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    documentMediaId: uuid('document_media_id'),
    notes: text('notes'),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('provider_licenses_unique').on(t.providerId, t.state, t.licenseNumber),
    index('provider_licenses_expiry_idx').on(t.expiresOn),
  ],
);

export const providersRelations = relations(providers, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [providers.organizationId],
    references: [organizations.id],
  }),
  user: one(users, { fields: [providers.userId], references: [users.id] }),
  facilities: many(providerFacilities),
  specialties: many(providerSpecialties),
  licenses: many(providerLicenses),
}));

export const providerFacilitiesRelations = relations(providerFacilities, ({ one }) => ({
  provider: one(providers, { fields: [providerFacilities.providerId], references: [providers.id] }),
  facility: one(facilities, {
    fields: [providerFacilities.facilityId],
    references: [facilities.id],
  }),
}));

export type Provider = typeof providers.$inferSelect;
export type NewProvider = typeof providers.$inferInsert;
