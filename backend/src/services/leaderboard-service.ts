import { eq, and, lt, desc, gte, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { agents } from '../db/schema/agents.js';
import { positions } from '../db/schema/positions.js';
import { orders } from '../db/schema/decisions.js';
import { leaderboardDaily, leaderboardWeekly } from '../db/schema/leaderboard.js';
import { agentDailyLimits } from '../db/schema/agents.js';
import { config } from '../config/index.js';

export async function writeAllLeaderboardDaily() {
  const agentRows = await db.select().from(agents).where(eq(agents.isActive, true));
  for (const a of agentRows) {
    await writeDailyForAgent(a.id);
  }
  await assignDailyRanks();
  console.log(`[Leaderboard] Daily updated for ${agentRows.length} agents`);
}

async function writeDailyForAgent(agentId: string) {
  const today = new Date().toISOString().split('T')[0];
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [agent] = await db.select().from(agents).where(eq(agents.id, agentId));
  if (!agent) return;

  const agentCapital = parseFloat(agent.capital ?? '1000000');

  const openPos = await db.select({
    entryPrice: positions.entryPrice,
    currentPrice: positions.currentPrice,
    quantity: positions.quantity,
  }).from(positions)
    .where(and(eq(positions.agentId, agentId), eq(positions.status, 'open')));

  const stockValue = openPos.reduce((s, p) => s + p.quantity * parseFloat(p.currentPrice || p.entryPrice), 0);
  const totalValue = agentCapital + stockValue;

  const todayOrders = await db.select({ side: orders.side, amount: orders.amount, status: orders.status })
    .from(orders)
    .where(and(eq(orders.agentId, agentId), gte(orders.createdAt!, todayStart)));

  const totalBuy = todayOrders
    .filter(o => o.side === 'BUY' && o.status === 'filled')
    .reduce((s, o) => s + parseFloat(o.amount || '0'), 0);

  const closedToday = await db.select({ realizedPnl: positions.realizedPnl })
    .from(positions)
    .where(and(eq(positions.agentId, agentId), eq(positions.status, 'closed'), gte(positions.closedAt!, todayStart)));

  const winningTrades = closedToday.filter(p => parseFloat(p.realizedPnl || '0') > 0).length;
  const totalClosed = closedToday.length;

  const capital = agentCapital;
  const returnPct = ((totalValue - config.initialCapital) / config.initialCapital) * 100;
  const turnoverPct = capital > 0 ? (totalBuy / capital) * 100 : 0;
  const hitRate = totalClosed > 0 ? (winningTrades / totalClosed) * 100 : 0;

  const [prevDaily] = await db.select({ capital: leaderboardDaily.capital })
    .from(leaderboardDaily)
    .where(and(eq(leaderboardDaily.agentId, agentId), lt(leaderboardDaily.date, today)))
    .orderBy(desc(leaderboardDaily.date))
    .limit(1);

  const prevPeak = prevDaily ? parseFloat(prevDaily.capital || `${config.initialCapital}`) : config.initialCapital;
  const peakCapital = Math.max(prevPeak, totalValue);
  const drawdownPct = peakCapital > 0 ? ((peakCapital - totalValue) / peakCapital) * 100 : 0;

  await db.insert(leaderboardDaily).values({
    date: today, agentId,
    capital: String(totalValue),
    returnPct: String(Math.round(returnPct * 100) / 100),
    drawdownPct: String(Math.round(drawdownPct * 100) / 100),
    turnoverPct: String(Math.round(turnoverPct * 100) / 100),
    hitRate: String(Math.round(hitRate * 100) / 100),
  }).onConflictDoUpdate({
    target: [leaderboardDaily.date, leaderboardDaily.agentId],
    set: {
      capital: String(totalValue),
      returnPct: String(Math.round(returnPct * 100) / 100),
      drawdownPct: String(Math.round(drawdownPct * 100) / 100),
      turnoverPct: String(Math.round(turnoverPct * 100) / 100),
      hitRate: String(Math.round(hitRate * 100) / 100),
    },
  });
}

async function assignDailyRanks() {
  const today = new Date().toISOString().split('T')[0];
  const entries = await db.select()
    .from(leaderboardDaily)
    .where(eq(leaderboardDaily.date, today))
    .orderBy(desc(leaderboardDaily.capital));

  for (let i = 0; i < entries.length; i++) {
    await db.update(leaderboardDaily)
      .set({ rank: i + 1 })
      .where(eq(leaderboardDaily.id, entries[i].id));
  }
}

function mondayDate(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

export async function settleWeekly() {
  const now = new Date();
  const weekId = mondayDate(now);
  const agentRows = await db.select().from(agents).where(eq(agents.isActive, true));

  for (const a of agentRows) {
    const daily = await db.select()
      .from(leaderboardDaily)
      .where(and(eq(leaderboardDaily.agentId, a.id), gte(leaderboardDaily.date, weekId)))
      .orderBy(leaderboardDaily.date);

    const startingCapital = daily.length > 0 ? parseFloat(daily[0].capital || `${config.initialCapital}`) : config.initialCapital;
    const endingCapital = parseFloat(a.capital ?? `${config.initialCapital}`);
    const peakCapital = daily.reduce((p, d) => Math.max(p, parseFloat(d.capital || '0')), startingCapital);
    const maxDrawdownPct = daily.reduce((p, d) => Math.max(p, parseFloat(d.drawdownPct || '0')), 0);
    const returnPct = ((endingCapital - startingCapital) / startingCapital) * 100;
    const avgHitRate = daily.reduce((s, d) => s + parseFloat(d.hitRate || '0'), 0) / (daily.length || 1);
    const totalTrades = daily.reduce((s, d) => s + Math.round(parseFloat(d.turnoverPct || '0') / 50), 0);
    const returns = daily.map(d => parseFloat(d.returnPct || '0'));
    const avgReturn = returns.reduce((s, r) => s + r, 0) / (returns.length || 1);
    const variance = returns.length > 1 ? returns.reduce((s, r) => s + (r - avgReturn) ** 2, 0) / returns.length : 0;
    const consistencyScore = variance > 0 ? Math.max(0, Math.min(100, 100 - Math.sqrt(variance) * 10)) : 100;

    await db.insert(leaderboardWeekly).values({
      week: weekId, agentId: a.id,
      startingCapital: String(startingCapital),
      endingCapital: String(endingCapital),
      returnPct: String(Math.round(returnPct * 100) / 100),
      peakCapital: String(peakCapital),
      maxDrawdownPct: String(Math.round(maxDrawdownPct * 100) / 100),
      totalTrades,
      winRate: String(Math.round(avgHitRate * 100) / 100),
      consistencyScore: String(Math.round(consistencyScore * 100) / 100),
    }).onConflictDoUpdate({
      target: [leaderboardWeekly.week, leaderboardWeekly.agentId],
      set: {
        endingCapital: String(endingCapital),
        returnPct: String(Math.round(returnPct * 100) / 100),
        peakCapital: String(peakCapital),
        maxDrawdownPct: String(Math.round(maxDrawdownPct * 100) / 100),
        totalTrades,
        winRate: String(Math.round(avgHitRate * 100) / 100),
        consistencyScore: String(Math.round(consistencyScore * 100) / 100),
      },
    });

    await db.update(agents).set({ capital: String(config.initialCapital) }).where(eq(agents.id, a.id));
    await db.delete(agentDailyLimits).where(eq(agentDailyLimits.agentId, a.id));
  }

  const weeklyEntries = await db.select()
    .from(leaderboardWeekly)
    .where(eq(leaderboardWeekly.week, weekId))
    .orderBy(desc(leaderboardWeekly.returnPct));

  for (let i = 0; i < weeklyEntries.length; i++) {
    await db.update(leaderboardWeekly)
      .set({ rank: i + 1 })
      .where(eq(leaderboardWeekly.id, weeklyEntries[i].id));
  }

  console.log(`[Settlement] Week ${weekId} settled for ${agentRows.length} agents`);
}
