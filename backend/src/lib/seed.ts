import { sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { leagueConfig } from '../db/schema/league.js';

const DEFAULTS: { key: string; value: unknown }[] = [
  { key: 'starting_capital', value: 1000000 },
  { key: 'slippage_pct', value: 0.1 },
  { key: 'max_single_stock_exposure_pct', value: 20 },
  { key: 'max_sector_exposure_pct', value: 35 },
  { key: 'default_max_calls_per_day', value: 10 },
  { key: 'default_max_trades_per_day', value: 20 },
  { key: 'market_open', value: '09:15' },
  { key: 'market_close', value: '15:30' },
  { key: 'intraday_close', value: '15:15' },
  { key: 'circuit_fallback', value: 'LTP' },
];

export async function seedLeagueConfig() {
  const [existing] = await db.select({ count: sql<number>`count(*)` }).from(leagueConfig);
  if (existing?.count && existing.count > 0) {
    console.log('[Seed] league_config already seeded');
    return;
  }
  for (const row of DEFAULTS) {
    await db.insert(leagueConfig).values({ key: row.key, value: JSON.stringify(row.value) });
  }
  console.log(`[Seed] Inserted ${DEFAULTS.length} league_config defaults`);
}
