import { pgTable, uuid, text, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const marketSnapshots = pgTable('market_snapshots', {
  id: uuid('id').defaultRandom().primaryKey(),
  capturedAt: timestamp('captured_at', { withTimezone: true }).notNull(),
  universe: text('universe').array().notNull(),
  benchmark: jsonb('benchmark'),
  quotes: jsonb('quotes').notNull(),
  movers: jsonb('movers'),
  sectorSummary: jsonb('sector_summary'),
  newsBundle: jsonb('news_bundle'),
  snapshotHash: text('snapshot_hash').notNull(),
});
