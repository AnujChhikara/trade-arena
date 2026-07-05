import { Router, Request, Response } from 'express';
import { db } from '../db/index.js';
import { agents, agentDailyLimits } from '../db/schema/agents.js';
import { positions } from '../db/schema/positions.js';
import { leaderboardDaily, leaderboardWeekly } from '../db/schema/leaderboard.js';
import { eq, asc } from 'drizzle-orm';
import { config } from '../config/index.js';
import redis from '../config/redis.js';

const router: Router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const cached = await redis.get('leaderboard:current');
    if (cached) { res.json(JSON.parse(cached)); return; }

    const rows = await db.select().from(agents).where(eq(agents.isActive, true));
    const leaderboard = await Promise.all(rows.map(async (a, i) => {
      const pos = await db.select().from(positions).where(eq(positions.agentId, a.id));
      const stockVal = pos.filter(p => p.status === 'open').reduce((s, p) => s + p.quantity * parseFloat(p.currentPrice || p.entryPrice), 0);
      const realizedPnl = pos.reduce((s, p) => s + parseFloat(p.realizedPnl || '0'), 0);
      const total = parseFloat(a.capital || `${config.initialCapital}`) + stockVal + realizedPnl;

      const [limits] = await db.select().from(agentDailyLimits).where(eq(agentDailyLimits.agentId, a.id));

      return {
        rank: i + 1, id: a.id, name: a.name, persona: a.persona, model: a.model,
        capital: parseFloat(a.capital || '0'), stock_value: stockVal,
        total_value: Math.round(total * 100) / 100,
        return_pct: Math.round(((total - config.initialCapital) / config.initialCapital) * 10000) / 100,
      };
    }));

    leaderboard.sort((a, b) => b.total_value - a.total_value);
    leaderboard.forEach((e, i) => e.rank = i + 1);

    await redis.setex('leaderboard:current', 60, JSON.stringify(leaderboard));
    res.json(leaderboard);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/daily', async (_req: Request, res: Response) => {
  try {
    const rows = await db.select({
      date: leaderboardDaily.date, agentId: leaderboardDaily.agentId,
      agentName: agents.name, rank: leaderboardDaily.rank,
      capital: leaderboardDaily.capital, returnPct: leaderboardDaily.returnPct,
    }).from(leaderboardDaily)
      .innerJoin(agents, eq(agents.id, leaderboardDaily.agentId))
      .orderBy(asc(leaderboardDaily.date));

    const grouped: Record<string, { date: string; entries: typeof rows }> = {};
    for (const r of rows) {
      if (!grouped[r.date]) grouped[r.date] = { date: r.date, entries: [] };
      grouped[r.date].entries.push(r as any);
    }
    res.json(Object.values(grouped));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/history', async (_req: Request, res: Response) => {
  try {
    const rows = await db.select().from(leaderboardWeekly).orderBy(leaderboardWeekly.week, leaderboardWeekly.rank);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
