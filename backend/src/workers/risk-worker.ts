import '../config/index.js';
import { checkRiskRules } from '../services/risk-service.js';

async function main() {
  console.log('[Worker:Risk] Starting...');
  const interval = 60_000;

  const tick = async () => {
    try {
      const closed = await checkRiskRules();
      if (closed > 0) console.log(`[Worker:Risk] Closed ${closed} positions`);
    } catch (err) { console.error('[Worker:Risk]', (err as Error).message); }
  };

  await tick();
  setInterval(tick, interval);
  process.on('SIGTERM', () => process.exit(0));
}

main();
