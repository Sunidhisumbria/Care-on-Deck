import { relations, sql } from 'drizzle-orm';
import {
  boolean,
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

import { pk, softDelete, timestamps } from './_shared';
import {
  messageStatusEnum,
  notificationCategoryEnum,
  notificationChannelEnum,
} from './enums';
import { users } from './identity';
import { organizations } from './organizations';

/**
 * In-app notifications. IA: 11. Notifications > Notification List / Detail.
 *
 * `organizationId` is nullable because a patient's notifications belong to no
 * tenant; the RLS policy falls back to recipient identity in that case.
 */
export const notifications = pgTable(
  'notifications',
  {
    id: pk(),
    organizationId: uuid('organization_id').references(() => organizations.id, {
      onDelete: 'cascade',
    }),
    recipientUserId: uuid('recipient_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    category: notificationCategoryEnum('category').notNull(),
    title: varchar('title', { length: 200 }).notNull(),
    body: text('body'),
    /** Deep link into the app. IA: 11. Notifications > Action Items */
    actionUrl: text('action_url'),
    actionLabel: varchar('action_label', { length: 60 }),
    /** True for Action Items, which stay until resolved rather than just read. */
    requiresAction: boolean('requires_action').notNull().default(false),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    /** What the notification is about, so the UI can render a rich row. */
    subjectType: varchar('subject_type', { length: 40 }),
    subjectId: uuid('subject_id'),
    data: jsonb('data').$type<Record<string, unknown>>(),
    readAt: timestamp('read_at', { withTimezone: true }),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    index('notifications_recipient_created_idx').on(t.recipientUserId, t.createdAt),
    index('notifications_unread_idx')
      .on(t.recipientUserId)
      .where(sql`read_at is null and deleted_at is null`),
    index('notifications_org_category_idx').on(t.organizationId, t.category),
  ],
);

/** Per-user, per-category channel toggles. */
export const notificationPreferences = pgTable(
  'notification_preferences',
  {
    id: pk(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    organizationId: uuid('organization_id').references(() => organizations.id, {
      onDelete: 'cascade',
    }),
    category: notificationCategoryEnum('category').notNull(),
    channel: notificationChannelEnum('channel').notNull(),
    isEnabled: boolean('is_enabled').notNull().default(true),
    ...timestamps,
  },
  (t) => [
    // organizationId null = the user's platform-wide preference.
    unique('notification_preferences_unique')
      .on(t.userId, t.organizationId, t.category, t.channel)
      .nullsNotDistinct(),
  ],
);

/**
 * Every outbound email and SMS, with the vendor's own id so a bounce webhook
 * can be reconciled. This is also the join point to usage metering -- one row
 * here produces one `usage_events` row.
 *
 * IA: 15. External Services > Communications (Postmark, Amazon SES, Telnyx)
 */
export const outboundMessages = pgTable(
  'outbound_messages',
  {
    id: pk(),
    organizationId: uuid('organization_id').references(() => organizations.id, {
      onDelete: 'cascade',
    }),
    recipientUserId: uuid('recipient_user_id').references(() => users.id, { onDelete: 'set null' }),
    notificationId: uuid('notification_id').references(() => notifications.id, {
      onDelete: 'set null',
    }),
    channel: notificationChannelEnum('channel').notNull(),
    /** postmark | amazon_ses | telnyx */
    vendor: varchar('vendor', { length: 40 }).notNull(),
    templateKey: varchar('template_key', { length: 80 }),
    /** Email address or E.164 number. PHI-adjacent; access is audited. */
    destination: varchar('destination', { length: 320 }).notNull(),
    subject: varchar('subject', { length: 300 }),
    status: messageStatusEnum('status').notNull().default('queued'),
    vendorMessageId: varchar('vendor_message_id', { length: 128 }),
    attempts: integer('attempts').notNull().default(0),
    lastError: text('last_error'),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    failedAt: timestamp('failed_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index('outbound_messages_org_created_idx').on(t.organizationId, t.createdAt),
    index('outbound_messages_vendor_id_idx').on(t.vendor, t.vendorMessageId),
    index('outbound_messages_status_idx').on(t.status),
  ],
);

/**
 * Hard bounces, complaints and STOP replies. Checked before every send so a
 * suppressed address is never retried.
 */
export const suppressionList = pgTable(
  'suppression_list',
  {
    id: pk(),
    channel: notificationChannelEnum('channel').notNull(),
    destination: varchar('destination', { length: 320 }).notNull(),
    /** hard_bounce | complaint | unsubscribe | sms_stop | manual */
    reason: varchar('reason', { length: 40 }).notNull(),
    vendor: varchar('vendor', { length: 40 }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [uniqueIndex('suppression_list_unique').on(t.channel, t.destination)],
);

/** IA: 11. Notifications > Platform Announcements -- authored in Control Center. */
export const announcements = pgTable(
  'announcements',
  {
    id: pk(),
    title: varchar('title', { length: 200 }).notNull(),
    body: text('body').notNull(),
    /** Empty audience = everyone. Otherwise a list of user types or org ids. */
    audience: jsonb('audience')
      .$type<{ userTypes?: string[]; organizationIds?: string[] }>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    publishAt: timestamp('publish_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdByUserId: uuid('created_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    ...timestamps,
    ...softDelete,
  },
  (t) => [index('announcements_publish_idx').on(t.publishAt)],
);

export const notificationsRelations = relations(notifications, ({ one }) => ({
  recipient: one(users, { fields: [notifications.recipientUserId], references: [users.id] }),
  organization: one(organizations, {
    fields: [notifications.organizationId],
    references: [organizations.id],
  }),
}));

export type Notification = typeof notifications.$inferSelect;
export type OutboundMessage = typeof outboundMessages.$inferSelect;
