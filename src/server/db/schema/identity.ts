import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  index,
  inet,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { pk, softDelete, timestamps } from './_shared';
import {
  accountStatusEnum,
  identityProviderEnum,
  mfaMethodEnum,
  userTypeEnum,
  verificationStatusEnum,
} from './enums';

/**
 * A person. Deliberately NOT tenant-scoped: a patient belongs to no
 * organization, and one staff user can hold memberships in several. Tenant
 * isolation for users is enforced through `memberships` -- see drizzle/sql/rls.sql.
 *
 * Firebase Auth is the credential store, so no password hash lives here.
 * IA: 15. External Services > Authentication
 */
export const users = pgTable(
  'users',
  {
    id: pk(),
    firebaseUid: varchar('firebase_uid', { length: 128 }).unique(),
    type: userTypeEnum('type').notNull(),
    status: accountStatusEnum('status').notNull().default('active'),

    email: varchar('email', { length: 320 }),
    emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
    /** E.164. IA: 4/5. Onboarding > Verify Mobile */
    phone: varchar('phone', { length: 20 }),
    phoneVerifiedAt: timestamp('phone_verified_at', { withTimezone: true }),

    firstName: varchar('first_name', { length: 100 }),
    lastName: varchar('last_name', { length: 100 }),
    avatarUrl: text('avatar_url'),
    locale: varchar('locale', { length: 10 }).notNull().default('en-US'),
    timezone: varchar('timezone', { length: 64 }).notNull().default('America/New_York'),

    mfaEnabled: boolean('mfa_enabled').notNull().default(false),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),

    ...timestamps,
    ...softDelete,
  },
  (t) => [
    uniqueIndex('users_email_unique')
      .on(t.email)
      .where(sql`deleted_at is null`),
    index('users_phone_idx').on(t.phone),
    index('users_type_status_idx').on(t.type, t.status),
  ],
);

/**
 * Password hashes, deliberately in their own table rather than a column on
 * `users`.
 *
 * Two reasons. The RLS policy on `users` lets a signed-in person read their own
 * row, which would hand them their own hash for free; and every screen that
 * lists staff or patients selects from `users`, so a hash column is one
 * forgotten `select *` away from a response body. Nothing but the auth service
 * reads this table -- its policy admits only the system actor.
 */
export const userCredentials = pgTable(
  'user_credentials',
  {
    id: pk(),
    userId: uuid('user_id')
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** scrypt$N$r$p$salt$hash -- versioned so parameters can be raised later. */
    passwordHash: text('password_hash').notNull(),
    /** Set when a reset or an admin action forces the next sign-in to re-auth. */
    passwordChangedAt: timestamp('password_changed_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    ...timestamps,
  },
  (t) => [index('user_credentials_user_idx').on(t.userId)],
);

/** Federated logins. IA: Authentication > Google OAuth / Apple OAuth / Firebase Auth */
export const userIdentities = pgTable(
  'user_identities',
  {
    id: pk(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: identityProviderEnum('provider').notNull(),
    providerAccountId: varchar('provider_account_id', { length: 255 }).notNull(),
    email: varchar('email', { length: 320 }),
    raw: jsonb('raw').$type<Record<string, unknown>>(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('user_identities_provider_account_unique').on(t.provider, t.providerAccountId),
    index('user_identities_user_idx').on(t.userId),
  ],
);

/**
 * Server-side session records so access can be revoked immediately.
 * `activeOrganizationId` / `activeFacilityId` carry no FK here because
 * organizations.ts imports this file; the constraints are added in
 * drizzle/sql/constraints.sql to keep the module graph acyclic.
 */
export const sessions = pgTable(
  'sessions',
  {
    id: pk(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: varchar('token_hash', { length: 128 }).notNull().unique(),
    /** IA: 6. Unified Dashboard > Facility Switcher */
    activeOrganizationId: uuid('active_organization_id'),
    activeFacilityId: uuid('active_facility_id'),
    /** Push notification target for this device. Cleared when the session ends. */
    deviceToken: text('device_token'),
    /** web | ios | android */
    deviceType: varchar('device_type', { length: 20 }),
    ipAddress: inet('ip_address'),
    userAgent: text('user_agent'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index('sessions_user_idx').on(t.userId), index('sessions_expires_idx').on(t.expiresAt)],
);

/** IA: 12. Settings > MFA */
export const mfaFactors = pgTable(
  'mfa_factors',
  {
    id: pk(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    method: mfaMethodEnum('method').notNull(),
    /** Encrypted at the application layer; never a plaintext TOTP secret. */
    secretEncrypted: text('secret_encrypted'),
    destination: varchar('destination', { length: 320 }),
    status: verificationStatusEnum('status').notNull().default('pending'),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [uniqueIndex('mfa_factors_user_method_unique').on(t.userId, t.method)],
);

/** IA: 12. Settings > Trusted Device */
export const trustedDevices = pgTable(
  'trusted_devices',
  {
    id: pk(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    deviceFingerprint: varchar('device_fingerprint', { length: 128 }).notNull(),
    label: varchar('label', { length: 120 }),
    lastIp: inet('last_ip'),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    trustedUntil: timestamp('trusted_until', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [uniqueIndex('trusted_devices_user_fingerprint_unique').on(t.userId, t.deviceFingerprint)],
);

/**
 * One-time codes for mobile verification, login OTP and MFA.
 * Only a hash is stored. Every issued code is metered -- IA: Usage Tracking > OTP.
 */
export const verificationCodes = pgTable(
  'verification_codes',
  {
    id: pk(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    /** verify_mobile | login_otp | mfa | email_change */
    purpose: varchar('purpose', { length: 40 }).notNull(),
    destination: varchar('destination', { length: 320 }).notNull(),
    codeHash: varchar('code_hash', { length: 128 }).notNull(),
    attempts: integer('attempts').notNull().default(0),
    maxAttempts: integer('max_attempts').notNull().default(5),
    /** Set when the correct code was entered. The row is then "verified". */
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
    /**
     * Set when the verification was spent on its follow-up action -- the
     * signup completed, the password reset. A verified code can be spent once;
     * this is what makes the proof token single-use without storing it.
     */
    completedAt: timestamp('completed_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (t) => [
    index('verification_codes_destination_idx').on(t.destination, t.purpose),
    index('verification_codes_expires_idx').on(t.expiresAt),
  ],
);

/**
 * Fixed-window rate limiting, in the database so it holds across serverless
 * instances with no Redis. `key` is a SHA-256 of the logical key ("otp:send:
 * dest:+15551234567"), so the table itself carries no phone numbers or IPs.
 *
 * Rows for old windows are inert and are swept by the retention job.
 */
export const rateLimitBuckets = pgTable(
  'rate_limit_buckets',
  {
    id: pk(),
    keyHash: varchar('key_hash', { length: 64 }).notNull(),
    windowStart: timestamp('window_start', { withTimezone: true }).notNull(),
    count: integer('count').notNull().default(0),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('rate_limit_buckets_key_window_unique').on(t.keyHash, t.windowStart),
    index('rate_limit_buckets_window_idx').on(t.windowStart),
  ],
);

export const usersRelations = relations(users, ({ many }) => ({
  identities: many(userIdentities),
  sessions: many(sessions),
  mfaFactors: many(mfaFactors),
  trustedDevices: many(trustedDevices),
}));

export const userIdentitiesRelations = relations(userIdentities, ({ one }) => ({
  user: one(users, { fields: [userIdentities.userId], references: [users.id] }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
