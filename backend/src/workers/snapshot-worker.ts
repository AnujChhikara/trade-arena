import '../config/index.js';
import { buildSnapshot } from '../services/snapshot-builder.js';

async function main() {
  console.log('[Worker:Snapshot] Starting...');
  const interval = 5 * 60 * 1000;
  let running = false;

  const tick = async () => {
    if (running) return;
    running = true;
    try { await buildSnapshot(); }
    catch (err) { console.error('[Worker:Snapshot]', (err as Error).message); }
    running = false;
  };

  await tick();
  setInterval(tick, interval);
  process.on('SIGTERM', () => process.exit(0));
}

main();
