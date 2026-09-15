import { relations, sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { pk, softDelete, timestamps } from './_shared';
import {
  billingIntervalEnum,
  creditReasonEnum,
  invoiceStatusEnum,
  productLineEnum,
  purchaseModeEnum,
  subscriptionStatusEnum,
  usageMeterEnum,
} from './enums';
import { users } from './identity';
import { facilities, organizations } from './organizations';


export const billingPlans = pgTable(
  'billing_plans',
  {
    id: pk(),
    key: varchar('key', { length: 60 }).notNull().unique(),
    name: varchar('name', { length: 140 }).notNull(),
    description: text('description'),
    productLine: productLineEnum('product_line').notNull(),
    interval: billingIntervalEnum('interval').notNull(),
    priceCents: integer('price_cents').notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('USD'),
    includedCredits: integer('included_credits').notNull().default(0),
    entitlements: jsonb('entitlements')
      .$type<Record<string, number | boolean | string>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    stripePriceId: varchar('stripe_price_id', { length: 64 }),
    isPubliclyListed: boolean('is_publicly_listed').notNull().default(true),
    displayOrder: integer('display_order').notNull().default(0),
    ...timestamps,
    ...softDelete,
  },
  (t) => [index('billing_plans_line_interval_idx').on(t.productLine, t.interval)],
);

export const addons = pgTable(
  'addons',
  {
    id: pk(),
    key: varchar('key', { length: 60 }).notNull().unique(),
    name: varchar('name', { length: 140 }).notNull(),
    description: text('description'),
    productLine: productLineEnum('product_line').notNull(),
    priceCents: integer('price_cents').notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('USD'),
    /** Credits this add-on grants when purchased. */
    grantsCredits: integer('grants_credits').notNull().default(0),
    supportsAutoReplenish: boolean('supports_auto_replenish').notNull().default(false),
    stripePriceId: varchar('stripe_price_id', { length: 64 }),
    isActive: boolean('is_active').notNull().default(true),
    displayOrder: integer('display_order').notNull().default(0),
    ...timestamps,
  },
  (t) => [index('addons_line_idx').on(t.productLine)],
);

export const bundles = pgTable('bundles', {
  id: pk(),
  key: varchar('key', { length: 60 }).notNull().unique(),
  name: varchar('name', { length: 140 }).notNull(),
  description: text('description'),
  priceCents: integer('price_cents').notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('USD'),
  stripePriceId: varchar('stripe_price_id', { length: 64 }),
  isActive: boolean('is_active').notNull().default(true),
  ...timestamps,
});

export const bundleItems = pgTable(
  'bundle_items',
  {
    id: pk(),
    bundleId: uuid('bundle_id')
      .notNull()
      .references(() => bundles.id, { onDelete: 'cascade' }),
    planId: uuid('plan_id').references(() => billingPlans.id, { onDelete: 'cascade' }),
    addonId: uuid('addon_id').references(() => addons.id, { onDelete: 'cascade' }),
    quantity: integer('quantity').notNull().default(1),
    ...timestamps,
  },
  (t) => [index('bundle_items_bundle_idx').on(t.bundleId)],
);

export const subscriptions = pgTable(
  'subscriptions',
  {
    id: pk(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    planId: uuid('plan_id')
      .notNull()
      .references(() => billingPlans.id, { onDelete: 'restrict' }),
    bundleId: uuid('bundle_id').references(() => bundles.id, { onDelete: 'set null' }),
    status: subscriptionStatusEnum('status').notNull().default('trialing'),
    interval: billingIntervalEnum('interval').notNull(),
    quantity: integer('quantity').notNull().default(1),
    currentPeriodStart: timestamp('current_period_start', { withTimezone: true }),
    currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
    trialEndsAt: timestamp('trial_ends_at', { withTimezone: true }),
    cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
    canceledAt: timestamp('canceled_at', { withTimezone: true }),
    stripeSubscriptionId: varchar('stripe_subscription_id', { length: 64 }).unique(),
    ...timestamps,
  },
  (t) => [
    index('subscriptions_org_idx').on(t.organizationId),
    uniqueIndex('subscriptions_org_line_active_unique')
      .on(t.organizationId, t.planId)
      .where(sql`status in ('trialing','active','past_due')`),
  ],
);

export const subscriptionAddons = pgTable(
  'subscription_addons',
  {
    id: pk(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    subscriptionId: uuid('subscription_id').references(() => subscriptions.id, {
      onDelete: 'cascade',
    }),
    addonId: uuid('addon_id')
      .notNull()
      .references(() => addons.id, { onDelete: 'restrict' }),
    mode: purchaseModeEnum('mode').notNull().default('buy_once'),
    quantity: integer('quantity').notNull().default(1),
    replenishThreshold: integer('replenish_threshold'),
    replenishQuantity: integer('replenish_quantity'),
    lastReplenishedAt: timestamp('last_replenished_at', { withTimezone: true }),
    isActive: boolean('is_active').notNull().default(true),
    ...timestamps,
  },
  (t) => [index('subscription_addons_org_idx').on(t.organizationId, t.addonId)],
);


export const creditLedger = pgTable(
  'credit_ledger',
  {
    id: pk(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    /** Positive on grant/purchase, negative on consumption. */
    delta: integer('delta').notNull(),
    balanceAfter: integer('balance_after').notNull(),
    reason: creditReasonEnum('reason').notNull(),
    meter: usageMeterEnum('meter'),
    /** Links a consumption row back to the usage event that caused it. */
    usageEventId: uuid('usage_event_id'),
    addonId: uuid('addon_id').references(() => addons.id, { onDelete: 'set null' }),
    invoiceId: uuid('invoice_id'),
    note: text('note'),
    actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index('credit_ledger_org_created_idx').on(t.organizationId, t.createdAt)],
);

/**
 * One row per metered unit consumed, with the vendor cost attached so Control
 * Center can compare revenue against spend.
 *
 * IA: 14. Control Center > Usage Tracking; 10. Billing > Usage
 */
export const usageEvents = pgTable(
  'usage_events',
  {
    id: pk(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    facilityId: uuid('facility_id').references(() => facilities.id, { onDelete: 'set null' }),
    meter: usageMeterEnum('meter').notNull(),
    quantity: integer('quantity').notNull().default(1),
    /** What we charge the tenant, in credits. */
    creditsCharged: integer('credits_charged').notNull().default(0),
    /** What the vendor charges us, in cents. Micro-cents where needed. */
    vendorCostMicros: bigint('vendor_cost_micros', { mode: 'number' }).notNull().default(0),
    /** Vendor's own identifier, for reconciliation against their invoice. */
    externalReference: varchar('external_reference', { length: 120 }),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
    ...timestamps,
  },
  (t) => [
    index('usage_events_org_meter_occurred_idx').on(t.organizationId, t.meter, t.occurredAt),
    index('usage_events_occurred_idx').on(t.occurredAt),
  ],
);

/**
 * Pre-aggregated daily usage. Reports read this; `usageEvents` stays the
 * source of truth. Refreshed by a nightly job.
 */
export const usageDailyRollups = pgTable(
  'usage_daily_rollups',
  {
    id: pk(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    onDate: date('on_date').notNull(),
    meter: usageMeterEnum('meter').notNull(),
    quantity: integer('quantity').notNull().default(0),
    creditsCharged: integer('credits_charged').notNull().default(0),
    vendorCostMicros: bigint('vendor_cost_micros', { mode: 'number' }).notNull().default(0),
    ...timestamps,
  },
  (t) => [uniqueIndex('usage_daily_rollups_unique').on(t.organizationId, t.onDate, t.meter)],
);

/** IA: 10. Billing > Invoices */
export const invoices = pgTable(
  'invoices',
  {
    id: pk(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    number: varchar('number', { length: 40 }),
    status: invoiceStatusEnum('status').notNull().default('draft'),
    subtotalCents: integer('subtotal_cents').notNull().default(0),
    taxCents: integer('tax_cents').notNull().default(0),
    totalCents: integer('total_cents').notNull().default(0),
    amountPaidCents: integer('amount_paid_cents').notNull().default(0),
    currency: varchar('currency', { length: 3 }).notNull().default('USD'),
    periodStart: timestamp('period_start', { withTimezone: true }),
    periodEnd: timestamp('period_end', { withTimezone: true }),
    dueAt: timestamp('due_at', { withTimezone: true }),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    stripeInvoiceId: varchar('stripe_invoice_id', { length: 64 }).unique(),
    hostedInvoiceUrl: text('hosted_invoice_url'),
    pdfUrl: text('pdf_url'),
    ...timestamps,
  },
  (t) => [index('invoices_org_status_idx').on(t.organizationId, t.status, t.createdAt)],
);

export const invoiceLineItems = pgTable(
  'invoice_line_items',
  {
    id: pk(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    invoiceId: uuid('invoice_id')
      .notNull()
      .references(() => invoices.id, { onDelete: 'cascade' }),
    description: varchar('description', { length: 300 }).notNull(),
    productLine: productLineEnum('product_line'),
    quantity: numeric('quantity', { precision: 12, scale: 4 }).notNull().default('1'),
    unitAmountCents: integer('unit_amount_cents').notNull(),
    amountCents: integer('amount_cents').notNull(),
    ...timestamps,
  },
  (t) => [index('invoice_line_items_invoice_idx').on(t.invoiceId)],
);

/** IA: 10. Billing > Payment Method. Card data never touches our database. */
export const paymentMethods = pgTable(
  'payment_methods',
  {
    id: pk(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    stripePaymentMethodId: varchar('stripe_payment_method_id', { length: 64 }).notNull().unique(),
    brand: varchar('brand', { length: 40 }),
    last4: varchar('last4', { length: 4 }),
    expMonth: integer('exp_month'),
    expYear: integer('exp_year'),
    isDefault: boolean('is_default').notNull().default(false),
    ...timestamps,
    ...softDelete,
  },
  (t) => [index('payment_methods_org_idx').on(t.organizationId)],
);

export const subscriptionsRelations = relations(subscriptions, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [subscriptions.organizationId],
    references: [organizations.id],
  }),
  plan: one(billingPlans, { fields: [subscriptions.planId], references: [billingPlans.id] }),
  addons: many(subscriptionAddons),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [invoices.organizationId],
    references: [organizations.id],
  }),
  lineItems: many(invoiceLineItems),
}));

export type BillingPlan = typeof billingPlans.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type UsageEvent = typeof usageEvents.$inferSelect;
export type Invoice = typeof invoices.$inferSelect;
