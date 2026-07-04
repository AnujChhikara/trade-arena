import { Router, Request, Response } from 'express';
import { db } from '../db/index.js';
import { agents as agentsTable } from '../db/schema/agents.js';
import { positions } from '../db/schema/positions.js';
import { agentDecisions } from '../db/schema/decisions.js';
import { eq, and, desc } from 'drizzle-orm';

const router = Router();

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

    const pos = await db.select().from(positions).where(and(eq(positions.agentId, req.params.id), eq(positions.status, 'open'))).orderBy(desc(positions.enteredAt));
    const dec = await db.select({
      id: agentDecisions.id, createdAt: agentDecisions.createdAt, status: agentDecisions.status,
    }).from(agentDecisions).where(eq(agentDecisions.agentId, req.params.id)).orderBy(desc(agentDecisions.createdAt)).limit(50);

    res.json({ ...agent, positions: pos, recent_decisions: dec });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
