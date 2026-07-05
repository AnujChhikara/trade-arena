import express from 'express';
import cors from 'cors';
import http from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import rateLimit from 'express-rate-limit';
import { sql } from 'drizzle-orm';
import { config } from './config/index.js';
import { db } from './db/index.js';
import { agents } from './db/schema/agents.js';
import { marketSnapshots } from './db/schema/market.js';
import { agentDecisions } from './db/schema/decisions.js';
import redis from './config/redis.js';
import { cacheMiddleware } from './lib/cache.js';

import agentsRouter from './routes/agents.js';
import leaderboardRouter from './routes/leaderboard.js';
import snapshotsRouter from './routes/snapshots.js';
import decisionsRouter from './routes/decisions.js';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

app.use(cors({ origin: '*' }));
app.use(express.json());

const generalLimiter = rateLimit({
  windowMs: 60_000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests' },
});
app.use(generalLimiter);

function requireServiceKey(req: express.Request, res: express.Response, next: express.NextFunction) {
  const key = req.headers['x-service-key'];
  if (!key || key !== config.serviceKey) {
    res.status(401).json({ error: 'Invalid or missing x-service-key header' });
    return;
  }
  next();
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/agents', cacheMiddleware(15_000), agentsRouter);
app.use('/api/leaderboard', cacheMiddleware(10_000), leaderboardRouter);
app.use('/api/snapshots', cacheMiddleware(30_000), snapshotsRouter);
app.use('/api/decisions', cacheMiddleware(15_000), decisionsRouter);

app.get('/api/league/status', cacheMiddleware(10_000), async (_req, res) => {
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

app.post('/api/league/seed-agents', requireServiceKey, async (_req, res) => {
  try {
    const existing = await db.select({ count: sql<number>`count(*)` }).from(agents);
    if (existing[0]?.count > 0) { res.json({ message: 'Already seeded' }); return; }

    const defaults = [
      { name: 'Alpha GPT', model: 'openai/gpt-4o-mini', persona: 'momentum', systemPrompt: 'Aggressive momentum trader. Chases breakouts with tight stops. Prefers INTRADAY.' },
      { name: 'Claude Analyzer', model: 'anthropic/claude-3.5-haiku', persona: 'value', systemPrompt: 'Value-oriented investor. Buys dips, holds DELIVERY, wide stops. Fundamental analysis focus.' },
      { name: 'Kimi Surge', model: 'moonshot/kimi-8k', persona: 'scalper', systemPrompt: 'Quick intraday scalper. Small consistent profits, strict risk management. Only INTRADAY.' },
      { name: 'GLM Sentinel', model: 'zhipu/glm-4-9b', persona: 'balanced', systemPrompt: 'Balanced portfolio manager. Diversified across sectors, manages risk-reward ratio.' },
    ];

    for (const a of defaults) {
      await db.insert(agents).values(a);
    }
    res.status(201).json({ message: `Seeded ${defaults.length} agents` });
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
