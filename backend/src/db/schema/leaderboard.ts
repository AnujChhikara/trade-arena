import { pgTable, uuid, text, numeric, integer, unique } from 'drizzle-orm/pg-core';
import { agents } from './agents.js';

export const leaderboardDaily = pgTable('leaderboard_daily', {
  id: uuid('id').defaultRandom().primaryKey(),
  date: text('date').notNull(),
  agentId: uuid('agent_id').references(() => agents.id, { onDelete: 'cascade' }),
  rank: integer('rank'),
  capital: numeric('capital', { precision: 12, scale: 2 }),
  returnPct: numeric('return_pct', { precision: 6, scale: 2 }),
  drawdownPct: numeric('drawdown_pct', { precision: 6, scale: 2 }),
  turnoverPct: numeric('turnover_pct', { precision: 6, scale: 2 }),
  hitRate: numeric('hit_rate', { precision: 5, scale: 2 }),
}, (table) => ({
  uniqueDateAgent: unique().on(table.date, table.agentId),
}));

export const leaderboardWeekly = pgTable('leaderboard_weekly', {
  id: uuid('id').defaultRandom().primaryKey(),
  week: text('week').notNull(),
  agentId: uuid('agent_id').references(() => agents.id, { onDelete: 'cascade' }),
  rank: integer('rank'),
  startingCapital: numeric('starting_capital', { precision: 12, scale: 2 }),
  endingCapital: numeric('ending_capital', { precision: 12, scale: 2 }),
  returnPct: numeric('return_pct', { precision: 6, scale: 2 }),
  peakCapital: numeric('peak_capital', { precision: 12, scale: 2 }),
  maxDrawdownPct: numeric('max_drawdown_pct', { precision: 6, scale: 2 }),
  totalTrades: integer('total_trades'),
  winRate: numeric('win_rate', { precision: 5, scale: 2 }),
  consistencyScore: numeric('consistency_score', { precision: 5, scale: 2 }),
}, (table) => ({
  uniqueWeekAgent: unique().on(table.week, table.agentId),
}));
