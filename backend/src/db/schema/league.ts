import { pgTable, text, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const leagueConfig = pgTable('league_config', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
