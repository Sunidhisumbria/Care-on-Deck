import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  smallint,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { pk, softDelete, timestamps } from './_shared';
import { bookingHoldScopeEnum, scheduleChangeKindEnum, visitTypeEnum } from './enums';
import { users } from './identity';
import { facilities, organizations } from './organizations';
import { providers } from './providers';

/**
 * What a patient can book. Duration lives here rather than on the appointment
 * so an office can retune "New Patient Exam" from 30 to 60 minutes without
 * rewriting history.
 *
 * IA: 2. Patient Booking > Select Visit Reason; 7. Scheduling > Appointment Duration
 */
export const visitReasons = pgTable(
  'visit_reasons',
  {
    id: pk(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    /** Null means the reason applies to every facility in the org. */
    facilityId: uuid('facility_id').references(() => facilities.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 160 }).notNull(),
    description: text('description'),
    visitType: visitTypeEnum('visit_type').notNull().default('new_patient'),
    /** Constrained to the 15/30/60/90/120 set by a CHECK in rls.sql. */
    durationMinutes: smallint('duration_minutes').notNull().default(30),
    /** Minutes of turnaround blocked after the visit; not shown to patients. */
    bufferMinutes: smallint('buffer_minutes').notNull().default(0),
    requiresInsurance: boolean('requires_insurance').notNull().default(false),
    isBookableOnline: boolean('is_bookable_online').notNull().default(true),
    displayOrder: integer('display_order').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    index('visit_reasons_org_idx').on(t.organizationId),
    index('visit_reasons_facility_idx').on(t.facilityId),
  ],
);

/** Which providers offer which reasons. Empty set means "all providers". */
export const providerVisitReasons = pgTable(
  'provider_visit_reasons',
  {
    id: pk(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    providerId: uuid('provider_id')
      .notNull()
      .references(() => providers.id, { onDelete: 'cascade' }),
    visitReasonId: uuid('visit_reason_id')
      .notNull()
      .references(() => visitReasons.id, { onDelete: 'cascade' }),
    /** Overrides visitReasons.durationMinutes for this provider when set. */
    durationMinutesOverride: smallint('duration_minutes_override'),
    ...timestamps,
  },
  (t) => [uniqueIndex('provider_visit_reasons_unique').on(t.providerId, t.visitReasonId)],
);

/**
 * The recurring weekly schedule. One row per contiguous working block.
 * Bookable slots are derived from these rules at query time rather than
 * materialised, so a schedule edit takes effect immediately.
 *
 * IA: 4/5. Onboarding > Schedule Setup; 7. Scheduling > Calendar
 */
export const availabilityRules = pgTable(
  'availability_rules',
  {
    id: pk(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    facilityId: uuid('facility_id')
      .notNull()
      .references(() => facilities.id, { onDelete: 'cascade' }),
    /** Null = a facility-wide block (e.g. imaging centre with pooled capacity). */
    providerId: uuid('provider_id').references(() => providers.id, { onDelete: 'cascade' }),
    /** 0 = Sunday .. 6 = Saturday, in the facility's timezone. */
    weekday: smallint('weekday').notNull(),
    startTime: time('start_time').notNull(),
    endTime: time('end_time').notNull(),
    /** Slot granularity; the visit reason decides how many slots a booking eats. */
    slotIntervalMinutes: smallint('slot_interval_minutes').notNull().default(15),
    /** Concurrent bookings per slot -- chairs, rooms, machines. */
    capacity: smallint('capacity').notNull().default(1),
    effectiveFrom: date('effective_from'),
    effectiveTo: date('effective_to'),
    isActive: boolean('is_active').notNull().default(true),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    index('availability_rules_lookup_idx').on(t.facilityId, t.providerId, t.weekday),
    index('availability_rules_org_idx').on(t.organizationId),
  ],
);

/**
 * Date-specific deviations: an extra clinic on a Saturday, or a closure.
 * Overrides always win over the weekly rules.
 */
export const availabilityOverrides = pgTable(
  'availability_overrides',
  {
    id: pk(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    facilityId: uuid('facility_id')
      .notNull()
      .references(() => facilities.id, { onDelete: 'cascade' }),
    providerId: uuid('provider_id').references(() => providers.id, { onDelete: 'cascade' }),
    onDate: date('on_date').notNull(),
    /** false = closed for this window; true = extra availability. */
    isAvailable: boolean('is_available').notNull().default(false),
    startTime: time('start_time'),
    endTime: time('end_time'),
    reason: varchar('reason', { length: 200 }),
    ...timestamps,
  },
  (t) => [index('availability_overrides_lookup_idx').on(t.facilityId, t.onDate, t.providerId)],
);

/**
 * Reusable weekly patterns an office can apply to a provider.
 * IA: 7. Scheduling > Schedule Editing > Templates
 */
export const scheduleTemplates = pgTable(
  'schedule_templates',
  {
    id: pk(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    facilityId: uuid('facility_id').references(() => facilities.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 160 }).notNull(),
    description: text('description'),
    /** Blocks as [{ weekday, startTime, endTime, slotIntervalMinutes, capacity }]. */
    blocks: jsonb('blocks')
      .$type<
        Array<{
          weekday: number;
          startTime: string;
          endTime: string;
          slotIntervalMinutes: number;
          capacity: number;
        }>
      >()
      .notNull()
      .default(sql`'[]'::jsonb`),
    createdByUserId: uuid('created_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    ...timestamps,
    ...softDelete,
  },
  (t) => [index('schedule_templates_org_idx').on(t.organizationId)],
);

/**
 * Pauses new bookings without deleting availability, so existing appointments
 * survive. IA: 7. Scheduling > Booking Holds (Today / Week / Month / Custom)
 */
export const bookingHolds = pgTable(
  'booking_holds',
  {
    id: pk(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    facilityId: uuid('facility_id')
      .notNull()
      .references(() => facilities.id, { onDelete: 'cascade' }),
    /** Null holds the whole facility. */
    providerId: uuid('provider_id').references(() => providers.id, { onDelete: 'cascade' }),
    scope: bookingHoldScopeEnum('scope').notNull(),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
    reason: varchar('reason', { length: 200 }),
    createdByUserId: uuid('created_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    /** IA: 7. Scheduling > Booking Holds > Resume Bookings */
    releasedAt: timestamp('released_at', { withTimezone: true }),
    releasedByUserId: uuid('released_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    ...timestamps,
  },
  (t) => [
    index('booking_holds_active_idx')
      .on(t.facilityId, t.startsAt, t.endsAt)
      .where(sql`released_at is null`),
  ],
);

/**
 * Records a bulk schedule edit before it is committed, so the UI can show a
 * diff and the user can confirm or discard it.
 *
 * IA: 7. Scheduling > Schedule Editing > Confirm Changes
 */
export const scheduleChangeSets = pgTable(
  'schedule_change_sets',
  {
    id: pk(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    facilityId: uuid('facility_id')
      .notNull()
      .references(() => facilities.id, { onDelete: 'cascade' }),
    providerId: uuid('provider_id').references(() => providers.id, { onDelete: 'cascade' }),
    kind: scheduleChangeKindEnum('kind').notNull(),
    /** The proposed operations, applied atomically on confirm. */
    operations: jsonb('operations')
      .$type<Array<Record<string, unknown>>>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    /** Appointments that would be affected, surfaced as warnings before commit. */
    conflicts: jsonb('conflicts')
      .$type<Array<Record<string, unknown>>>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    createdByUserId: uuid('created_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
    discardedAt: timestamp('discarded_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index('schedule_change_sets_facility_idx').on(t.facilityId, t.createdAt)],
);

export const visitReasonsRelations = relations(visitReasons, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [visitReasons.organizationId],
    references: [organizations.id],
  }),
  facility: one(facilities, { fields: [visitReasons.facilityId], references: [facilities.id] }),
  providers: many(providerVisitReasons),
}));

export const availabilityRulesRelations = relations(availabilityRules, ({ one }) => ({
  facility: one(facilities, { fields: [availabilityRules.facilityId], references: [facilities.id] }),
  provider: one(providers, { fields: [availabilityRules.providerId], references: [providers.id] }),
}));

export type VisitReason = typeof visitReasons.$inferSelect;
export type AvailabilityRule = typeof availabilityRules.$inferSelect;
export type BookingHold = typeof bookingHolds.$inferSelect;
