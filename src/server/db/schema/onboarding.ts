import { relations, sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { pk, timestamps } from './_shared';
import { onboardingKindEnum, onboardingStatusEnum } from './enums';
import { users } from './identity';
import { organizations } from './organizations';

/**
 * Tracks a multi-step signup so it can be resumed on another device and so
 * Control Center can see where an applicant stalled.
 *
 * Steps for `office`  : create_account, verify_mobile, select_office_type,
 *                       practice_details, facility_setup, address_setup,
 *                       staff_setup, provider_setup, schedule_setup,
 *                       insurance_setup, photo_uploads, submit_for_review
 * Steps for `provider`: create_account, verify_mobile, select_role, npi_lookup,
 *                       confirm_profile, license_verification, practice_setup,
 *                       schedule_setup, insurance_setup, photo_uploads,
 *                       submit_for_review
 *
 * IA: 4. Provider Onboarding; 5. Office Onboarding
 */
export const onboardingSessions = pgTable(
  'onboarding_sessions',
  {
    id: pk(),
    kind: onboardingKindEnum('kind').notNull(),
    status: onboardingStatusEnum('status').notNull().default('in_progress'),

    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    /** Created once the account step completes; null before that. */
    organizationId: uuid('organization_id').references(() => organizations.id, {
      onDelete: 'cascade',
    }),
    /** Filled in as the flow creates them. */
    facilityId: uuid('facility_id'),
    providerId: uuid('provider_id'),

    currentStep: varchar('current_step', { length: 60 }).notNull(),
    completedSteps: jsonb('completed_steps')
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    /** Partial answers, kept so a half-finished step survives a refresh. */
    draft: jsonb('draft')
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),

    /** IA: 4/5. Onboarding > Submit for Review */
    submittedAt: timestamp('submitted_at', { withTimezone: true }),
    approvalRequestId: uuid('approval_request_id'),

    /** Set by a moderator; the applicant sees these on re-entry. */
    reviewerNote: text('reviewer_note'),

    lastActiveAt: timestamp('last_active_at', { withTimezone: true }).notNull().defaultNow(),
    ...timestamps,
  },
  (t) => [
    index('onboarding_sessions_user_idx').on(t.userId),
    index('onboarding_sessions_status_idx').on(t.kind, t.status, t.lastActiveAt),
    index('onboarding_sessions_org_idx').on(t.organizationId),
  ],
);

export const onboardingSessionsRelations = relations(onboardingSessions, ({ one }) => ({
  user: one(users, { fields: [onboardingSessions.userId], references: [users.id] }),
  organization: one(organizations, {
    fields: [onboardingSessions.organizationId],
    references: [organizations.id],
  }),
}));

export type OnboardingSession = typeof onboardingSessions.$inferSelect;
