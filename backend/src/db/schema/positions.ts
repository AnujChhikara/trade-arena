import { pgTable, uuid, text, numeric, integer, timestamp } from 'drizzle-orm/pg-core';
import { agents } from './agents.js';

export const positions = pgTable('positions', {
  id: uuid('id').defaultRandom().primaryKey(),
  agentId: uuid('agent_id').references(() => agents.id, { onDelete: 'cascade' }),
  symbol: text('symbol').notNull(),
  quantity: integer('quantity').notNull(),
  entryPrice: numeric('entry_price', { precision: 10, scale: 2 }).notNull(),
  currentPrice: numeric('current_price', { precision: 10, scale: 2 }),
  strategyType: text('strategy_type', { enum: ['INTRADAY', 'DELIVERY'] }),
  realizedPnl: numeric('realized_pnl', { precision: 12, scale: 2 }).default('0'),
  unrealizedPnl: numeric('unrealized_pnl', { precision: 12, scale: 2 }).default('0'),
  status: text('status', { enum: ['open', 'closed'] }).default('open'),
  enteredAt: timestamp('entered_at', { withTimezone: true }).defaultNow(),
  closedAt: timestamp('closed_at', { withTimezone: true }),
});

export const exitRules = pgTable('exit_rules', {
  id: uuid('id').defaultRandom().primaryKey(),
  positionId: uuid('position_id').references(() => positions.id, { onDelete: 'cascade' }),
  targetPrice: numeric('target_price', { precision: 10, scale: 2 }),
  stopLossPrice: numeric('stop_loss_price', { precision: 10, scale: 2 }),
  exitAt: timestamp('exit_at', { withTimezone: true }),
  trailingStopPct: numeric('trailing_stop_pct', { precision: 5, scale: 2 }),
  triggeredBy: text('triggered_by'),
  triggeredAt: timestamp('triggered_at', { withTimezone: true }),
});
