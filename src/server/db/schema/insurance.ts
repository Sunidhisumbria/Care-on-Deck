import { relations } from 'drizzle-orm';
import {
  boolean,
  index,
  pgTable,
  text,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { pk, timestamps } from './_shared';
import { facilities, organizations } from './organizations';
import { providers } from './providers';

/**
 * The insurance directory is platform-global and curated by CareOndeck staff,
 * not by tenants -- so these four tables carry no organization_id.
 *
 * IA: 14. Control Center > Insurance Directory
 */
export const insuranceCarriers = pgTable(
  'insurance_carriers',
  {
    id: pk(),
    name: varchar('name', { length: 200 }).notNull(),
    slug: varchar('slug', { length: 160 }).notNull().unique(),
    payerId: varchar('payer_id', { length: 40 }),
    logoUrl: text('logo_url'),
    isActive: boolean('is_active').notNull().default(true),
    ...timestamps,
  },
  (t) => [index('insurance_carriers_active_idx').on(t.isActive)],
);

/** IA: 14. Control Center > Insurance Directory > Plans */
export const insurancePlans = pgTable(
  'insurance_plans',
  {
    id: pk(),
    carrierId: uuid('carrier_id')
      .notNull()
      .references(() => insuranceCarriers.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 200 }).notNull(),
    slug: varchar('slug', { length: 160 }).notNull(),
    /** PPO | HMO | EPO | DHMO | Medicare | Medicaid | ... */
    planType: varchar('plan_type', { length: 40 }),
    isActive: boolean('is_active').notNull().default(true),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('insurance_plans_carrier_slug_unique').on(t.carrierId, t.slug),
    index('insurance_plans_carrier_idx').on(t.carrierId),
  ],
);

/**
 * Alternate names patients type in ("BCBS", "Blue Cross"). Drives fuzzy
 * matching in the booking flow's Insurance step and in marketplace filters.
 *
 * IA: 14. Control Center > Insurance Directory > Aliases
 */
export const insuranceAliases = pgTable(
  'insurance_aliases',
  {
    id: pk(),
    carrierId: uuid('carrier_id').references(() => insuranceCarriers.id, { onDelete: 'cascade' }),
    planId: uuid('plan_id').references(() => insurancePlans.id, { onDelete: 'cascade' }),
    alias: varchar('alias', { length: 200 }).notNull(),
    ...timestamps,
  },
  (t) => [
    index('insurance_aliases_alias_idx').on(t.alias),
    index('insurance_aliases_carrier_idx').on(t.carrierId),
  ],
);

/** Where a carrier or plan is actually sold. IA: Insurance Directory > Regions */
export const insuranceRegions = pgTable(
  'insurance_regions',
  {
    id: pk(),
    carrierId: uuid('carrier_id')
      .notNull()
      .references(() => insuranceCarriers.id, { onDelete: 'cascade' }),
    planId: uuid('plan_id').references(() => insurancePlans.id, { onDelete: 'cascade' }),
    state: varchar('state', { length: 2 }).notNull(),
    countyFips: varchar('county_fips', { length: 5 }),
    ...timestamps,
  },
  (t) => [
    unique('insurance_regions_unique')
      .on(t.carrierId, t.planId, t.state, t.countyFips)
      .nullsNotDistinct(),
    index('insurance_regions_state_idx').on(t.state),
  ],
);

/**
 * What a facility accepts. Tenant-scoped, and the basis of the marketplace
 * Insurance filter. IA: 5. Office Onboarding > Insurance Setup
 */
export const facilityAcceptedPlans = pgTable(
  'facility_accepted_plans',
  {
    id: pk(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    facilityId: uuid('facility_id')
      .notNull()
      .references(() => facilities.id, { onDelete: 'cascade' }),
    carrierId: uuid('carrier_id')
      .notNull()
      .references(() => insuranceCarriers.id, { onDelete: 'cascade' }),
    /** Null means "all plans from this carrier". */
    planId: uuid('plan_id').references(() => insurancePlans.id, { onDelete: 'cascade' }),
    isInNetwork: boolean('is_in_network').notNull().default(true),
    notes: text('notes'),
    ...timestamps,
  },
  (t) => [
    // planId null means "all plans from this carrier"; nullsNotDistinct stops
    // that row being inserted twice.
    unique('facility_accepted_plans_unique')
      .on(t.facilityId, t.carrierId, t.planId)
      .nullsNotDistinct(),
    index('facility_accepted_plans_carrier_idx').on(t.carrierId),
  ],
);

/** IA: 4. Provider Onboarding > Insurance Setup */
export const providerAcceptedPlans = pgTable(
  'provider_accepted_plans',
  {
    id: pk(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    providerId: uuid('provider_id')
      .notNull()
      .references(() => providers.id, { onDelete: 'cascade' }),
    carrierId: uuid('carrier_id')
      .notNull()
      .references(() => insuranceCarriers.id, { onDelete: 'cascade' }),
    planId: uuid('plan_id').references(() => insurancePlans.id, { onDelete: 'cascade' }),
    isInNetwork: boolean('is_in_network').notNull().default(true),
    ...timestamps,
  },
  (t) => [
    unique('provider_accepted_plans_unique')
      .on(t.providerId, t.carrierId, t.planId)
      .nullsNotDistinct(),
  ],
);

export const insuranceCarriersRelations = relations(insuranceCarriers, ({ many }) => ({
  plans: many(insurancePlans),
  aliases: many(insuranceAliases),
  regions: many(insuranceRegions),
}));

export const insurancePlansRelations = relations(insurancePlans, ({ one }) => ({
  carrier: one(insuranceCarriers, {
    fields: [insurancePlans.carrierId],
    references: [insuranceCarriers.id],
  }),
}));

export type InsuranceCarrier = typeof insuranceCarriers.$inferSelect;
export type InsurancePlan = typeof insurancePlans.$inferSelect;
