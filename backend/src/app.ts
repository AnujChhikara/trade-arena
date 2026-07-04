import express from 'express';
import cors from 'cors';
import http from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import { z } from 'zod';
import { config } from './config/index.js';
import { db } from './db/index.js';
import { agents } from './db/schema/agents.js';
import { marketSnapshots } from './db/schema/market.js';
import { agentDecisions } from './db/schema/decisions.js';
import { eq, sql } from 'drizzle-orm';
import redis from './config/redis.js';

import agentsRouter from './routes/agents.js';
import leaderboardRouter from './routes/leaderboard.js';
import snapshotsRouter from './routes/snapshots.js';
import decisionsRouter from './routes/decisions.js';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/agents', agentsRouter);
app.use('/api/leaderboard', leaderboardRouter);
app.use('/api/snapshots', snapshotsRouter);
app.use('/api/decisions', decisionsRouter);

app.get('/api/league/status', async (_req, res) => {
  try {
    const now = new Date();
    const day = now.getDay();
    const ist = now.getHours() * 100 + now.getMinutes();
    const isOpen = day >= 1 && day <= 5 && ist >= 915 && ist <= 1530;
    const nextCp = config.checkpoints.find(t => { const [h, m] = t.split(':').map(Number); return (h * 100 + m) > ist; }) || config.checkpoints[0];

    const [snapCount] = await db.select({ count: sql<number>`count(*)` }).from(marketSnapshots);
    const [decCount] = await db.select({ count: sql<number>`count(*)` }).from(agentDecisions);

    res.json({
      status: isOpen ? 'active' : 'idle',
      day: ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][day],
      is_friday: day === 5, next_checkpoint: nextCp,
      snapshot_count: snapCount?.count || 0, decision_count: decCount?.count || 0,
    });
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

const SeedAgentSchema = z.object({
  name: z.string().min(1), model: z.string().min(1),
  persona: z.string().optional(), system_prompt: z.string().min(1),
});

app.post('/api/league/seed-agents', async (_req, res) => {
  try {
    const existing = await db.select({ count: sql<number>`count(*)` }).from(agents);
    if (existing[0]?.count > 0) { res.json({ message: 'Already seeded' }); return; }

    const defaults = [
      { name: 'Momentum Mike', model: 'openai/gpt-4o-mini', persona: 'momentum', systemPrompt: 'Momentum trader. Chases breakouts, tight stops.' },
      { name: 'Value Vera', model: 'openai/gpt-4o-mini', persona: 'value', systemPrompt: 'Value investor. Buys dips, wide stops.' },
      { name: 'Scalper Sam', model: 'openai/gpt-4o-mini', persona: 'scalper', systemPrompt: 'Intraday scalper. Quick profits, same-day exits.' },
      { name: 'Balanced Bella', model: 'anthropic/claude-sonnet-5', persona: 'balanced', systemPrompt: 'Balanced PM. Diversified, manages risk.' },
      { name: 'Index Izzy', model: 'openai/gpt-4o-mini', persona: 'index', systemPrompt: 'Capital preservation. Rare active bets.' },
    ];

    for (const a of defaults) {
      await db.insert(agents).values(a);
    }
    res.status(201).json({ message: `Seeded ${defaults.length} agents` });
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

app.post('/api/league/checkpoint', async (_req, res) => {
  try {
    const { runCheckpoint } = await import('./services/agent-scheduler.js');
    await runCheckpoint();
    res.json({ message: 'Checkpoint done' });
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

app.post('/api/league/execute', async (_req, res) => {
  try {
    const { processPendingOrders } = await import('./services/execution-service.js');
    const c = await processPendingOrders();
    res.json({ message: `Processed ${c} orders` });
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

app.post('/api/league/risk-check', async (_req, res) => {
  try {
    const { checkRiskRules } = await import('./services/risk-service.js');
    const c = await checkRiskRules();
    res.json({ message: `Closed ${c} positions` });
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

app.post('/api/league/reset', async (_req, res) => {
  try {
    await db.delete(marketSnapshots);
    await db.delete(agentDecisions);
    await db.delete(agentDecisions).where(eq(agentDecisions.agentId, ''));
    await redis.flushall();
    res.json({ message: 'Reset done' });
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

wss.on('connection', (ws: WebSocket) => {
  console.log('[WS] Connected');
  const sub = redis.duplicate();
  sub.subscribe('checkpoint:done');
  sub.on('message', (ch, msg) => { if (ws.readyState === WebSocket.OPEN) ws.send(msg); });
  ws.on('close', () => { sub.unsubscribe(); sub.quit(); });
  ws.send(JSON.stringify({ channel: 'connected', timestamp: new Date().toISOString() }));
});

server.listen(config.port, () => {
  console.log(`[App] Trade Arena running on :${config.port}`);
  console.log(`[App] OpenRouter: ${config.openRouter.apiKey ? 'configured' : 'MOCK MODE'}`);
});

process.on('SIGTERM', () => { server.close(); redis.quit(); process.exit(0); });
