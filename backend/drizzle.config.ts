import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema/*.ts',
  out: './db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://trade_arena:trade_arena_dev@localhost:5432/trade_arena',
  },
});
