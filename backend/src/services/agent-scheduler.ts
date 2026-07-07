import { eq, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { agents } from '../db/schema/agents.js';
import { agentDailyLimits } from '../db/schema/agents.js';
import { positions } from '../db/schema/positions.js';
import { orders } from '../db/schema/decisions.js';
import { config } from '../config/index.js';
import { buildSnapshot } from './snapshot-builder.js';
import { callAgent, storeDecision, type Agent, type AgentPosition } from './agent-service.js';
import { log } from '../lib/logger.js';
import redis from '../config/redis.js';

function todayIST(): string {
  const ist = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().split('T')[0];
}

export async function runCheckpoint() {
  log('info', 'checkpoint_start');
  const snapshot = await buildSnapshot();
  const agentRows = await db.select().from(agents).where(eq(agents.isActive, true));

  for (const a of agentRows) {
    try {
      await processAgent(a as unknown as Agent, snapshot);
    } catch (err) {
      log('error', 'agent_process_error', { agent: a.name, message: (err as Error).message });
    }
  }

  log('info', 'checkpoint_done', { agent_count: agentRows.length, snapshot_id: snapshot.id });
  await redis.publish('checkpoint:done', JSON.stringify({ snapshot_id: snapshot.id, agent_count: agentRows.length }));
}

async function processAgent(agent: Agent, snapshot: any) {
  const today = todayIST();

  let [limits] = await db.select().from(agentDailyLimits)
    .where(and(eq(agentDailyLimits.agentId, agent.id), eq(agentDailyLimits.date, today)));

  if (!limits) {
    [limits] = await db.insert(agentDailyLimits).values({
      agentId: agent.id, date: today,
      maxCalls: String(config.league.defaultMaxCalls),
      maxTrades: String(config.league.defaultMaxTrades),
    }).returning();
  }

  const callsUsed = parseInt(limits.callsUsed || '0');
  const tradesUsed = parseInt(limits.tradesUsed || '0');
  const maxCalls = parseInt(limits.maxCalls || '10');
  const maxTrades = parseInt(limits.maxTrades || '20');

  if (callsUsed >= maxCalls) {
    log('info', 'agent_skip', { agent: agent.name, reason: 'calls_exhausted', calls_used: callsUsed, max_calls: maxCalls });
    return;
  }

  const posRows = await db.select().from(positions)
    .where(and(eq(positions.agentId, agent.id), eq(positions.status, 'open')));
  agent._positions = posRows as unknown as AgentPosition[];

  log('info', 'agent_call_start', { agent: agent.name, model: agent.model, calls_used: callsUsed });

  const result = await callAgent(agent, snapshot, {
    calls_remaining: maxCalls - callsUsed,
    trades_remaining: maxTrades - tradesUsed,
    max_calls: maxCalls,
    max_trades: maxTrades,
  });

  log('info', 'agent_call_done', {
    agent: agent.name,
    status: result.status,
    decision: result.parsed_decision?.decision ?? null,
    response_ms: result.response_time_ms,
    cost_usd: result.cost,
    tokens: result.token_usage,
  });

  const decisionId = await storeDecision(agent.id, snapshot.id, agent.model, result);

  await db.update(agentDailyLimits)
    .set({ callsUsed: String(callsUsed + 1) })
    .where(and(eq(agentDailyLimits.agentId, agent.id), eq(agentDailyLimits.date, today)));

  if (result.status === 'success' && result.parsed_decision) {
    const orderCount = await queueOrders(agent.id, decisionId, result.parsed_decision, snapshot);
    if (orderCount > 0) {
      await db.update(agentDailyLimits)
        .set({ tradesUsed: String(tradesUsed + orderCount) })
        .where(and(eq(agentDailyLimits.agentId, agent.id), eq(agentDailyLimits.date, today)));
    }
  }
}

async function queueOrders(agentId: string, decisionId: string, decision: any, snapshot: any): Promise<number> {
  if (!decision.orders || decision.orders.length === 0) return 0;
  let queued = 0;
  for (const order of decision.orders) {
    const quote = snapshot.quotes?.[order.symbol];
    if (!quote?.ltp) {
      log('warn', 'order_skip_no_price', { symbol: order.symbol });
      continue;
    }

    const slippage = config.league.slippagePct / 100;
    const isBuy = decision.decision === 'BUY';
    const execPrice = isBuy ? quote.ltp * (1 + slippage) : quote.ltp * (1 - slippage);
    const qty = order.all ? null : Math.max(1, Math.floor((order.amount || 0) / execPrice));

    await db.insert(orders).values({
      agentId, decisionId, symbol: order.symbol,
      side: isBuy ? 'BUY' : 'SELL',
      amount: String(order.amount || 0), quantity: qty,
      requestedPrice: String(quote.ltp),
      executedPrice: String(Math.round(execPrice * 100) / 100),
      slippage: String(slippage), status: 'pending',
    });
    queued++;
  }
  return queued;
}
