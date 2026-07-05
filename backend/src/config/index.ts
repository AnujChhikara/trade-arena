import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().default('postgresql://trade_arena:trade_arena_dev@localhost:5432/trade_arena'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  SERVICE_KEY: z.string().default('dev-key'),
  OPENROUTER_API_KEY: z.string().default(''),
  OPENROUTER_BASE_URL: z.string().default('https://openrouter.ai/api/v1'),
  LEAGUE_WEEK_START: z.string().default(''),
  AGENT_COUNT: z.coerce.number().default(5),
  DEFAULT_MAX_CALLS: z.coerce.number().default(10),
  DEFAULT_MAX_TRADES: z.coerce.number().default(20),
  MAX_SINGLE_STOCK_EXPOSURE: z.coerce.number().default(20),
  MAX_SECTOR_EXPOSURE: z.coerce.number().default(35),
  SLIPPAGE_PCT: z.coerce.number().default(0.1),
  CIRCUIT_FALLBACK: z.enum(['LTP', 'VWAP']).default('LTP'),
  YAHOO_FINANCE_ENABLED: z.string().default('true'),
  NIFTY_UNIVERSE_SIZE: z.coerce.number().default(100),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('[Config] Invalid environment variables:', parsed.error.flatten());
  process.exit(1);
}

const env = parsed.data;

export const config = {
  port: env.PORT,
  dbUrl: env.DATABASE_URL,
  redisUrl: env.REDIS_URL,

  serviceKey: env.SERVICE_KEY,

  openRouter: {
    apiKey: env.OPENROUTER_API_KEY,
    baseUrl: env.OPENROUTER_BASE_URL,
  },

  league: {
    weekStart: env.LEAGUE_WEEK_START,
    agentCount: env.AGENT_COUNT,
    defaultMaxCalls: env.DEFAULT_MAX_CALLS,
    defaultMaxTrades: env.DEFAULT_MAX_TRADES,
    maxSingleStockExposure: env.MAX_SINGLE_STOCK_EXPOSURE,
    maxSectorExposure: env.MAX_SECTOR_EXPOSURE,
    slippagePct: env.SLIPPAGE_PCT,
    circuitFallback: env.CIRCUIT_FALLBACK,
  },

  yahooFinance: {
    enabled: env.YAHOO_FINANCE_ENABLED !== 'false',
    quoteTtl: 90,
    batchSize: 20,
  },

  checkpoints: ['09:15', '10:15', '11:15', '12:15', '13:15', '14:15', '15:00'] as const,
  initialCapital: 10_00_000,
  niftyUniverseSize: env.NIFTY_UNIVERSE_SIZE,
} as const;

export type Config = typeof config;
