import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  index,
  jsonb,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { pk, softDelete, timestamps } from './_shared';
import { appointmentStatusEnum, bookingSourceEnum, visitTypeEnum } from './enums';
import { users } from './identity';
import { facilities, organizations } from './organizations';
import { patients } from './patients';
import { providers } from './providers';
import { visitReasons } from './scheduling';

export const appointments = pgTable(
  'appointments',
  {
    id: pk(),
    reference: varchar('reference', { length: 16 }).notNull().unique(),

    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    facilityId: uuid('facility_id')
      .notNull()
      .references(() => facilities.id, { onDelete: 'restrict' }),
    providerId: uuid('provider_id').references(() => providers.id, { onDelete: 'set null' }),
    patientId: uuid('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'restrict' }),
  
    patientUserId: uuid('patient_user_id'),
    visitReasonId: uuid('visit_reason_id').references(() => visitReasons.id, {
      onDelete: 'set null',
    }),

    status: appointmentStatusEnum('status').notNull().default('requested'),
    source: bookingSourceEnum('source').notNull(),
    visitType: visitTypeEnum('visit_type').notNull().default('new_patient'),

    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
    durationMinutes: smallint('duration_minutes').notNull(),

    requestedAt: timestamp('requested_at', { withTimezone: true }).notNull().defaultNow(),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
    checkedInAt: timestamp('checked_in_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    cancellationReason: text('cancellation_reason'),
    cancelledByUserId: uuid('cancelled_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    isNoShow: boolean('is_no_show').notNull().default(false),
    noShowMarkedAt: timestamp('no_show_marked_at', { withTimezone: true }),

    rescheduledFromId: uuid('rescheduled_from_id'),

    patientNote: text('patient_note'),
    staffNote: text('staff_note'),
    patientInsuranceId: uuid('patient_insurance_id'),
    insuranceCarrierName: varchar('insurance_carrier_name', { length: 200 }),
    patientSnapshot: jsonb('patient_snapshot').$type<{
      firstName: string;
      lastName: string;
      dateOfBirth: string | null;
      phone: string | null;
      email: string | null;
      address: string | null;
    }>(),

    /** Attribution. IA: 8. Direct, 9. Pulse. */
    directPageId: uuid('direct_page_id'),
    campaignId: uuid('campaign_id'),
    /** UTM / referrer captured on the booking page. */
    attribution: jsonb('attribution').$type<Record<string, string>>(),

    /** OpenDental round-trip. */
    externalSystem: varchar('external_system', { length: 40 }),
    externalAppointmentId: varchar('external_appointment_id', { length: 80 }),
    externalSyncedAt: timestamp('external_synced_at', { withTimezone: true }),

    createdByUserId: uuid('created_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    /** Primary calendar read path. IA: 7. Scheduling > Calendar > Day/Week View */
    index('appointments_facility_starts_idx').on(t.facilityId, t.startsAt),
    index('appointments_provider_starts_idx').on(t.providerId, t.startsAt),
    index('appointments_patient_starts_idx').on(t.patientId, t.startsAt),
    /** IA: 3. Patient Dashboard > Upcoming / Confirmed / Past Visits */
    index('appointments_patient_user_starts_idx').on(t.patientUserId, t.startsAt),
    index('appointments_org_status_idx').on(t.organizationId, t.status),
    /** Dashboard queues: New Requests, Action Required. */
    index('appointments_status_requested_idx')
      .on(t.organizationId, t.requestedAt)
      .where(sql`status = 'requested'`),
    index('appointments_campaign_idx').on(t.campaignId),
    uniqueIndex('appointments_external_unique')
      .on(t.facilityId, t.externalSystem, t.externalAppointmentId)
      .where(sql`external_appointment_id is not null`),
  ],
);

/**
 * Append-only timeline behind the appointment detail view and the audit trail.
 * Status transitions write here in the same transaction as the status change.
 */
export const appointmentEvents = pgTable(
  'appointment_events',
  {
    id: pk(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    appointmentId: uuid('appointment_id')
      .notNull()
      .references(() => appointments.id, { onDelete: 'cascade' }),
    /** created | confirmed | rescheduled | cancelled | no_show | reminder_sent | ... */
    kind: varchar('kind', { length: 40 }).notNull(),
    fromStatus: appointmentStatusEnum('from_status'),
    toStatus: appointmentStatusEnum('to_status'),
    actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
    /** Set when the change came from a webhook or job rather than a person. */
    actorSystem: varchar('actor_system', { length: 40 }),
    payload: jsonb('payload').$type<Record<string, unknown>>(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
    ...timestamps,
  },
  (t) => [index('appointment_events_appointment_idx').on(t.appointmentId, t.occurredAt)],
);

/**
 * IA: 1. Provider/Facility Profile > Reviews; 3. Patient Dashboard > Reviews.
 * A review is tied to a completed appointment so it cannot be fabricated, and
 * passes moderation before it is listed (IA: 14. Approvals > Review Moderation).
 */
export const reviews = pgTable(
  'reviews',
  {
    id: pk(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    appointmentId: uuid('appointment_id')
      .notNull()
      .references(() => appointments.id, { onDelete: 'cascade' }),
    facilityId: uuid('facility_id')
      .notNull()
      .references(() => facilities.id, { onDelete: 'cascade' }),
    providerId: uuid('provider_id').references(() => providers.id, { onDelete: 'set null' }),
    patientId: uuid('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'cascade' }),

    /** 1..5, enforced by CHECK in rls.sql. */
    rating: smallint('rating').notNull(),
    title: varchar('title', { length: 200 }),
    body: text('body'),
    /** Shown as "Verified visit" in the marketplace. */
    isVerifiedVisit: boolean('is_verified_visit').notNull().default(true),
    isPublished: boolean('is_published').notNull().default(false),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    /** Office reply, itself moderated. */
    responseBody: text('response_body'),
    responseAt: timestamp('response_at', { withTimezone: true }),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    uniqueIndex('reviews_appointment_unique').on(t.appointmentId),
    index('reviews_facility_published_idx').on(t.facilityId, t.isPublished),
    index('reviews_provider_published_idx').on(t.providerId, t.isPublished),
  ],
);

export const appointmentsRelations = relations(appointments, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [appointments.organizationId],
    references: [organizations.id],
  }),
  facility: one(facilities, { fields: [appointments.facilityId], references: [facilities.id] }),
  provider: one(providers, { fields: [appointments.providerId], references: [providers.id] }),
  patient: one(patients, { fields: [appointments.patientId], references: [patients.id] }),
  visitReason: one(visitReasons, {
    fields: [appointments.visitReasonId],
    references: [visitReasons.id],
  }),
  events: many(appointmentEvents),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  appointment: one(appointments, {
    fields: [reviews.appointmentId],
    references: [appointments.id],
  }),
  facility: one(facilities, { fields: [reviews.facilityId], references: [facilities.id] }),
  provider: one(providers, { fields: [reviews.providerId], references: [providers.id] }),
}));

export type Appointment = typeof appointments.$inferSelect;
export type NewAppointment = typeof appointments.$inferInsert;
export type Review = typeof reviews.$inferSelect;
