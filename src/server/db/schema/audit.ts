import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  inet,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { pk, timestamps } from './_shared';
import { users } from './identity';
import { organizations } from './organizations';


export const auditLogs = pgTable(
  'audit_logs',
  {
    id: pk(),
    organizationId: uuid('organization_id').references(() => organizations.id, {
      onDelete: 'set null',
    }),
    actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
    actorSystem: varchar('actor_system', { length: 60 }),
    actorLabel: varchar('actor_label', { length: 200 }),

    action: varchar('action', { length: 80 }).notNull(),
    resourceType: varchar('resource_type', { length: 60 }).notNull(),
    resourceId: uuid('resource_id'),

    changes: jsonb('changes').$type<Record<string, { from: unknown; to: unknown }>>(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),

    ipAddress: inet('ip_address'),
    userAgent: text('user_agent'),
    requestId: varchar('request_id', { length: 64 }),

    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
    ...timestamps,
  },
  (t) => [
    index('audit_logs_org_occurred_idx').on(t.organizationId, t.occurredAt),
    index('audit_logs_resource_idx').on(t.resourceType, t.resourceId),
    index('audit_logs_actor_idx').on(t.actorUserId, t.occurredAt),
    index('audit_logs_action_idx').on(t.action),
  ],
);

export const phiAccessLogs = pgTable(
  'phi_access_logs',
  {
    id: pk(),
    organizationId: uuid('organization_id').references(() => organizations.id, {
      onDelete: 'set null',
    }),
    actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
    patientId: uuid('patient_id').notNull(),
    accessKind: varchar('access_kind', { length: 30 }).notNull(),
    context: varchar('context', { length: 80 }).notNull(),
    resourceId: uuid('resource_id'),
    wasElevated: boolean('was_elevated').notNull().default(false),
    ipAddress: inet('ip_address'),
    requestId: varchar('request_id', { length: 64 }),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
    ...timestamps,
  },
  (t) => [
    index('phi_access_logs_patient_idx').on(t.patientId, t.occurredAt),
    index('phi_access_logs_actor_idx').on(t.actorUserId, t.occurredAt),
    index('phi_access_logs_org_idx').on(t.organizationId, t.occurredAt),
  ],
);


export const webhookEvents = pgTable(
  'webhook_events',
  {
    id: pk(),
    vendor: varchar('vendor', { length: 40 }).notNull(),
    eventType: varchar('event_type', { length: 120 }).notNull(),
    externalEventId: varchar('external_event_id', { length: 160 }).notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
    signatureVerified: boolean('signature_verified').notNull().default(false),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    failedAt: timestamp('failed_at', { withTimezone: true }),
    attempts: integer('attempts').notNull().default(0),
    lastError: text('last_error'),
    receivedAt: timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
    ...timestamps,
  },
  (t) => [
    index('webhook_events_vendor_external_idx').on(t.vendor, t.externalEventId),
    index('webhook_events_unprocessed_idx')
      .on(t.vendor, t.receivedAt)
      .where(sql`processed_at is null`),
  ],
);

export type AuditLog = typeof auditLogs.$inferSelect;
export type PhiAccessLog = typeof phiAccessLogs.$inferSelect;
export type WebhookEvent = typeof webhookEvents.$inferSelect;
