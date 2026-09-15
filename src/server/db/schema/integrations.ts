import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { pk, timestamps } from './_shared';
import { integrationProviderEnum, integrationStatusEnum } from './enums';
import { facilities, organizations } from './organizations';

/**
 * A tenant's connection to an external system. Credentials are stored as
 * app-layer ciphertext (src/server/security/phi.ts) -- a database dump must not
 * be enough to log into a customer's practice-management system.
 *
 * IA: 15. External Services > Integrations > OpenDental
 */
export const integrationConnections = pgTable(
  'integration_connections',
  {
    id: pk(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    /** OpenDental is per-practice, so most connections are facility-scoped. */
    facilityId: uuid('facility_id').references(() => facilities.id, { onDelete: 'cascade' }),
    provider: integrationProviderEnum('provider').notNull(),
    status: integrationStatusEnum('status').notNull().default('disconnected'),

    /** Non-secret settings: base URL, clinic number, sync toggles. */
    config: jsonb('config')
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    credentialsEncrypted: text('credentials_encrypted'),

    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
    lastError: text('last_error'),
    lastErrorAt: timestamp('last_error_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    // facilityId null = an org-wide connection; only one of those may exist.
    unique('integration_connections_unique')
      .on(t.organizationId, t.facilityId, t.provider)
      .nullsNotDistinct(),
    index('integration_connections_status_idx').on(t.provider, t.status),
  ],
);

/** One row per sync attempt, so a failing OpenDental link is diagnosable. */
export const integrationSyncRuns = pgTable(
  'integration_sync_runs',
  {
    id: pk(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    connectionId: uuid('connection_id')
      .notNull()
      .references(() => integrationConnections.id, { onDelete: 'cascade' }),
    /** pull_appointments | push_appointment | pull_patients | ... */
    operation: varchar('operation', { length: 60 }).notNull(),
    /** running | succeeded | failed | partial */
    outcome: varchar('outcome', { length: 20 }).notNull().default('running'),
    recordsRead: integer('records_read').notNull().default(0),
    recordsWritten: integer('records_written').notNull().default(0),
    recordsFailed: integer('records_failed').notNull().default(0),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
    error: text('error'),
    ...timestamps,
  },
  (t) => [index('integration_sync_runs_connection_idx').on(t.connectionId, t.startedAt)],
);

/**
 * Transactional outbox for the Typesense search index. A facility or provider
 * write enqueues a job in the same transaction, and a worker drains it. This
 * is what keeps the marketplace from serving records that no longer exist.
 *
 * IA: 15. External Services > Search > Typesense
 */
export const searchIndexJobs = pgTable(
  'search_index_jobs',
  {
    id: pk(),
    /** providers | facilities | specialties */
    collection: varchar('collection', { length: 40 }).notNull(),
    documentId: uuid('document_id').notNull(),
    /** upsert | delete */
    operation: varchar('operation', { length: 10 }).notNull(),
    attempts: integer('attempts').notNull().default(0),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    failedAt: timestamp('failed_at', { withTimezone: true }),
    lastError: text('last_error'),
    ...timestamps,
  },
  (t) => [
    index('search_index_jobs_pending_idx')
      .on(t.createdAt)
      .where(sql`processed_at is null`),
    uniqueIndex('search_index_jobs_pending_unique')
      .on(t.collection, t.documentId)
      .where(sql`processed_at is null`),
  ],
);

/**
 * Cached geocoding and place lookups. Google's terms allow limited caching of
 * place ids and coordinates, and it keeps a per-request Maps bill off every
 * marketplace search.
 */
export const geocodeCache = pgTable(
  'geocode_cache',
  {
    id: pk(),
    /** Normalised query or place id. */
    cacheKey: varchar('cache_key', { length: 300 }).notNull().unique(),
    googlePlaceId: varchar('google_place_id', { length: 255 }),
    formattedAddress: text('formatted_address'),
    latitude: text('latitude'),
    longitude: text('longitude'),
    components: jsonb('components').$type<Record<string, unknown>>(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (t) => [index('geocode_cache_expiry_idx').on(t.expiresAt)],
);

export type IntegrationConnection = typeof integrationConnections.$inferSelect;
export type SearchIndexJob = typeof searchIndexJobs.$inferSelect;
