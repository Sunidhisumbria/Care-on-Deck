import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { pk, timestamps } from './_shared';
import { exportFormatEnum, exportStatusEnum, reportKindEnum } from './enums';
import { users } from './identity';
import { organizations } from './organizations';

/**
 * Report generation is asynchronous: an appointments export can span years and
 * must not run inside a request. A row here is the job and the receipt.
 *
 * A finished file holds PHI, so `expiresAt` is mandatory and the download is
 * served through a signed, audited route -- never a public S3 URL.
 *
 * IA: 13. Reports; 9. Pulse > Reports (PDF Export / CSV Export / Date Filters)
 */
export const reportExports = pgTable(
  'report_exports',
  {
    id: pk(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    kind: reportKindEnum('kind').notNull(),
    format: exportFormatEnum('format').notNull(),
    status: exportStatusEnum('status').notNull().default('queued'),

    /** The filters the user chose: date range, facility, provider, status... */
    parameters: jsonb('parameters')
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    /** Which columns were included -- an export of PHI must be reproducible. */
    columns: jsonb('columns')
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    containsPhi: boolean('contains_phi').notNull().default(false),

    rowCount: integer('row_count'),
    byteSize: integer('byte_size'),
    storageKey: text('storage_key'),

    requestedByUserId: uuid('requested_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    failedAt: timestamp('failed_at', { withTimezone: true }),
    lastError: text('last_error'),
    /** After this the file is deleted from storage by the retention job. */
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    downloadedAt: timestamp('downloaded_at', { withTimezone: true }),
    downloadCount: integer('download_count').notNull().default(0),
    ...timestamps,
  },
  (t) => [
    index('report_exports_org_created_idx').on(t.organizationId, t.createdAt),
    index('report_exports_queue_idx')
      .on(t.status, t.createdAt)
      .where(sql`status in ('queued','processing')`),
    index('report_exports_expiry_idx').on(t.expiresAt),
  ],
);

/** A filter set a user saved to re-run later. IA: 13. Reports > Date Filters */
export const savedReportViews = pgTable(
  'saved_report_views',
  {
    id: pk(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    ownerUserId: uuid('owner_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    kind: reportKindEnum('kind').notNull(),
    name: varchar('name', { length: 160 }).notNull(),
    parameters: jsonb('parameters')
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    /** Shared views are visible to everyone in the org with report access. */
    isShared: boolean('is_shared').notNull().default(false),
    ...timestamps,
  },
  (t) => [index('saved_report_views_org_kind_idx').on(t.organizationId, t.kind)],
);

export type ReportExport = typeof reportExports.$inferSelect;
