import '../config/index.js';
import { processPendingOrders } from '../services/execution-service.js';

async function main() {
  console.log('[Worker:Execution] Starting...');
  const interval = 30_000;

  const tick = async () => {
    try {
      const count = await processPendingOrders();
      if (count > 0) console.log(`[Worker:Execution] Processed ${count} orders`);
    } catch (err) { console.error('[Worker:Execution]', (err as Error).message); }
  };

  await tick();
  setInterval(tick, interval);
  process.on('SIGTERM', () => process.exit(0));
}

main();
