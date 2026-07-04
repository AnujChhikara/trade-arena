import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { agentDecisions } from '../db/schema/decisions.js';
import { agents } from '../db/schema/agents.js';

const QuerySchema = z.object({
  agent_id: z.string().uuid().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  limit: z.coerce.number().min(1).max(200).optional(),
});

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const query = QuerySchema.safeParse(req.query);
  if (!query.success) { res.status(400).json({ error: query.error.flatten() }); return; }

  try {
    const { agent_id, date, limit = 50 } = query.data;
    const conditions = [];

    if (agent_id) conditions.push(eq(agentDecisions.agentId, agent_id));
    if (date) conditions.push(eq(agentDecisions.createdAt, date as any));

    const rows = await db.select({
      id: agentDecisions.id, agentId: agentDecisions.agentId, model: agentDecisions.model,
      status: agentDecisions.status, parsedDecision: agentDecisions.parsedDecision,
      cost: agentDecisions.cost, responseTimeMs: agentDecisions.responseTimeMs,
      createdAt: agentDecisions.createdAt,
    }).from(agentDecisions)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(agentDecisions.createdAt)).limit(limit);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const [row] = await db.select({
      d: agentDecisions, a: agents,
    }).from(agentDecisions)
      .innerJoin(agents, eq(agents.id, agentDecisions.agentId!))
      .where(eq(agentDecisions.id, req.params.id));

    if (!row) { res.status(404).json({ error: 'Not found' }); return; }

    res.json({
      ...row.d, agent_name: row.a.name,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
