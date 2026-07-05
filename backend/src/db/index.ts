import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { config } from '../config/index.js';
import * as agentsSchema from './schema/agents.js';
import * as marketSchema from './schema/market.js';
import * as decisionsSchema from './schema/decisions.js';
import * as positionsSchema from './schema/positions.js';
import * as leaderboardSchema from './schema/leaderboard.js';
import * as leagueSchema from './schema/league.js';

const pool = new pg.Pool({
  connectionString: config.dbUrl,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err: Error) => {
  console.error('[DB] Pool error:', err.message);
});

export const db = drizzle(pool, {
  schema: {
    ...agentsSchema,
    ...marketSchema,
    ...decisionsSchema,
    ...positionsSchema,
    ...leaderboardSchema,
    ...leagueSchema,
  },
  logger: false,
});

export type Db = typeof db;

export async function rawQuery(text: string, params?: unknown[]) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  if (duration > 1000) {
    console.warn('[DB] Slow query:', { text: text.slice(0, 100), duration });
  }
  return res;
}

export default pool;
