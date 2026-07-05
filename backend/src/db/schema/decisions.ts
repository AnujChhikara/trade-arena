import { pgTable, uuid, text, timestamp, jsonb, numeric, integer } from 'drizzle-orm/pg-core';
import { agents } from './agents.js';
import { marketSnapshots } from './market.js';

export const agentDecisions = pgTable('agent_decisions', {
  id: uuid('id').defaultRandom().primaryKey(),
  agentId: uuid('agent_id').references(() => agents.id, { onDelete: 'cascade' }),
  snapshotId: uuid('snapshot_id').references(() => marketSnapshots.id),
  model: text('model').notNull(),
  promptVersion: text('prompt_version').default('v1'),
  systemPrompt: text('system_prompt'),
  userPrompt: text('user_prompt'),
  rawOutput: text('raw_output'),
  parsedDecision: jsonb('parsed_decision'),
  tokenUsage: jsonb('token_usage'),
  cost: numeric('cost', { precision: 10, scale: 6 }),
  responseTimeMs: integer('response_time_ms'),
  status: text('status', { enum: ['success', 'timeout', 'parse_error', 'rejected'] }).default('success'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const orders = pgTable('orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  agentId: uuid('agent_id').references(() => agents.id, { onDelete: 'cascade' }),
  decisionId: uuid('decision_id').references(() => agentDecisions.id),
  symbol: text('symbol').notNull(),
  side: text('side', { enum: ['BUY', 'SELL'] }).notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }),
  quantity: integer('quantity'),
  requestedPrice: numeric('requested_price', { precision: 10, scale: 2 }),
  executedPrice: numeric('executed_price', { precision: 10, scale: 2 }),
  slippage: numeric('slippage', { precision: 6, scale: 4 }),
  status: text('status', { enum: ['pending', 'filled', 'partial', 'rejected', 'circuit_locked'] }).default('pending'),
  executedAt: timestamp('executed_at', { withTimezone: true }),
  rejectionReason: text('rejection_reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
