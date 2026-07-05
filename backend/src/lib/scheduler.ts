const CHECKPOINT_INTERVAL = 15 * 60 * 1000;

function isMarketOpen(): boolean {
  const now = new Date();
  const day = now.getDay();
  const ist = now.getHours() * 100 + now.getMinutes();
  return day >= 1 && day <= 5 && ist >= 915 && ist <= 1530;
}

export function startScheduler() {
  console.log('[Scheduler] Auto-scheduler started (every 15 min during market hours)');

  const tick = async () => {
    if (!isMarketOpen()) return;

    try {
      const { runCheckpoint } = await import('../services/agent-scheduler.js');
      const { processPendingOrders } = await import('../services/execution-service.js');
      const { checkRiskRules } = await import('../services/risk-service.js');

      console.log('[Scheduler] Tick — starting checkpoint cycle');
      await runCheckpoint();
      const filled = await processPendingOrders();
      const closed = await checkRiskRules();
      console.log(`[Scheduler] Tick done — ${filled} orders filled, ${closed} positions closed`);
    } catch (err) {
      console.error('[Scheduler] Tick error:', (err as Error).message);
    }
  };

  tick();
  setInterval(tick, CHECKPOINT_INTERVAL);
}
