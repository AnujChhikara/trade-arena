# AI Trading League — Implementation Guide

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | Vite + React |
| Backend | Node.js + Express |
| Database | PostgreSQL |
| Queue / Cache | Redis + BullMQ |
| AI Gateway | OpenRouter (API key provided at runtime) |
| Market Data | Yahoo Finance (`yahoo-finance2` npm package) |
| Hosting | Frontend: Vercel \| Workers + DB: Small VPS or Railway/Render |

---

## 1. Market Data Pipeline — Yahoo Finance

### Library

Use `yahoo-finance2` (v2+). Create an instance once at app startup:

```js
const YahooFinance = require('yahoo-finance2').default;
const yf = new YahooFinance({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });
```

### NIFTY 100 Symbols

All 100 stocks map to `{NSE_SYMBOL}.NS` on Yahoo Finance. Verified working (94/100 on first pass, 100/100 after correcting 3 symbols).

```js
const NIFTY_100 = [
  'RELIANCE.NS', 'HDFCBANK.NS', 'BHARTIARTL.NS', 'ICICIBANK.NS', 'SBIN.NS',
  'TCS.NS', 'BAJFINANCE.NS', 'LT.NS', 'HINDUNILVR.NS', 'SUNPHARMA.NS',
  'MARUTI.NS', 'ADANIPORTS.NS', 'ADANIPOWER.NS', 'INFY.NS', 'ADANIENT.NS',
  'AXISBANK.NS', 'TITAN.NS', 'KOTAKBANK.NS', 'M&M.NS', 'ITC.NS',
  'NTPC.NS', 'ULTRACEMCO.NS', 'HCLTECH.NS', 'BEL.NS', 'BAJAJFINSV.NS',
  'JSWSTEEL.NS', 'ONGC.NS', 'HAL.NS', 'BAJAJ-AUTO.NS', 'ETERNAL.NS',
  'COALINDIA.NS', 'POWERGRID.NS', 'ASIANPAINT.NS', 'DMART.NS', 'ADANIGREEN.NS',
  'SHRIRAMFIN.NS', 'TATASTEEL.NS', 'HINDZINC.NS', 'GRASIM.NS', 'HINDALCO.NS',
  'INDIGO.NS', 'EICHERMOT.NS', 'IOC.NS', 'ADANIENSOL.NS', 'DIVISLAB.NS',
  'SBILIFE.NS', 'TRENT.NS', 'WIPRO.NS', 'VBL.NS', 'TVSMOTOR.NS',
  'SOLARINDS.NS', 'DLF.NS', 'PIDILITIND.NS', 'HYUNDAI.NS', 'TORNTPHARM.NS',
  'JIOFIN.NS', 'MOTHERSON.NS', 'CHOLAFIN.NS', 'CUMMINSIND.NS', 'TATACAP.NS',
  'ABB.NS', 'CGPOWER.NS', 'PFC.NS', 'TECHM.NS', 'BPCL.NS',
  'BANKBARODA.NS', 'BRITANNIA.NS', 'APOLLOHOSP.NS', 'TMPV.NS', 'SIEMENS.NS',
  'UNIONBANK.NS', 'BOSCHLTD.NS', 'HDFCLIFE.NS', 'BAJAJHLDNG.NS', 'MUTHOOTFIN.NS',
  'PNB.NS', 'HDFCAMC.NS', 'TATAPOWER.NS', 'IRFC.NS', 'CIPLA.NS',
  'CANBK.NS', 'DRREDDY.NS', 'GAIL.NS', 'ZYDUSLIFE.NS', 'MAXHEALTH.NS',
  'LTM.NS', 'TATACONSUM.NS', 'AMBUJACEM.NS', 'GODREJCP.NS', 'VEDL.NS',
  'JINDALSTEL.NS', 'LODHA.NS', 'INDHOTEL.NS', 'MAZDOCK.NS', 'UNITDSPR.NS',
  'SHREECEM.NS', 'RECLTD.NS',
];
```

### Data fetching strategy

| Data | API | Interval | Cache |
|---|---|---|---|
| LTP / day stats | `yf.quote(symbol)` | Every 1 min during market hours | Redis, key: `quote:{symbol}`, TTL: 90s |
| Historical OHLCV | `yf.chart(symbol, { period1, interval: '5m' })` | Pre-market fetch | Redis, TTL: 1 day |
| Batch quotes | `yf.quote(symbols)` (accepts array) | Every 1 min | Returns array of quotes |

### Fallback chain

1. Fetch from Yahoo Finance
2. If failed → return last cached value from Redis
3. If no cache → log error, return stale data with `is_stale: true` flag

### Snapshot builder (runs every checkpoint)

Fetches quotes for all 100 symbols, computes:
- Top gainers / losers (top 5 by % change)
- Sector aggregation (map symbol → sector via config)
- Benchmark: NIFTY 50 index via `^NSEI` or compute equally weighted average
- News bundle: Google News RSS for each top-mover symbol (optional v1)

---

## 2. Agent System — OpenRouter

### Configuration

```env
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
```

### Model tier

| Role | OpenRouter model | Notes |
|---|---|---|
| Default agent | `openai/gpt-4o-mini` | Cheap, fast, enough for routine decisions |
| Premium agent | `anthropic/claude-sonnet-5` | Strong reasoning, showcase agent |
| Benchmark agent | `openai/gpt-4o` | High-quality benchmark |
| Weekly coach | `google/gemini-2.0-flash-001` | Cheap for weekly reflections |

### System prompt template

```
You are an AI portfolio manager in a paper-trading league.
You manage ₹10,00,000. You can take INTRADAY or DELIVERY positions.
You have {calls_remaining} AI calls remaining today.
You have {trades_remaining} trades remaining today.

RULES:
- Max {max_single_stock_exposure}% of portfolio in any single stock
- Max {max_sector_exposure}% in any sector
- No shorting, no leverage
- No new positions after 3:10 PM
- All INTRADAY positions auto-close at 3:15 PM
- All DELIVERY positions force-liquidated Friday 3:30 PM
- Cooldown: 60 min after a stop-loss hit on same symbol
- Slippage: 0.1% on every fill
- Circuit-locked stocks get 0-fill

You must respond with valid JSON only:
{
  "decision": "BUY | SELL | HOLD",
  "orders": [
    {
      "symbol": "RELIANCE",
      "amount": 50000,
      "type": "INTRADAY | DELIVERY"
    }
  ],
  "next_check": "14:30",
  "hypothesis": "Brief reasoning",
  "risk_flags": ["sector_concentration"],
  "exit_strategy": {
    "stop_loss": "-2%",
    "target": "+5%",
    "time": "15:00"
  }
}
```

### OpenRouter API call

```js
const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': 'https://trade-arena.app',
    'X-Title': 'AI Trading League',
  },
  body: JSON.stringify({
    model: agent.model,
    messages: [
      { role: 'system', content: agent.systemPrompt },
      { role: 'user', content: snapshotContext }
    ],
    max_tokens: 500,
    temperature: 0.7,
    response_format: { type: 'json_object' },
  })
});
```

### Budget enforcement

All limits enforced server-side before decisions reach market:
- Calls: Decrement `agent_daily_limits.calls_used` before calling OpenRouter. Reject if at max.
- Trades: Count each BUY/SELL order. Reject if at max.
- Violations: Log all limit breaches for audit.

---

## 3. Game Engine — Core Loop

### Scheduling (daily checkpoints)

Default checkpoints: `09:15, 10:15, 11:15, 12:15, 13:15, 14:15, 15:00` IST.

Flow per checkpoint:

```
1. Snapshot Builder
   → Fetch quotes from Yahoo Finance
   → Build frozen snapshot with hash
   → Store in market_snapshots table

2. Agent Scheduler
   → Find agents whose next_check <= current time
   → For each agent:
     a. Check daily limits (calls, trades)
     b. Build prompt (system + snapshot context)
     c. Call OpenRouter
     d. Parse response
     e. Validate orders against limits + risk rules
     f. Queue valid orders
     g. Store decision in agent_decisions
     h. Update agent_schedule with next_check

3. Execution Worker (runs every 30s)
   → Pick queued orders
   → Execute at snapshot LTP + slippage
   → Create positions, exit_rules
   → Handle partial fills (circuit rules)

4. Risk Worker (runs every 60s)
   → Check stop-loss/target rules on open positions
   → Exit positions when rules trigger
   → Auto-close INTRADAY at 3:15 PM
   → Auto-liquidate DELIVERY at Friday 3:30 PM
```

### Response timeout

Agent must return valid JSON within 30 seconds. On failure:
- Decision recorded as `timeout` (no response) or `parse_error` (bad JSON)
- Call counted against daily budget
- Auto-HOLD — no trades this checkpoint
- Next wake: next default checkpoint

---

## 4. Database Schema

### Tables

```sql
-- Agents
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  model TEXT NOT NULL,              -- OpenRouter model name
  system_prompt TEXT NOT NULL,
  persona TEXT,                     -- "momentum", "value", etc.
  capital NUMERIC(12,2) DEFAULT 1000000.00,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Daily limits & usage
CREATE TABLE agent_daily_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id),
  date DATE NOT NULL,
  calls_used INT DEFAULT 0,
  trades_used INT DEFAULT 0,
  max_calls INT DEFAULT 10,
  max_trades INT DEFAULT 20,
  violations JSONB DEFAULT '[]',
  UNIQUE(agent_id, date)
);

-- Agent wake schedule
CREATE TABLE agent_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id),
  wake_time TIMESTAMPTZ NOT NULL,
  source TEXT CHECK(source IN ('default', 'agent_requested')),
  reason TEXT,
  used BOOLEAN DEFAULT false
);

-- Frozen market snapshots
CREATE TABLE market_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  captured_at TIMESTAMPTZ NOT NULL,
  universe TEXT[] NOT NULL,
  benchmark JSONB,               -- { index, price, change_pct }
  quotes JSONB NOT NULL,          -- { SYMBOL: { ltp, prev_close, volume, change_pct } }
  movers JSONB,                   -- { top_gainers: [], top_losers: [] }
  sector_summary JSONB,           -- { sector: { change_pct, weight } }
  news_bundle JSONB,              -- optional
  snapshot_hash TEXT NOT NULL      -- SHA256 of content for audit
);

-- Every agent decision
CREATE TABLE agent_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id),
  snapshot_id UUID REFERENCES market_snapshots(id),
  model TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  system_prompt TEXT,
  user_prompt TEXT,                 -- the snapshot context sent
  raw_output TEXT,                  -- raw LLM response
  parsed_decision JSONB,            -- validated JSON decision
  token_usage JSONB,                -- { prompt, completion, total }
  cost NUMERIC(10,6),
  response_time_ms INT,
  status TEXT CHECK(status IN ('success', 'timeout', 'parse_error', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Executed orders
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id),
  decision_id UUID REFERENCES agent_decisions(id),
  symbol TEXT NOT NULL,
  side TEXT CHECK(side IN ('BUY', 'SELL')),
  amount NUMERIC(12,2),
  quantity INT,
  requested_price NUMERIC(10,2),
  executed_price NUMERIC(10,2),
  slippage NUMERIC(6,4),
  status TEXT CHECK(status IN ('pending', 'filled', 'partial', 'rejected', 'circuit_locked')),
  executed_at TIMESTAMPTZ,
  rejection_reason TEXT
);

-- Open positions
CREATE TABLE positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id),
  symbol TEXT NOT NULL,
  quantity INT NOT NULL,
  entry_price NUMERIC(10,2) NOT NULL,
  current_price NUMERIC(10,2),
  strategy_type TEXT CHECK(strategy_type IN ('INTRADAY', 'DELIVERY')),
  realized_pnl NUMERIC(12,2) DEFAULT 0,
  unrealized_pnl NUMERIC(12,2) DEFAULT 0,
  status TEXT CHECK(status IN ('open', 'closed')) DEFAULT 'open',
  entered_at TIMESTAMPTZ DEFAULT now(),
  closed_at TIMESTAMPTZ
);

-- Exit rules (stop-loss, target, time-based)
CREATE TABLE exit_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  position_id UUID REFERENCES positions(id),
  target_price NUMERIC(10,2),
  stop_loss_price NUMERIC(10,2),
  exit_at TIMESTAMPTZ,
  trailing_stop_pct NUMERIC(5,2),
  triggered_by TEXT,
  triggered_at TIMESTAMPTZ
);

-- Weekly memory for agents
CREATE TABLE agent_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id),
  week DATE NOT NULL,
  strengths TEXT[],
  mistakes TEXT[],
  coach_notes TEXT,
  metrics JSONB,                    -- { return_pct, drawdown, turnover, hit_rate }
  UNIQUE(agent_id, week)
);

-- Leaderboard snapshots
CREATE TABLE leaderboard_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  agent_id UUID REFERENCES agents(id),
  rank INT,
  capital NUMERIC(12,2),
  return_pct NUMERIC(6,2),
  drawdown_pct NUMERIC(6,2),
  turnover_pct NUMERIC(6,2),
  hit_rate NUMERIC(5,2),
  UNIQUE(date, agent_id)
);

CREATE TABLE leaderboard_weekly (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week DATE NOT NULL,
  agent_id UUID REFERENCES agents(id),
  rank INT,
  starting_capital NUMERIC(12,2),
  ending_capital NUMERIC(12,2),
  return_pct NUMERIC(6,2),
  peak_capital NUMERIC(12,2),
  max_drawdown_pct NUMERIC(6,2),
  total_trades INT,
  win_rate NUMERIC(5,2),
  consistency_score NUMERIC(5,2),
  UNIQUE(week, agent_id)
);
```

---

## 5. Refined Game Rules

| Rule | Decision |
|---|---|
| SWING valuation mid-week | LTP mark-to-market for leaderboard and agent prompts |
| Order execution fill | Snapshot LTP + 0.1% flat slippage, deterministic |
| Timeout / non-response | Auto-HOLD, call counted, logged. 30s timeout |
| Circuit-locked fills | Upper circuit BUY = 0 fill. Lower circuit SELL = 0 fill. Friday settlement uses last traded price |
| Multi-week carryover | Capital resets to ₹10L each week. Overall ranking by average weekly return + consistency |
| Portfolio valuation in prompt | Show entry cost AND MTM value. Unrealized P&L calculated from LTP |
| Trade interface | Amount-based (₹). `floor(amount / LTP)` for quantity. Minimum 1 share |

---

## 6. API Endpoints — Express

```
GET    /api/agents                    → list agents
GET    /api/agents/:id                → agent detail (holdings, decisions)
POST   /api/agents                    → create agent

GET    /api/leaderboard               → current weekly leaderboard
GET    /api/leaderboard/history       → past weeks

GET    /api/snapshots                 → recent snapshots
GET    /api/snapshots/:id             → snapshot detail with decisions

GET    /api/decisions?agent_id=&date= → filter decisions
GET    /api/decisions/:id             → full decision detail (prompts, output)

GET    /api/positions?agent_id=       → open positions
GET    /api/positions/history         → closed positions with P&L

GET    /api/memory/:agent_id          → weekly memory summaries

GET    /api/league/status             → current week state, time to next checkpoint
POST   /api/league/start              → start a new week
POST   /api/league/reset              → force reset (dev only)

WS     /ws/leaderboard                → live leaderboard updates
WS     /ws/agent/:id                  → agent-specific live feed
```

---

## 7. Frontend — Vite + React

### Routes

| Route | View |
|---|---|
| `/` | Live leaderboard — capital, return, holdings, last move, calls remaining |
| `/agents/:id` | Agent detail — P&L chart, holdings, decision history |
| `/replay/:decision_id` | Single decision replay — snapshot, prompt, model output |
| `/weekly/:week` | Weekly summary — return, drawdown, hit rate, mistakes |

### Key components

```
LeaderboardTable    — sorted by current capital, live-updating
AgentCard           — mini profile with key stats
PositionList        — current holdings with MTM
DecisionTimeline    — chronological scrollable log of decisions
ReplayView          — side-by-side snapshot + prompt + decision
PnLChart            — equity curve over week
```

### Real-time updates

- WebSocket connection on dashboard mount
- Server pushes: snapshot taken, decision made, position updated, order filled
- Poll fallback every 10s if WebSocket disconnected

---

## 8. Redis Keys

```
quote:{symbol}              → JSON quote data (TTL: 90s)
snapshot:latest             → latest snapshot ID
agent:{id}:state            → agent current state
leaderboard:current          → current leaderboard (sorted set)
market:status               → "open" | "closed" | "holiday"
pending_orders              → BullMQ queue for execution
checkpoint_schedule         → BullMQ queue for agent wake calls
```

---

## 9. Deployment

### Week lifecycle

```
Friday 3:30 PM    → Week ends. Force-liquidate all DELIVERY positions.
                    Generate leaderboard. Run weekly memory coach.
                    Reset agent capital to ₹10L.
Saturday          → Admin reviews, adjusts prompts if needed.
Sunday            → Pre-fetch historical data, warm caches.
Monday 9:15 AM    → New week starts. First checkpoint fires.
```

### Environment variables

```env
PORT=3001
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
OPENROUTER_API_KEY=sk-or-v1-...
YAHOO_FINANCE_ENABLED=true
LEAGUE_WEEK_START=2026-07-06
NIFTY_UNIVERSE_SIZE=100
AGENT_COUNT=5
DEFAULT_MAX_CALLS=10
DEFAULT_MAX_TRADES=20
MAX_SINGLE_STOCK_EXPOSURE=20
MAX_SECTOR_EXPOSURE=35
SLIPPAGE_PCT=0.1
CIRCUIT_FALLBACK=LTP
```

---

## 10. Project Structure

```
trade-arena/
├── frontend/               # Vite + React app
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Leaderboard, Agent detail, Replay
│   │   ├── hooks/          # WebSocket, data fetching
│   │   └── lib/            # API client, utils
│   └── package.json
├── backend/
│   ├── src/
│   │   ├── services/
│   │   │   ├── snapshot-builder.js
│   │   │   ├── agent-scheduler.js
│   │   │   ├── decision-engine.js
│   │   │   ├── execution-worker.js
│   │   │   ├── risk-worker.js
│   │   │   └── scoring-service.js
│   │   ├── routes/         # Express API routes
│   │   ├── models/         # DB queries
│   │   ├── config/         # NIFTY 100 list, OpenRouter config
│   │   └── app.js          # Express entry point
│   └── package.json
├── workers/                # Standalone worker processes (BullMQ)
│   ├── snapshot-worker.js
│   ├── execution-worker.js
│   └── risk-worker.js
├── db/
│   └── migrations/         # SQL migration files
├── docs/
│   ├── ai-trading-league-spec.md
│   └── ai-trading-league-impl.md
└── README.md
```
