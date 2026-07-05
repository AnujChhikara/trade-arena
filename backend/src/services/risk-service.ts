import { eq, and, isNull, lte } from 'drizzle-orm';
import { db } from '../db/index.js';
import { positions } from '../db/schema/positions.js';
import { exitRules } from '../db/schema/positions.js';
import { agents } from '../db/schema/agents.js';
import redis from '../config/redis.js';

export async function checkRiskRules(): Promise<number> {
  const now = new Date();
  const ist = now.getHours() * 100 + now.getMinutes();
  let closed = 0;

  closed += await checkStopLosses();
  closed += await checkTargets();
  closed += await checkTimeExits(now);

  if (now.getDay() === 5 && ist >= 1530) {
    closed += await closeByType('friday_liquidation');
  }
  if (ist >= 1515) {
    closed += await closeByType('intraday_auto_close', 'INTRADAY');
  }

  return closed;

  async function checkStopLosses() {
    const rows = await db.select().from(positions)
      .innerJoin(exitRules, eq(exitRules.positionId, positions.id))
      .where(and(eq(positions.status, 'open'), isNull(exitRules.triggeredAt)));

    let n = 0;
    for (const { positions: p, exit_rules: e } of rows) {
      if (!e.stopLossPrice) continue;
      const price = await getPrice(p.symbol);
      if (price && price <= parseFloat(e.stopLossPrice)) {
        await closePosition(p, price, 'stop_loss');
        n++;
      }
    }
    return n;
  }

  async function checkTargets() {
    const rows = await db.select().from(positions)
      .innerJoin(exitRules, eq(exitRules.positionId, positions.id))
      .where(and(eq(positions.status, 'open'), isNull(exitRules.triggeredAt)));

    let n = 0;
    for (const { positions: p, exit_rules: e } of rows) {
      if (!e.targetPrice) continue;
      const price = await getPrice(p.symbol);
      if (price && price >= parseFloat(e.targetPrice)) {
        await closePosition(p, price, 'target');
        n++;
      }
    }
    return n;
  }

  async function checkTimeExits(now: Date) {
    const rows = await db.select().from(positions)
      .innerJoin(exitRules, eq(exitRules.positionId, positions.id))
      .where(and(eq(positions.status, 'open'), isNull(exitRules.triggeredAt), lte(exitRules.exitAt, now)));

    let n = 0;
    for (const { positions: p } of rows) {
      const price = await getPrice(p.symbol) || parseFloat(p.entryPrice);
      await closePosition(p, price, 'time_exit');
      n++;
    }
    return n;
  }

  async function closeByType(reason: string, strategyType?: string) {
    const cond = strategyType
      ? and(eq(positions.status, 'open'), eq(positions.strategyType, strategyType as any))
      : eq(positions.status, 'open');

    const rows = await db.select().from(positions).where(cond);
    let n = 0;
    for (const p of rows) {
      const price = await getPrice(p.symbol) || parseFloat(p.entryPrice);
      await closePosition(p, price, reason);
      n++;
    }
    return n;
  }

  async function closePosition(p: any, exitPrice: number, reason: string) {
    const pnl = p.quantity * (exitPrice - parseFloat(p.entryPrice));
    await db.update(positions).set({
      status: 'closed', closedAt: new Date(), currentPrice: String(exitPrice),
      realizedPnl: String(parseFloat(p.realizedPnl) + pnl), unrealizedPnl: '0',
    }).where(eq(positions.id, p.id));

    const [agent] = await db.select({ capital: agents.capital }).from(agents).where(eq(agents.id, p.agentId));
    if (agent) {
      await db.update(agents).set({ capital: String(parseFloat(agent.capital) + pnl) }).where(eq(agents.id, p.agentId));
    }
  }

  async function getPrice(symbol: string): Promise<number | null> {
    const cached = await redis.get(`quote:${symbol}.NS`);
    return cached ? (JSON.parse(cached) as any).ltp : null;
  }
}
