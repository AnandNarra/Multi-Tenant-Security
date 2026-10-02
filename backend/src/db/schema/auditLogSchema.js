import { pgTable, uuid, varchar, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { organizations } from './organizationSchema.js';
import { users } from './userSchema.js';

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    action: varchar('action', { length: 100 }).notNull(),
    resourceType: varchar('resource_type', { length: 100 }).notNull(),
    resourceId: uuid('resource_id'),
    description: text('description').notNull(),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('audit_logs_org_id_idx').on(table.organizationId),
    index('audit_logs_created_at_idx').on(table.createdAt),
    index('audit_logs_action_idx').on(table.action),
    index('audit_logs_resource_type_idx').on(table.resourceType),
    index('audit_logs_user_id_idx').on(table.userId),
  ]
);
