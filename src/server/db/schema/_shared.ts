import { sql } from 'drizzle-orm';
import { timestamp, uuid } from 'drizzle-orm/pg-core';

export const pk = () => uuid('id').primaryKey().defaultRandom();

export const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
};


export const softDelete = {
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
};

export const currentOrgId = sql`current_setting('app.current_org_id', true)::uuid`;
