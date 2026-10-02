import { pgTable, uuid, varchar, timestamp, pgEnum, unique } from 'drizzle-orm/pg-core';
import { organizations } from './organizationSchema.js';

export const roleEnum = pgEnum('role', ['ADMIN', 'MANAGER', 'USER']);
export const statusEnum = pgEnum('status', ['ACTIVE', 'INACTIVE']);

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    role: roleEnum('role').default('ADMIN').notNull(),
    status: statusEnum('status').default('ACTIVE').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    unique('users_org_email_unique').on(table.organizationId, table.email),
  ]
);
