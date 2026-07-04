import { Router, Request, Response } from 'express';
import { eq, desc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { marketSnapshots } from '../db/schema/market.js';
import { getSnapshotById, getLatestSnapshot } from '../services/snapshot-builder.js';

const router = Router();

router.get('/latest', async (_req: Request, res: Response) => {
  try {
    const snapshot = await getLatestSnapshot();
    if (!snapshot) { res.status(404).json({ error: 'No snapshots' }); return; }
    res.json(snapshot);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const snapshot = await getSnapshotById(req.params.id);
    if (!snapshot) { res.status(404).json({ error: 'Not found' }); return; }
    res.json(snapshot);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const rows = await db.select({
      id: marketSnapshots.id, capturedAt: marketSnapshots.capturedAt, snapshotHash: marketSnapshots.snapshotHash,
    }).from(marketSnapshots).orderBy(desc(marketSnapshots.capturedAt)).limit(limit).offset(offset);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
