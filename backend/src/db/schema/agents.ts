import { pgTable, uuid, text, numeric, boolean, timestamp } from 'drizzle-orm/pg-core';

export const agents = pgTable('agents', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  model: text('model').notNull(),
  systemPrompt: text('system_prompt').notNull(),
  persona: text('persona'),
  capital: numeric('capital', { precision: 12, scale: 2 }).default('1000000.00'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const agentDailyLimits = pgTable('agent_daily_limits', {
  id: uuid('id').defaultRandom().primaryKey(),
  agentId: uuid('agent_id').references(() => agents.id, { onDelete: 'cascade' }),
  date: text('date').notNull(),
  callsUsed: numeric('calls_used').default('0'),
  tradesUsed: numeric('trades_used').default('0'),
  maxCalls: numeric('max_calls').default('10'),
  maxTrades: numeric('max_trades').default('20'),
  violations: text('violations').array().default([]),
});
