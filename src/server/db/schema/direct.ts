import { relations, sql } from 'drizzle-orm';
import {
  boolean,
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
import { installStatusEnum } from './enums';
import { users } from './identity';
import { facilities, organizations } from './organizations';
import { providers } from './providers';


export const directPages = pgTable(
  'direct_pages',
  {
    id: pk(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    /** Null = an org-wide page with a Location Selector. */
    facilityId: uuid('facility_id').references(() => facilities.id, { onDelete: 'cascade' }),

    slug: varchar('slug', { length: 140 }).notNull().unique(),
    privateToken: varchar('private_token', { length: 48 }).notNull().unique(),

    isPublished: boolean('is_published').notNull().default(false),

    branding: jsonb('branding')
      .$type<{
        logoUrl?: string;
        primaryColor?: string;
        accentColor?: string;
        headline?: string;
        subheadline?: string;
        showReviews?: boolean;
        showProviderPhotos?: boolean;
      }>()
      .notNull()
      .default(sql`'{}'::jsonb`),

    /** Which steps the flow shows. IA: 8. Direct > Booking Flow */
    flowConfig: jsonb('flow_config')
      .$type<{
        askNewOrExistingPatient?: boolean;
        allowProviderSelection?: boolean;
        allowLocationSelection?: boolean;
        requireInsurance?: boolean;
        successMessage?: string;
      }>()
      .notNull()
      .default(sql`'{}'::jsonb`),

    ...timestamps,
    ...softDelete,
  },
  (t) => [index('direct_pages_org_idx').on(t.organizationId)],
);

/** Restricts a Direct page to a subset of providers. IA: 8. Provider Selector */
export const directPageProviders = pgTable(
  'direct_page_providers',
  {
    id: pk(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    directPageId: uuid('direct_page_id')
      .notNull()
      .references(() => directPages.id, { onDelete: 'cascade' }),
    providerId: uuid('provider_id')
      .notNull()
      .references(() => providers.id, { onDelete: 'cascade' }),
    ...timestamps,
  },
  (t) => [uniqueIndex('direct_page_providers_unique').on(t.directPageId, t.providerId)],
);


export const directInstalls = pgTable(
  'direct_installs',
  {
    id: pk(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    directPageId: uuid('direct_page_id')
      .notNull()
      .references(() => directPages.id, { onDelete: 'cascade' }),
    /** Sent with every embed request; identifies and authorises the widget. */
    embedKey: varchar('embed_key', { length: 48 }).notNull().unique(),
    /** Origins the widget may be served to. Empty = any, which we discourage. */
    allowedOrigins: jsonb('allowed_origins')
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    status: installStatusEnum('status').notNull().default('not_started'),
    firstSeenAt: timestamp('first_seen_at', { withTimezone: true }),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
    detectedUrl: text('detected_url'),
    doneForYouRequestedAt: timestamp('done_for_you_requested_at', { withTimezone: true }),
    doneForYouCompletedAt: timestamp('done_for_you_completed_at', { withTimezone: true }),
    doneForYouAssigneeUserId: uuid('done_for_you_assignee_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    notes: text('notes'),
    ...timestamps,
  },
  (t) => [index('direct_installs_org_idx').on(t.organizationId, t.status)],
);

export const directPagesRelations = relations(directPages, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [directPages.organizationId],
    references: [organizations.id],
  }),
  facility: one(facilities, { fields: [directPages.facilityId], references: [facilities.id] }),
  allowedProviders: many(directPageProviders),
  installs: many(directInstalls),
}));

export type DirectPage = typeof directPages.$inferSelect;
export type DirectInstall = typeof directInstalls.$inferSelect;
