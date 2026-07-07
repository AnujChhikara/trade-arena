import { Router, Request, Response } from 'express';
import { db } from '../db/index.js';
import { agents as agentsTable } from '../db/schema/agents.js';
import { positions } from '../db/schema/positions.js';
import { agentDecisions, orders } from '../db/schema/decisions.js';
import { eq, desc } from 'drizzle-orm';

const router: Router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const rows = await db.select().from(agentsTable).where(eq(agentsTable.isActive, true)).orderBy(agentsTable.createdAt);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const [agent] = await db.select().from(agentsTable).where(eq(agentsTable.id, req.params.id));
    if (!agent) { res.status(404).json({ error: 'Not found' }); return; }

    const pos = await db.select().from(positions)
      .where(eq(positions.agentId, req.params.id))
      .orderBy(desc(positions.enteredAt));

    const dec = await db.select({
      id: agentDecisions.id,
      createdAt: agentDecisions.createdAt,
      status: agentDecisions.status,
      parsedDecision: agentDecisions.parsedDecision,
      cost: agentDecisions.cost,
      responseTimeMs: agentDecisions.responseTimeMs,
    }).from(agentDecisions)
      .where(eq(agentDecisions.agentId, req.params.id))
      .orderBy(desc(agentDecisions.createdAt))
      .limit(50);

    const mapped = dec.map(d => ({
      id: d.id,
      created_at: d.createdAt,
      status: d.status,
      decision: (d.parsedDecision as any)?.decision ?? null,
      hypothesis: (d.parsedDecision as any)?.hypothesis ?? null,
      cost: d.cost,
      response_time_ms: d.responseTimeMs,
    }));

    res.json({ ...agent, positions: pos, recent_decisions: mapped });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/:id/orders', async (req: Request, res: Response) => {
  try {
    const rows = await db.select({
      id: orders.id,
      symbol: orders.symbol,
      side: orders.side,
      quantity: orders.quantity,
      amount: orders.amount,
      executed_price: orders.executedPrice,
      status: orders.status,
      rejection_reason: orders.rejectionReason,
      created_at: orders.createdAt,
      executed_at: orders.executedAt,
    }).from(orders)
      .where(eq(orders.agentId, req.params.id))
      .orderBy(desc(orders.createdAt))
      .limit(100);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
