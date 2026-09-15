import { relations, sql } from 'drizzle-orm';
import {
  bigint,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { pk, softDelete, timestamps } from './_shared';
import {
  approvalStatusEnum,
  approvalSubjectEnum,
  mediaKindEnum,
  moderationStatusEnum,
  transferKindEnum,
  transferStatusEnum,
} from './enums';
import { users } from './identity';
import { facilities, organizations } from './organizations';
import { providers } from './providers';

/**
 * Every uploaded file. Nothing is served publicly until moderation clears it.
 *
 * IA: 4/5. Onboarding > Photo Uploads; 14. Control Center > Approvals > Photo
 * Review; 15. External Services > Image Moderation > Amazon Rekognition
 */
export const mediaAssets = pgTable(
  'media_assets',
  {
    id: pk(),
    /** Null for platform-owned assets such as specialty hero images. */
    organizationId: uuid('organization_id').references(() => organizations.id, {
      onDelete: 'cascade',
    }),
    facilityId: uuid('facility_id').references(() => facilities.id, { onDelete: 'cascade' }),
    uploadedByUserId: uuid('uploaded_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),

    kind: mediaKindEnum('kind').notNull(),
    storageKey: text('storage_key').notNull().unique(),
    contentType: varchar('content_type', { length: 100 }).notNull(),
    byteSize: bigint('byte_size', { mode: 'number' }).notNull(),
    width: integer('width'),
    height: integer('height'),
    checksumSha256: varchar('checksum_sha256', { length: 64 }),

    /** Rekognition verdict. `auto_flagged` routes into the Photo Review queue. */
    moderationStatus: moderationStatusEnum('moderation_status').notNull().default('pending'),
    moderationLabels: jsonb('moderation_labels')
      .$type<Array<{ name: string; confidence: number; parentName?: string }>>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    moderatedAt: timestamp('moderated_at', { withTimezone: true }),
    moderatedByUserId: uuid('moderated_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    moderationNote: text('moderation_note'),

    altText: varchar('alt_text', { length: 300 }),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    index('media_assets_org_kind_idx').on(t.organizationId, t.kind),
    index('media_assets_moderation_queue_idx')
      .on(t.moderationStatus, t.createdAt)
      .where(sql`moderation_status in ('pending','auto_flagged')`),
  ],
);

/**
 * A single work queue for everything Control Center has to sign off on:
 * providers, facilities, photos and reviews.
 *
 * IA: 14. Control Center > Approvals
 */
export const approvalRequests = pgTable(
  'approval_requests',
  {
    id: pk(),
    /** Null when the subject is platform-level (e.g. an agency application). */
    organizationId: uuid('organization_id').references(() => organizations.id, {
      onDelete: 'cascade',
    }),
    subjectType: approvalSubjectEnum('subject_type').notNull(),
    subjectId: uuid('subject_id').notNull(),
    status: approvalStatusEnum('status').notNull().default('pending_review'),

    submittedByUserId: uuid('submitted_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),

    assignedToUserId: uuid('assigned_to_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    decidedByUserId: uuid('decided_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    decidedAt: timestamp('decided_at', { withTimezone: true }),
    /** Shown to the submitter when status is needs_changes or rejected. */
    decisionNote: text('decision_note'),
    /** Structured list of what must change, so the UI can render a checklist. */
    requestedChanges: jsonb('requested_changes')
      .$type<Array<{ field: string; message: string }>>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    ...timestamps,
  },
  (t) => [
    index('approval_requests_queue_idx')
      .on(t.status, t.submittedAt)
      .where(sql`status = 'pending_review'`),
    index('approval_requests_subject_idx').on(t.subjectType, t.subjectId),
    index('approval_requests_org_idx').on(t.organizationId),
  ],
);

/**
 * Moving a provider from one facility or organization to another. A transfer
 * is a governed process, not an update: the losing office keeps the provider
 * through a waiting period unless staff grant an early release.
 *
 * IA: 14. Control Center > Provider Transfer
 */
export const providerTransfers = pgTable(
  'provider_transfers',
  {
    id: pk(),
    providerId: uuid('provider_id')
      .notNull()
      .references(() => providers.id, { onDelete: 'cascade' }),

    /** IA: Provider Transfer > Current Facility / Target Facility */
    currentOrganizationId: uuid('current_organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    currentFacilityId: uuid('current_facility_id').references(() => facilities.id, {
      onDelete: 'set null',
    }),
    targetOrganizationId: uuid('target_organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    targetFacilityId: uuid('target_facility_id').references(() => facilities.id, {
      onDelete: 'set null',
    }),

    kind: transferKindEnum('kind').notNull().default('waiting_period'),
    status: transferStatusEnum('status').notNull().default('requested'),

    /** IA: Provider Transfer > Waiting Period */
    waitingPeriodEndsOn: date('waiting_period_ends_on'),
    /** IA: Provider Transfer > Early Release -- granted by the losing office or staff. */
    earlyReleaseGrantedByUserId: uuid('early_release_granted_by_user_id').references(
      () => users.id,
      { onDelete: 'set null' },
    ),
    earlyReleaseGrantedAt: timestamp('early_release_granted_at', { withTimezone: true }),

    /** What happens to future appointments at the losing facility. */
    appointmentHandling: varchar('appointment_handling', { length: 40 })
      .notNull()
      .default('keep_with_facility'),

    requestedByUserId: uuid('requested_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    reason: text('reason'),
    ...timestamps,
  },
  (t) => [
    index('provider_transfers_provider_idx').on(t.providerId, t.status),
    index('provider_transfers_target_idx').on(t.targetOrganizationId, t.status),
  ],
);

export const approvalRequestsRelations = relations(approvalRequests, ({ one }) => ({
  organization: one(organizations, {
    fields: [approvalRequests.organizationId],
    references: [organizations.id],
  }),
  assignee: one(users, { fields: [approvalRequests.assignedToUserId], references: [users.id] }),
}));

export const providerTransfersRelations = relations(providerTransfers, ({ one }) => ({
  provider: one(providers, { fields: [providerTransfers.providerId], references: [providers.id] }),
}));

export type MediaAsset = typeof mediaAssets.$inferSelect;
export type ApprovalRequest = typeof approvalRequests.$inferSelect;
export type ProviderTransfer = typeof providerTransfers.$inferSelect;
