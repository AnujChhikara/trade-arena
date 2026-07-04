import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../db/index.js';
import { agents as agentsTable } from '../db/schema/agents.js';
import { positions } from '../db/schema/positions.js';
import { agentDecisions } from '../db/schema/decisions.js';
import { agentDailyLimits, agentMemory } from '../db/schema/agents.js';
import { eq, and, desc } from 'drizzle-orm';

const router = Router();

const CreateAgentSchema = z.object({
  name: z.string().min(1).max(100),
  model: z.string().min(1),
  system_prompt: z.string().min(1),
  persona: z.string().optional(),
});

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

router.post('/', async (req: Request, res: Response) => {
  const parsed = CreateAgentSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  try {
    const [inserted] = await db.insert(agentsTable).values({
      name: parsed.data.name, model: parsed.data.model,
      systemPrompt: parsed.data.system_prompt, persona: parsed.data.persona,
    }).returning();
    res.status(201).json(inserted);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
