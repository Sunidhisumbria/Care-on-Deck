import { relations, sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  date,
  index,
  inet,
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
import { accountStatusEnum, campaignStatusEnum } from './enums';
import { users } from './identity';
import { facilities, organizations, specialties } from './organizations';
import { providers } from './providers';

/**
 * Pulse is the paid-acquisition side: an office (or a marketing agency acting
 * for one) buys placement and pays per confirmed appointment.
 *
 * Agencies are platform-level -- one agency serves many organizations -- so
 * this table carries no organization_id. Their reach is defined by
 * `agencyClients`, which the RLS policies join through.
 *
 * IA: 9. Pulse > Agencies
 */
export const agencies = pgTable(
  'agencies',
  {
    id: pk(),
    name: varchar('name', { length: 200 }).notNull(),
    slug: varchar('slug', { length: 160 }).notNull().unique(),
    status: accountStatusEnum('status').notNull().default('pending_review'),
    /** IA: 9. Add Agency > Agency Type -- see AGENCY_TYPES. */
    agencyType: varchar('agency_type', { length: 40 }),
    contactName: varchar('contact_name', { length: 200 }),
    contactEmail: varchar('contact_email', { length: 320 }),
    contactPhone: varchar('contact_phone', { length: 20 }),
    website: text('website'),
    notes: text('notes'),
    ...timestamps,
    ...softDelete,
  },
  (t) => [index('agencies_status_idx').on(t.status)],
);

/** Which organizations an agency may manage campaigns for. */
export const agencyClients = pgTable(
  'agency_clients',
  {
    id: pk(),
    agencyId: uuid('agency_id')
      .notNull()
      .references(() => agencies.id, { onDelete: 'cascade' }),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    status: accountStatusEnum('status').notNull().default('active'),
    startedOn: date('started_on'),
    endedOn: date('ended_on'),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('agency_clients_unique').on(t.agencyId, t.organizationId),
    index('agency_clients_org_idx').on(t.organizationId),
  ],
);

/** IA: 9. Pulse > Agencies > Engagement History */
export const agencyEngagements = pgTable(
  'agency_engagements',
  {
    id: pk(),
    agencyId: uuid('agency_id')
      .notNull()
      .references(() => agencies.id, { onDelete: 'cascade' }),
    organizationId: uuid('organization_id').references(() => organizations.id, {
      onDelete: 'cascade',
    }),
    /** note | call | meeting | contract_signed | campaign_launched | churned */
    kind: varchar('kind', { length: 40 }).notNull(),
    summary: text('summary'),
    actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
    ...timestamps,
  },
  (t) => [index('agency_engagements_agency_idx').on(t.agencyId, t.occurredAt)],
);

/** IA: 9. Pulse > Campaigns */
export const campaigns = pgTable(
  'campaigns',
  {
    id: pk(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    facilityId: uuid('facility_id').references(() => facilities.id, { onDelete: 'cascade' }),
    /** Set when an agency runs the campaign on the org's behalf. */
    agencyId: uuid('agency_id').references(() => agencies.id, { onDelete: 'set null' }),

    name: varchar('name', { length: 200 }).notNull(),
    /** IA: 9. Create Campaign > Campaign / Promotion Type -- see CAMPAIGN_TYPES. */
    campaignType: varchar('campaign_type', { length: 40 }),
    description: text('description'),
    status: campaignStatusEnum('status').notNull().default('draft'),

    /** Targeting. Geography is a radius around the facility unless overridden. */
    targetSpecialtyId: uuid('target_specialty_id').references(() => specialties.id, {
      onDelete: 'set null',
    }),
    targetProviderId: uuid('target_provider_id').references(() => providers.id, {
      onDelete: 'set null',
    }),
    targetRadiusMiles: integer('target_radius_miles'),
    targetPostalCodes: jsonb('target_postal_codes')
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),

    /** Budget in cents. `dailyBudgetCents` null = pace against the total only. */
    totalBudgetCents: integer('total_budget_cents'),
    dailyBudgetCents: integer('daily_budget_cents'),
    /** What the office agreed to pay per confirmed appointment. */
    costPerAppointmentCents: integer('cost_per_appointment_cents'),
    /** IA: 14. Pricing Configuration > Sponsored Placement */
    isSponsoredPlacement: boolean('is_sponsored_placement').notNull().default(false),

    startsOn: date('starts_on'),
    endsOn: date('ends_on'),

    createdByUserId: uuid('created_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    index('campaigns_org_status_idx').on(t.organizationId, t.status),
    index('campaigns_agency_idx').on(t.agencyId),
    index('campaigns_window_idx').on(t.startsOn, t.endsOn),
  ],
);

/**
 * A shareable URL that attributes traffic to a campaign.
 * IA: 9. Pulse > Campaigns > Tracking Link
 */
export const campaignTrackingLinks = pgTable(
  'campaign_tracking_links',
  {
    id: pk(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    campaignId: uuid('campaign_id')
      .notNull()
      .references(() => campaigns.id, { onDelete: 'cascade' }),
    /** Short code -- careondeck.com/p/{code} */
    code: varchar('code', { length: 24 }).notNull().unique(),
    destinationUrl: text('destination_url').notNull(),
    label: varchar('label', { length: 140 }),
    utm: jsonb('utm').$type<Record<string, string>>(),
    isActive: boolean('is_active').notNull().default(true),
    ...timestamps,
  },
  (t) => [index('campaign_tracking_links_campaign_idx').on(t.campaignId)],
);

/**
 * Raw click stream. Retained short-term (see the retention job); the durable
 * numbers live in `campaignDailyMetrics`.
 */
export const campaignClicks = pgTable(
  'campaign_clicks',
  {
    id: pk(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    campaignId: uuid('campaign_id')
      .notNull()
      .references(() => campaigns.id, { onDelete: 'cascade' }),
    trackingLinkId: uuid('tracking_link_id').references(() => campaignTrackingLinks.id, {
      onDelete: 'set null',
    }),
    /** Anonymous visitor id set client-side; joins a click to a later booking. */
    visitorId: varchar('visitor_id', { length: 48 }),
    referrer: text('referrer'),
    userAgent: text('user_agent'),
    /** Truncated to /24 before insert -- we need geography, not identity. */
    ipAddress: inet('ip_address'),
    countryCode: varchar('country_code', { length: 2 }),
    isBillable: boolean('is_billable').notNull().default(true),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
    ...timestamps,
  },
  (t) => [
    index('campaign_clicks_campaign_occurred_idx').on(t.campaignId, t.occurredAt),
    index('campaign_clicks_visitor_idx').on(t.visitorId),
  ],
);

/**
 * The numbers behind Pulse Overview and Campaign Report.
 * IA: 9. Pulse > Pulse Overview (Spend, Clicks, Appointment Requests,
 * Confirmed Appointments, Cost Metrics)
 */
export const campaignDailyMetrics = pgTable(
  'campaign_daily_metrics',
  {
    id: pk(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    campaignId: uuid('campaign_id')
      .notNull()
      .references(() => campaigns.id, { onDelete: 'cascade' }),
    onDate: date('on_date').notNull(),
    impressions: integer('impressions').notNull().default(0),
    clicks: integer('clicks').notNull().default(0),
    appointmentRequests: integer('appointment_requests').notNull().default(0),
    confirmedAppointments: integer('confirmed_appointments').notNull().default(0),
    completedAppointments: integer('completed_appointments').notNull().default(0),
    spendCents: bigint('spend_cents', { mode: 'number' }).notNull().default(0),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('campaign_daily_metrics_unique').on(t.campaignId, t.onDate),
    index('campaign_daily_metrics_org_date_idx').on(t.organizationId, t.onDate),
  ],
);

export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [campaigns.organizationId],
    references: [organizations.id],
  }),
  facility: one(facilities, { fields: [campaigns.facilityId], references: [facilities.id] }),
  agency: one(agencies, { fields: [campaigns.agencyId], references: [agencies.id] }),
  trackingLinks: many(campaignTrackingLinks),
  dailyMetrics: many(campaignDailyMetrics),
}));

export const agenciesRelations = relations(agencies, ({ many }) => ({
  clients: many(agencyClients),
  engagements: many(agencyEngagements),
  campaigns: many(campaigns),
}));

export type Agency = typeof agencies.$inferSelect;
export type Campaign = typeof campaigns.$inferSelect;
export type CampaignDailyMetric = typeof campaignDailyMetrics.$inferSelect;
