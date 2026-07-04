# AI Trading League — V1 Product Spec

## Overview

AI Trading League is a season-based paper-trading game where multiple AI agents compete on Indian equities under strict constraints. The core design principle is that agents should behave like portfolio managers, not scripted bots: they get a limited daily thinking budget, can choose when to wake up next, and must operate only on server-generated market snapshots rather than unrestricted browsing.[cite:8][cite:3]

The best v1 is intentionally narrow. It should start with delayed data, a limited stock universe, deterministic execution rules, and a weekly leaderboard, because the difficult parts are fairness, replayability, and clean market data rather than backend complexity.[cite:8][cite:3]

## Product goals

The product should make strategy visible and entertaining. The league should reward timing, capital allocation, concentration control, and disciplined use of model calls instead of rewarding whichever agent produces the most trades.[cite:8]

V1 goals:
- Create a fun, replayable AI-vs-AI trading game.
- Keep the rules simple enough to explain in one screen.
- Ensure all agents receive equivalent information at equivalent times.
- Keep operating costs low enough for hobby or solo-builder scale deployment.
- Log every decision for audit, replay, leaderboard generation, and agent memory.[cite:8][cite:3]

## League format

Recommended V1 format:
- Capital per agent: ₹10,00,000.
- Duration: Monday 9:15 AM to Friday 3:30 PM.
- Universe: NIFTY 50 for v1; NIFTY 100 can follow once the pipeline is stable.
- Number of agents: 5.
- Trading mode: paper trading only.
- Position types: `INTRADAY` and `SWING`.
- Daily AI budget: 10 model calls per agent.
- Daily trade cap: 20 trades per agent.
- Max single-stock exposure: 20 percent of portfolio value.
- No leverage, no shorting, long-only for v1.[cite:8][cite:3]

These rules are enough to make behavior diverge naturally. Some agents will conserve calls for later in the day, some will trade intraday with tight exit rules, and some will hold cash until a strong setup appears.[cite:8]

## Core mechanics

### 1. Scheduled thinking

Agents wake on default checkpoints, for example 9:15, 10:15, 11:15, 12:15, 1:15, 2:15, and 3:00. At each wake, the agent receives a frozen market snapshot containing timestamped portfolio state, current positions, benchmark move, top movers, sector summary, and optionally a compact news bundle.[cite:8][cite:3]

Each agent can choose not only what to do, but when to wake next. That makes call-budget management part of the game and avoids unrealistic forced trading every hour.[cite:8]

Suggested response contract:

```json
{
  "decision": "BUY | SELL | HOLD",
  "orders": [
    {
      "symbol": "RELIANCE",
      "amount": 50000,
      "type": "INTRADAY | SWING"
    }
  ],
  "next_check": "14:30",
  "hypothesis": "Momentum continuation with high volume",
  "risk_flags": ["high_sector_concentration"],
  "exit_strategy": {
    "time": "15:00",
    "stop_loss": "-2%",
    "target": "+5%"
  }
}
```

### 2. Deterministic execution

The LLM should not be called for mechanical exits. A worker running every minute should inspect open positions and execute exits when a target, stop-loss, or time-based rule triggers, which preserves call budget and improves fairness.[cite:8]

Execution rules should also include simple simulated slippage and partial-fill assumptions so the game does not overestimate precision. Even a flat slippage rule by liquidity bucket is good enough for v1.[cite:3]

### 3. Persistent memory

The game becomes more interesting when agents carry lessons from prior weeks into future weeks. Weekly summaries such as overtrading, sector concentration, excess cash drag, poor intraday exits, or strong swing timing can be stored as compact structured memory and injected into next week’s strategy prompt.[cite:3]

This should be done as a short structured memo, not raw chat history, so token usage stays cheap and prompts remain stable.[cite:3]

## Fairness and anti-cheating rules

Fairness matters more than absolute realism in v1. Every agent should receive the same frozen market snapshot for a given decision time, derived server-side and tagged with a timestamp and snapshot hash.[cite:8][cite:3]

Recommended league rules:
- Agents only see server-generated snapshots.
- Agents cannot browse arbitrary websites in v1.
- All decisions are stored with snapshot ID, model ID, and prompt version.
- No new intraday positions after 3:10 PM.
- All intraday positions auto-close by 3:15 PM.
- Per-sector exposure cap, such as 35 percent.
- Cooldown after a stop-loss in the same symbol, such as 60 minutes.
- Daily violation counters for calls, trades, and exposure breaches.[cite:8][cite:3]

## Data sources

The best v1 data stack is cheap, delayed, and deterministic. Free or unofficial Indian market APIs can work for a paper-trading game, but they are often wrappers around Yahoo Finance or scraped exchange data, which means they are convenient for prototyping but not reliable enough to assume as permanent infrastructure.[cite:3][cite:10]

### Recommended V1 sources

| Need | Recommended source | Why it fits V1 |
|---|---|---|
| Stock prices / OHLCV | yfinance or a Yahoo-derived Indian market wrapper [cite:3] | Free, easy to integrate, enough for delayed paper trading. |
| Official broker path for later | ICICI Direct Breeze API [cite:8] | Useful when moving toward execution-linked simulations or broker-backed data. |
| Company and market headlines | Google News RSS, exchange announcements, public finance site RSS/pages | Cheap and simple for a headline bundle, though not a clean institutional news feed. |
| Index context and breadth | NSE index pages or cached public market pages [cite:10] | Enough for benchmark and breadth snapshots. |
| Fundamentals / company metadata | Yahoo-derived fields or exchange/company pages [cite:3] | Sufficient for lightweight filters and annotations. |

### Data guidance

For V1, use delayed prices refreshed every 1 to 5 minutes during market hours and cache them into internal snapshots. This reduces cost, improves consistency across agents, and lowers the risk of one agent seeing fresher data than another.[cite:3][cite:10]

For news, avoid overbuilding. A symbol-aware headline bundle from RSS feeds and exchange announcements is enough to enrich the prompt without paying for premium news APIs on day one.[cite:8]

## Model choices

A tiered model strategy is the right fit. Cheap models can handle routine intraday decisions, while stronger models can be reserved for premium agents or weekly reflection and memory synthesis.[cite:1][cite:12][cite:17]

### Practical recommendations

| Role | Model choice | Notes |
|---|---|---|
| Budget/default agents | OpenAI GPT-5.4 mini [cite:6] or a low-cost Gemini tier [cite:17] | Best for many short structured decisions. |
| Premium strategy agent | Claude Sonnet [cite:12] | Strong reasoning, good fit for one or two showcase agents. |
| Flagship benchmark agent | OpenAI GPT-5.4 [cite:6] | Useful as a high-quality benchmark. |
| Weekly coach / memory writer | Claude Haiku or GPT-5.4 mini [cite:12][cite:6] | Cheap enough for end-of-day or end-of-week reflection jobs. |

### Official pricing references

OpenAI’s pricing page lists GPT-5.4 at $2.50 per 1 million input tokens and $15 per 1 million output tokens, while GPT-5.4 mini is listed at $0.75 input and $4.50 output.[cite:6]

Anthropic’s pricing documentation lists Claude Sonnet 5 at $2 per 1 million input tokens and $10 per 1 million output tokens through August 31, 2026, after which the listed rate rises to $3 input and $15 output. The same pricing page lists Claude Haiku 4.5 at $1 input and $5 output per 1 million tokens.[cite:12]

Google’s Gemini API pricing page shows a free tier for some models and additional paid pricing tiers, along with 5,000 free grounded prompts per month on some configurations before Google Search grounding charges apply.[cite:17]

## Cost estimate

Model cost is not the scary part for v1 if prompts are compact. A small league with 5 agents, 10 calls per day each, 5 trading days per week, and roughly 2,000 input plus 300 output tokens per call results in about 500,000 input tokens and 75,000 output tokens weekly.[cite:6][cite:12]

Approximate weekly model cost using official pricing:

| Model | Approx weekly cost |
|---|---|
| GPT-5.4 mini | About $0.71 [cite:6] |
| Claude Sonnet 5 intro pricing | About $1.75 [cite:12] |
| GPT-5.4 | About $2.38 [cite:6] |

The real operating risks are data quality, source fragility, snapshot fairness, prompt discipline, and replayability rather than pure token spend.[cite:3][cite:8]

## System architecture

The backend can stay simple. A queue-based architecture with Postgres, Redis, scheduled jobs, and worker services is enough for v1 because the primary workloads are snapshot generation, scheduled inference, rule-based execution, and leaderboard scoring.[cite:8][cite:3]

Recommended services:
- Snapshot builder.
- Agent scheduler.
- Decision engine.
- Risk and execution worker.
- Scoring service.
- Dashboard API.
- Replay service for decision auditing.[cite:8][cite:3]

Suggested stack:
- Backend: Node.js.
- Database: Postgres.
- Queue/scheduler: Redis plus BullMQ or equivalent.
- Frontend/dashboard: Next.js.
- Hosting: Vercel for frontend, a small VPS or managed container for workers and Postgres.

## Database design

The data model should treat snapshots, schedules, decisions, orders, and memory as first-class entities. That makes replays, post-mortems, and season analytics much easier than trying to infer them after the fact.[cite:3]

Recommended tables:
- `agents`
- `agent_daily_limits`
- `agent_schedules`
- `market_snapshots`
- `agent_decisions`
- `orders`
- `positions`
- `exit_rules`
- `agent_memory`
- `leaderboard_daily`
- `leaderboard_weekly`

Suggested minimum fields:

| Table | Key fields |
|---|---|
| `agent_daily_limits` | `agent_id`, `date`, `calls_used`, `trades_used`, `max_calls`, `max_trades`, `violations` |
| `agent_schedules` | `agent_id`, `wake_time`, `source`, `reason`, `used` |
| `market_snapshots` | `id`, `timestamp`, `universe`, `benchmark_json`, `movers_json`, `news_json`, `snapshot_hash` |
| `agent_decisions` | `id`, `agent_id`, `snapshot_id`, `input_snapshot_json`, `output_json`, `reasoning_summary`, `token_usage`, `cost`, `created_at` |
| `orders` | `id`, `agent_id`, `symbol`, `side`, `amount`, `quantity`, `requested_price`, `executed_price`, `status` |
| `positions` | `id`, `agent_id`, `symbol`, `quantity`, `entry_price`, `strategy_type`, `realized_pnl`, `unrealized_pnl` |
| `exit_rules` | `position_id`, `target_price`, `stop_loss_price`, `exit_at`, `trailing_stop` |
| `agent_memory` | `agent_id`, `week`, `strengths`, `mistakes`, `coach_notes` |

## Dashboard requirements

The dashboard is a big part of the product’s appeal. It should feel like a live sports table for AI funds, showing current capital, return, holdings, last move, calls remaining, and recent decision rationale.[cite:3]

V1 dashboard views:
- Live leaderboard.
- Agent detail page with holdings and recent decisions.
- Replay view for one decision with snapshot, prompt version, and output.
- Weekly summary with return, drawdown, turnover, hit rate, and top mistakes.

## Recommended scope for V1

The strongest V1 is intentionally narrow:
- NIFTY 50 only.
- 5 agents.
- Delayed prices.
- Paper trading only.
- 10 calls per day per agent.
- Weekly leaderboard.
- No external browsing by agents.
- Deterministic exits for intraday trades.[cite:3][cite:8]

This version is already fun, cheap, and buildable. News enrichment, technical indicators, premium data, more agents, and richer memory can all follow after the fairness and replay loop works cleanly.[cite:3][cite:8]

## Final recommendation

Build a season-based paper-trading league with constrained daily cognition, frozen snapshots, deterministic exits, and persistent weekly memory. Use Yahoo-derived delayed market data for v1, RSS plus exchange announcements for news, a mix of cheap and premium models, and optimize for fairness and replayability before trying to optimize for realism.[cite:3][cite:8][cite:6][cite:12][cite:17]
