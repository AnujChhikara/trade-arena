import { eq, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { orders } from '../db/schema/decisions.js';
import { positions } from '../db/schema/positions.js';
import { agents } from '../db/schema/agents.js';
import { config } from '../config/index.js';
import redis from '../config/redis.js';
import { log } from '../lib/logger.js';

export async function processPendingOrders(): Promise<number> {
  const pending = await db.select().from(orders)
    .where(eq(orders.status, 'pending'))
    .orderBy(orders.createdAt)
    .limit(100);

  for (const order of pending) {
    await executeOrder(order);
  }

  return pending.length;
}

async function executeOrder(order: typeof orders.$inferSelect) {
  const quote = await getQuote(order.symbol);
  if (!quote?.ltp) {
    await db.update(orders).set({ status: 'rejected', rejectionReason: 'No price' }).where(eq(orders.id, order.id));
    return;
  }

  const uc = order.side === 'BUY' && quote.ltp >= (quote.prev_close * 1.20);
  const lc = order.side === 'SELL' && quote.ltp <= (quote.prev_close * 0.80);

  if (uc) { await updateOrder(order.id, 'circuit_locked', 'Upper circuit'); return; }
  if (lc) { await updateOrder(order.id, 'circuit_locked', 'Lower circuit'); return; }

  const slip = config.league.slippagePct / 100;
  const exPrice = order.side === 'BUY'
    ? Math.round(quote.ltp * (1 + slip) * 100) / 100
    : Math.round(quote.ltp * (1 - slip) * 100) / 100;

  const qty = order.quantity || Math.max(1, Math.floor(parseFloat(order.amount || '0') / exPrice));

  if (order.side === 'BUY') {
    const cash = await getAvailableCash(order.agentId!);
    const cost = qty * exPrice;
    if (cost > cash) {
      await updateOrder(order.id, 'rejected', `Insufficient cash: need ₹${cost}, have ₹${cash}`);
      return;
    }

    const ok = await checkExposure(order.agentId!, order.symbol, cost);
    if (!ok) {
      await updateOrder(order.id, 'rejected', 'Exceeds exposure limit');
      return;
    }

    await updateOrder(order.id, 'filled');
    await db.insert(positions).values({
      agentId: order.agentId!, symbol: order.symbol, quantity: qty,
      entryPrice: String(exPrice), currentPrice: String(quote.ltp),
      strategyType: 'INTRADAY', status: 'open',
    });
    log('info', 'order_filled', { side: 'BUY', symbol: order.symbol, qty, price: exPrice });
  } else {
    const opens = await db.select().from(positions)
      .where(and(eq(positions.agentId, order.agentId!), eq(positions.symbol, order.symbol), eq(positions.status, 'open')))
      .orderBy(positions.enteredAt);

    if (opens.length === 0) {
      await updateOrder(order.id, 'rejected', 'No open position');
      return;
    }

    let sellQty = qty, totalPnl = 0;
    for (const pos of opens) {
      const q = Math.min(sellQty, pos.quantity);
      if (q <= 0) continue;
      const pnl = q * (exPrice - parseFloat(pos.entryPrice));
      totalPnl += pnl;
      const rem = pos.quantity - q;
      const curPnl = parseFloat(pos.realizedPnl ?? '0');
      if (rem <= 0) {
        await db.update(positions).set({ quantity: 0, status: 'closed', closedAt: new Date(), realizedPnl: String(curPnl + pnl), currentPrice: String(exPrice) }).where(eq(positions.id, pos.id));
      } else {
        await db.update(positions).set({ quantity: rem, realizedPnl: String(curPnl + pnl), currentPrice: String(exPrice) }).where(eq(positions.id, pos.id));
      }
      sellQty -= q;
      if (sellQty <= 0) break;
    }

    const filled = qty - sellQty;
    await db.update(orders).set({ executedPrice: String(exPrice), quantity: filled, status: filled > 0 ? 'filled' : 'rejected', executedAt: new Date() }).where(eq(orders.id, order.id));
    log('info', 'order_filled', { side: 'SELL', symbol: order.symbol, qty: filled, price: exPrice, pnl: totalPnl });

    if (totalPnl !== 0) {
      const [agent] = await db.select({ capital: agents.capital }).from(agents).where(eq(agents.id, order.agentId!));
      await db.update(agents).set({ capital: String(parseFloat(agent.capital ?? '1000000') + totalPnl) }).where(eq(agents.id, order.agentId!));
    }
  }
}

async function updateOrder(id: string, status: string, reason?: string) {
  const upd: any = { status, executedAt: new Date() };
  if (reason) upd.rejectionReason = reason;
  await db.update(orders).set(upd).where(eq(orders.id, id));
}

async function getQuote(symbol: string) {
  const cached = await redis.get(`quote:${symbol}.NS`);
  return cached ? JSON.parse(cached) as { ltp: number; prev_close: number } : null;
}

async function getAvailableCash(agentId: string): Promise<number> {
  const [a] = await db.select({ capital: agents.capital }).from(agents).where(eq(agents.id, agentId));
  if (!a) return 0;
  const capital = parseFloat(a.capital || '1000000');

  const inv = await db.select({ price: positions.entryPrice, qty: positions.quantity }).from(positions)
    .where(and(eq(positions.agentId, agentId), eq(positions.status, 'open')));
  const invested = inv.reduce((s, r) => s + parseFloat(r.price || '0') * r.qty, 0);

  return capital - invested;
}

async function checkExposure(agentId: string, symbol: string, buyAmount: number): Promise<boolean> {
  const maxEx = config.league.maxSingleStockExposure / 100;
  const [a] = await db.select({ capital: agents.capital }).from(agents).where(eq(agents.id, agentId));
  const capital = parseFloat(a?.capital || '1000000');

  const existing = await db.select({ val: positions.entryPrice }).from(positions)
    .where(and(eq(positions.agentId, agentId), eq(positions.symbol, symbol), eq(positions.status, 'open')));
  const existingVal = existing.reduce((s, r) => s + parseFloat(r.val || '0'), 0);

  return (existingVal + buyAmount) / capital <= maxEx;
}
