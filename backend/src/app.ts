import express from 'express';
import cors from 'cors';
import http from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import { config } from './config/index.js';
import { db } from './db/index.js';
import { marketSnapshots } from './db/schema/market.js';
import { agentDecisions } from './db/schema/decisions.js';
import { sql } from 'drizzle-orm';
import redis from './config/redis.js';

import agentsRouter from './routes/agents.js';
import leaderboardRouter from './routes/leaderboard.js';
import snapshotsRouter from './routes/snapshots.js';
import decisionsRouter from './routes/decisions.js';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

app.use(cors({ origin: '*' }));

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
