import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  doublePrecision,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { pk, softDelete, timestamps } from './_shared';
import { accountStatusEnum, membershipScopeEnum, officeTypeEnum } from './enums';
import { users } from './identity';

/**
 * The tenant root. Every tenant-scoped table carries `organization_id` and is
 * guarded by a row-level-security policy comparing it to the
 * `app.current_org_id` GUC. See drizzle/sql/rls.sql.
 *
 * IA: 14. Control Center > User Management > Organizations
 */
export const organizations = pgTable(
  'organizations',
  {
    id: pk(),
    name: varchar('name', { length: 200 }).notNull(),
    slug: varchar('slug', { length: 120 }).notNull().unique(),
    officeType: officeTypeEnum('office_type').notNull().default('other'),
    status: accountStatusEnum('status').notNull().default('pending_review'),

    /** IA: 5. Office Onboarding > Practice Details */
    legalName: varchar('legal_name', { length: 200 }),
    taxId: varchar('tax_id', { length: 32 }),
    groupNpi: varchar('group_npi', { length: 10 }),
    website: text('website'),
    supportEmail: varchar('support_email', { length: 320 }),
    supportPhone: varchar('support_phone', { length: 20 }),

    /** IA: 15. External Services > Payments > Stripe */
    stripeCustomerId: varchar('stripe_customer_id', { length: 64 }).unique(),

    ownerUserId: uuid('owner_user_id').references(() => users.id, { onDelete: 'set null' }),

    ...timestamps,
    ...softDelete,
  },
  (t) => [
    index('organizations_status_idx').on(t.status),
    index('organizations_office_type_idx').on(t.officeType),
  ],
);

/**
 * A physical location. The marketplace searches facilities, appointments are
 * booked at facilities, and the dashboard's Facility Switcher pivots on them.
 *
 * IA: 1. Public Marketplace > Facility Profile; 5. Office Onboarding > Facility Setup
 */
export const facilities = pgTable(
  'facilities',
  {
    id: pk(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 200 }).notNull(),
    slug: varchar('slug', { length: 140 }).notNull(),
    status: accountStatusEnum('status').notNull().default('pending_review'),
    officeType: officeTypeEnum('office_type').notNull().default('other'),

    /** IA: 1. Public Marketplace > Facility Profile > Location Details */
    addressLine1: varchar('address_line1', { length: 200 }),
    addressLine2: varchar('address_line2', { length: 200 }),
    city: varchar('city', { length: 120 }),
    state: varchar('state', { length: 2 }),
    postalCode: varchar('postal_code', { length: 12 }),
    countryCode: varchar('country_code', { length: 2 }).notNull().default('US'),
    /** Resolved via Google Address Autocomplete; drives Distance filter + Map Preview. */
    googlePlaceId: varchar('google_place_id', { length: 255 }),
    latitude: doublePrecision('latitude'),
    longitude: doublePrecision('longitude'),
    timezone: varchar('timezone', { length: 64 }).notNull().default('America/New_York'),

    phone: varchar('phone', { length: 20 }),
    email: varchar('email', { length: 320 }),
    /** IA: 1. Search Results > Practice Style */
    practiceStyle: varchar('practice_style', { length: 60 }),
    about: text('about'),
    /** Denormalised marketplace ranking inputs, refreshed by a rollup job. */
    ratingAverage: doublePrecision('rating_average'),
    ratingCount: doublePrecision('rating_count').notNull().default(0),
    isPubliclyListed: boolean('is_publicly_listed').notNull().default(false),

    ...timestamps,
    ...softDelete,
  },
  (t) => [
    uniqueIndex('facilities_org_slug_unique').on(t.organizationId, t.slug),
    index('facilities_org_idx').on(t.organizationId),
    index('facilities_geo_idx').on(t.latitude, t.longitude),
    index('facilities_listed_idx')
      .on(t.isPubliclyListed, t.status)
      .where(sql`deleted_at is null`),
  ],
);

/**
 * Role definitions. `organizationId` null means a CareOndeck system role
 * (patient, provider, internal admin). Tenants may define their own on top.
 *
 * IA: 12. Settings > Roles
 */
export const roles = pgTable(
  'roles',
  {
    id: pk(),
    organizationId: uuid('organization_id').references(() => organizations.id, {
      onDelete: 'cascade',
    }),
    key: varchar('key', { length: 60 }).notNull(),
    name: varchar('name', { length: 120 }).notNull(),
    description: text('description'),
    isSystem: boolean('is_system').notNull().default(false),
    ...timestamps,
  },
  // nullsNotDistinct: a system role has organization_id null, and without it
  // Postgres treats every such row as unique -- the seed would duplicate them
  // on each run, and ON CONFLICT would never match.
  (t) => [
    unique('roles_scope_key_unique').on(t.organizationId, t.key).nullsNotDistinct(),
  ],
);

/**
 * The permission catalogue -- one row per capability the UI can gate on.
 * IA: 12. Settings > Permission Matrix
 */
export const permissions = pgTable('permissions', {
  key: varchar('key', { length: 80 }).primaryKey(),
  resource: varchar('resource', { length: 60 }).notNull(),
  action: varchar('action', { length: 40 }).notNull(),
  description: text('description'),
  ...timestamps,
});

export const rolePermissions = pgTable(
  'role_permissions',
  {
    id: pk(),
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    permissionKey: varchar('permission_key', { length: 80 })
      .notNull()
      .references(() => permissions.key, { onDelete: 'cascade' }),
    ...timestamps,
  },
  (t) => [uniqueIndex('role_permissions_unique').on(t.roleId, t.permissionKey)],
);

/**
 * Binds a user to a tenant with a role. This table is the source of truth for
 * "which orgs may this user see", so the RLS policy on every other table
 * ultimately resolves through it.
 *
 * IA: 12. Settings > Staff; 14. Control Center > User Management > Staff
 */
export const memberships = pgTable(
  'memberships',
  {
    id: pk(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    /** Facility-scoped members only see that facility's data. */
    scope: membershipScopeEnum('scope').notNull().default('organization'),
    facilityId: uuid('facility_id').references(() => facilities.id, { onDelete: 'cascade' }),
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'restrict' }),
    status: accountStatusEnum('status').notNull().default('active'),
    title: varchar('title', { length: 120 }),
    invitedByUserId: uuid('invited_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    invitedAt: timestamp('invited_at', { withTimezone: true }),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    // Two partial indexes rather than one composite: Postgres treats NULLs as
    // distinct, so a plain unique on (user, org, facility) would happily allow
    // duplicate org-wide memberships.
    uniqueIndex('memberships_user_org_wide_unique')
      .on(t.userId, t.organizationId)
      .where(sql`facility_id is null`),
    uniqueIndex('memberships_user_facility_unique')
      .on(t.userId, t.facilityId)
      .where(sql`facility_id is not null`),
    index('memberships_org_idx').on(t.organizationId),
    index('memberships_user_idx').on(t.userId),
  ],
);

/** Global taxonomy. IA: 1. Public Marketplace > Homepage > Browse by Specialty */
export const specialties = pgTable(
  'specialties',
  {
    id: pk(),
    key: varchar('key', { length: 80 }).notNull().unique(),
    name: varchar('name', { length: 140 }).notNull(),
    /** Taxonomy code from NPPES, used to map NPI lookups onto our list. */
    taxonomyCode: varchar('taxonomy_code', { length: 20 }),
    parentId: uuid('parent_id'),
    /** IA: 1. Homepage > SEO Sections */
    seoSlug: varchar('seo_slug', { length: 140 }).unique(),
    seoTitle: varchar('seo_title', { length: 200 }),
    seoDescription: text('seo_description'),
    heroImageUrl: text('hero_image_url'),
    displayOrder: doublePrecision('display_order').notNull().default(0),
    isFeatured: boolean('is_featured').notNull().default(false),
    ...timestamps,
  },
  (t) => [index('specialties_featured_idx').on(t.isFeatured, t.displayOrder)],
);

/** Services a facility offers. IA: 1. Facility Profile > Services */
export const facilityServices = pgTable(
  'facility_services',
  {
    id: pk(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    facilityId: uuid('facility_id')
      .notNull()
      .references(() => facilities.id, { onDelete: 'cascade' }),
    specialtyId: uuid('specialty_id').references(() => specialties.id, { onDelete: 'set null' }),
    name: varchar('name', { length: 160 }).notNull(),
    description: text('description'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    ...timestamps,
  },
  (t) => [index('facility_services_facility_idx').on(t.facilityId)],
);

export const organizationsRelations = relations(organizations, ({ many, one }) => ({
  facilities: many(facilities),
  memberships: many(memberships),
  owner: one(users, { fields: [organizations.ownerUserId], references: [users.id] }),
}));

export const facilitiesRelations = relations(facilities, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [facilities.organizationId],
    references: [organizations.id],
  }),
  services: many(facilityServices),
}));

export const membershipsRelations = relations(memberships, ({ one }) => ({
  user: one(users, { fields: [memberships.userId], references: [users.id] }),
  organization: one(organizations, {
    fields: [memberships.organizationId],
    references: [organizations.id],
  }),
  facility: one(facilities, { fields: [memberships.facilityId], references: [facilities.id] }),
  role: one(roles, { fields: [memberships.roleId], references: [roles.id] }),
}));

export type Organization = typeof organizations.$inferSelect;
export type Facility = typeof facilities.$inferSelect;
export type Membership = typeof memberships.$inferSelect;
