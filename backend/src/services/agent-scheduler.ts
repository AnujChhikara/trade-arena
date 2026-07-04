import { eq, and, lte, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { agents } from '../db/schema/agents.js';
import { agentDailyLimits, agentSchedules } from '../db/schema/agents.js';
import { positions } from '../db/schema/positions.js';
import { orders } from '../db/schema/decisions.js';
import { config } from '../config/index.js';
import { buildSnapshot } from './snapshot-builder.js';
import { callAgent, storeDecision, type Agent, type AgentPosition } from './agent-service.js';
import redis from '../config/redis.js';

export async function runCheckpoint() {
  console.log('[Scheduler] Running checkpoint...');
  const snapshot = await buildSnapshot();
  const agentRows = await db.select().from(agents).where(eq(agents.isActive, true));

  for (const a of agentRows) {
    await processAgent(a as unknown as Agent, snapshot);
  }

  console.log(`[Scheduler] Checkpoint complete. ${agentRows.length} agents.`);
  await redis.publish('checkpoint:done', JSON.stringify({ snapshot_id: snapshot.id, agent_count: agentRows.length }));
}

async function processAgent(agent: Agent, snapshot: any) {
  const today = new Date().toISOString().split('T')[0];

  let [limits] = await db.select().from(agentDailyLimits)
    .where(and(eq(agentDailyLimits.agentId, agent.id), eq(agentDailyLimits.date, today)));

  if (!limits) {
    [limits] = await db.insert(agentDailyLimits).values({
      agentId: agent.id, date: today, maxCalls: String(config.league.defaultMaxCalls), maxTrades: String(config.league.defaultMaxTrades),
    }).returning();
  }

  const callsUsed = parseInt(limits.callsUsed || '0');
  const tradesUsed = parseInt(limits.tradesUsed || '0');
  if (callsUsed >= parseInt(limits.maxCalls || '10')) {
    console.log(`[Scheduler] ${agent.name} skipped — all calls used (${callsUsed}/${limits.maxCalls})`);
    return;
  }

  const posRows = await db.select().from(positions)
    .where(and(eq(positions.agentId, agent.id), eq(positions.status, 'open')));

  agent._positions = posRows as unknown as AgentPosition[];

  const result = await callAgent(agent, snapshot, {
    calls_remaining: parseInt(limits.maxCalls || '10') - callsUsed,
    trades_remaining: parseInt(limits.maxTrades || '20') - tradesUsed,
    max_calls: parseInt(limits.maxCalls || '10'),
    max_trades: parseInt(limits.maxTrades || '20'),
  });

  const decisionId = await storeDecision(agent.id, snapshot.id, agent.model, result);

  await db.update(agentDailyLimits)
    .set({ callsUsed: String(callsUsed + 1) })
    .where(and(eq(agentDailyLimits.agentId, agent.id), eq(agentDailyLimits.date, today)));

  if (result.status === 'success' && result.parsed_decision) {
    await queueOrders(agent.id, decisionId, result.parsed_decision, snapshot);
    if (result.parsed_decision.next_check) {
      await db.insert(agentSchedules).values({
        agentId: agent.id, wakeTime: parseNextCheck(result.parsed_decision.next_check), source: 'agent_requested', reason: `Next check at ${result.parsed_decision.next_check}`,
      });
    }
  }
}

async function queueOrders(agentId: string, decisionId: string, decision: any, snapshot: any) {
  if (!decision.orders) return;
  for (const order of decision.orders) {
    const quote = snapshot.quotes?.[order.symbol];
    if (!quote?.ltp) { console.warn(`[Scheduler] No price for ${order.symbol}`); continue; }

    const slippage = config.league.slippagePct / 100;
    const isBuy = decision.decision === 'BUY';
    const execPrice = isBuy ? quote.ltp * (1 + slippage) : quote.ltp * (1 - slippage);
    const qty = order.all ? null : Math.max(1, Math.floor((order.amount || 0) / execPrice));

    await db.insert(orders).values({
      agentId, decisionId, symbol: order.symbol, side: isBuy ? 'BUY' : 'SELL',
      amount: String(order.amount || 0), quantity: qty,
      requestedPrice: String(quote.ltp), executedPrice: String(Math.round(execPrice * 100) / 100),
      slippage: String(slippage), status: 'pending',
    });
  }
}

function parseNextCheck(nextCheck: string): Date {
  const [h, m] = nextCheck.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  if (d <= new Date()) d.setDate(d.getDate() + 1);
  return d;
}

export async function seedDefaultSchedules() {
  const agentRows = await db.select().from(agents).where(eq(agents.isActive, true));
  const today = new Date().toISOString().split('T')[0];

  for (const a of agentRows) {
    for (const time of config.checkpoints) {
      const [h, m] = time.split(':').map(Number);
      const wt = new Date(`${today}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00+05:30`);
      if (wt > new Date()) {
        await db.insert(agentSchedules).values({ agentId: a.id, wakeTime: wt, source: 'default', reason: 'Checkpoint' });
      }
    }
  }
  console.log(`[Scheduler] Seeded schedules for ${agentRows.length} agents`);
}

export async function getPendingSchedules() {
  return db.select().from(agentSchedules)
    .where(and(lte(agentSchedules.wakeTime, new Date()), eq(agentSchedules.used, false)))
    .orderBy(agentSchedules.wakeTime).limit(50);
}

export async function markScheduleUsed(id: string) {
  await db.update(agentSchedules).set({ used: true }).where(eq(agentSchedules.id, id));
}
