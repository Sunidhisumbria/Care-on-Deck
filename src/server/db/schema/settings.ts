import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  smallint,
  text,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { pk, timestamps } from './_shared';
import { facilities, organizations } from './organizations';

/**
 * Settings are held as a typed JSONB document rather than a wide column set:
 * the surface grows constantly and a migration per toggle is not worth it.
 * The shape is validated by a Zod schema on write -- see
 * src/server/modules/settings/settings.schema.ts.
 *
 * IA: 12. Settings > Organization Settings
 */
export const organizationSettings = pgTable('organization_settings', {
  id: pk(),
  organizationId: uuid('organization_id')
    .notNull()
    .unique()
    .references(() => organizations.id, { onDelete: 'cascade' }),

  /** IA: 12. Settings > Security Settings */
  requireMfaForStaff: boolean('require_mfa_for_staff').notNull().default(false),
  sessionTimeoutMinutes: integer('session_timeout_minutes').notNull().default(480),
  trustedDeviceDays: smallint('trusted_device_days').notNull().default(30),
  allowedIpRanges: jsonb('allowed_ip_ranges')
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),

  /** Booking policy applied across the org unless a facility overrides it. */
  booking: jsonb('booking')
    .$type<{
      minLeadTimeMinutes?: number;
      maxAdvanceDays?: number;
      cancellationWindowHours?: number;
      autoConfirmRequests?: boolean;
      allowNewPatients?: boolean;
    }>()
    .notNull()
    .default(sql`'{}'::jsonb`),

  /** Reminder cadence, sender identity, reply-to. */
  communications: jsonb('communications')
    .$type<{
      reminderOffsetsHours?: number[];
      smsEnabled?: boolean;
      emailEnabled?: boolean;
      replyToEmail?: string;
      senderName?: string;
    }>()
    .notNull()
    .default(sql`'{}'::jsonb`),

  branding: jsonb('branding')
    .$type<{ logoUrl?: string; primaryColor?: string }>()
    .notNull()
    .default(sql`'{}'::jsonb`),

  ...timestamps,
});

/** IA: 12. Settings > Facility Settings. Null fields inherit from the org. */
export const facilitySettings = pgTable('facility_settings', {
  id: pk(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  facilityId: uuid('facility_id')
    .notNull()
    .unique()
    .references(() => facilities.id, { onDelete: 'cascade' }),

  booking: jsonb('booking').$type<Record<string, unknown>>(),
  communications: jsonb('communications').$type<Record<string, unknown>>(),
  /** Weekly opening hours shown on the public profile, distinct from bookable
   *  availability -- a facility can be open while a provider has no slots. */
  openingHours: jsonb('opening_hours').$type<
    Array<{ weekday: number; opensAt: string; closesAt: string }>
  >(),

  ...timestamps,
});

/**
 * Feature flags. A flag row is the definition; an override row targets one
 * organization. Rollout is a 0-100 bucket on a stable hash of the org id.
 *
 * IA: 14. Control Center > Feature Flags
 */
export const featureFlags = pgTable(
  'feature_flags',
  {
    id: pk(),
    key: varchar('key', { length: 80 }).notNull().unique(),
    description: text('description'),
    isEnabledGlobally: boolean('is_enabled_globally').notNull().default(false),
    rolloutPercentage: smallint('rollout_percentage').notNull().default(0),
    ...timestamps,
  },
  (t) => [index('feature_flags_enabled_idx').on(t.isEnabledGlobally)],
);

export const featureFlagOverrides = pgTable(
  'feature_flag_overrides',
  {
    id: pk(),
    flagId: uuid('flag_id')
      .notNull()
      .references(() => featureFlags.id, { onDelete: 'cascade' }),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    isEnabled: boolean('is_enabled').notNull(),
    note: text('note'),
    ...timestamps,
  },
  (t) => [uniqueIndex('feature_flag_overrides_unique').on(t.flagId, t.organizationId)],
);

export const organizationSettingsRelations = relations(organizationSettings, ({ one }) => ({
  organization: one(organizations, {
    fields: [organizationSettings.organizationId],
    references: [organizations.id],
  }),
}));

export type OrganizationSettings = typeof organizationSettings.$inferSelect;
export type FeatureFlag = typeof featureFlags.$inferSelect;
