import { pgTable, uuid, varchar, text, timestamp, pgEnum, unique } from 'drizzle-orm/pg-core';
import { organizations } from './organizationSchema.js';
import { users } from './userSchema.js';

export const campaignStatusEnum = pgEnum('campaign_status', [
  'DRAFT',
  'ACTIVE',
  'COMPLETED',
  'CANCELLED',
]);

export const campaigns = pgTable('campaigns', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  status: campaignStatusEnum('status').default('DRAFT').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const campaignUsers = pgTable(
  'campaign_users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    campaignId: uuid('campaign_id')
      .notNull()
      .references(() => campaigns.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    assignedAt: timestamp('assigned_at').defaultNow().notNull(),
  },
  (table) => [
    unique('campaign_users_campaign_user_unique').on(table.campaignId, table.userId),
  ]
);
