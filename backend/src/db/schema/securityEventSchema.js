import { pgTable, uuid, varchar, text, timestamp, pgEnum, index } from 'drizzle-orm/pg-core';
import { organizations } from './organizationSchema.js';
import { users } from './userSchema.js';

export const securityEventSeverityEnum = pgEnum('security_event_severity', [
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL',
]);

export const securityEventStatusEnum = pgEnum('security_event_status', [
  'OPEN',
  'INVESTIGATING',
  'RESOLVED',
]);

export const securityEvents = pgTable(
  'security_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    eventType: varchar('event_type', { length: 100 }).notNull(),
    severity: securityEventSeverityEnum('severity').notNull(),
    status: securityEventStatusEnum('status').default('OPEN').notNull(),
    description: text('description').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('security_events_org_id_idx').on(table.organizationId),
    index('security_events_created_at_idx').on(table.createdAt),
    index('security_events_severity_idx').on(table.severity),
    index('security_events_status_idx').on(table.status),
    index('security_events_event_type_idx').on(table.eventType),
  ]
);
