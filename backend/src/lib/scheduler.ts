import { log } from './logger.js';

const CHECKPOINT_INTERVAL = 15 * 60 * 1000;

function toIST(d: Date): Date {
  return new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
}

function isMarketOpen(): boolean {
  const ist = toIST(new Date());
  const day = ist.getUTCDay();
  const t = ist.getUTCHours() * 100 + ist.getUTCMinutes();
  return day >= 1 && day <= 5 && t >= 915 && t <= 1530;
}

function isFridayLiquidation(): boolean {
  const ist = toIST(new Date());
  const t = ist.getUTCHours() * 100 + ist.getUTCMinutes();
  return ist.getUTCDay() === 5 && t >= 1530 && t < 1545;
}

export function startScheduler() {
  log('info', 'scheduler_started', { interval_ms: CHECKPOINT_INTERVAL });

  const tick = async () => {
    if (!isMarketOpen()) {
      log('info', 'scheduler_skip', { reason: 'market_closed' });
      return;
    }

    try {
      const { runCheckpoint } = await import('../services/agent-scheduler.js');
      const { processPendingOrders } = await import('../services/execution-service.js');
      const { checkRiskRules } = await import('../services/risk-service.js');

      log('info', 'tick_start');
      await runCheckpoint();
      const filled = await processPendingOrders();
      const closed = await checkRiskRules();

      const { writeAllLeaderboardDaily, settleWeekly } = await import('../services/leaderboard-service.js');
      await writeAllLeaderboardDaily();

      if (isFridayLiquidation()) {
        await settleWeekly();
      }

      log('info', 'tick_done', { orders_filled: filled, positions_closed: closed });
    } catch (err) {
      log('error', 'tick_error', { message: (err as Error).message });
    }
  };

  tick();
  setInterval(tick, CHECKPOINT_INTERVAL);
}
