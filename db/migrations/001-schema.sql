CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  model TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  persona TEXT,
  capital NUMERIC(12,2) DEFAULT 1000000.00,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE agent_daily_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  calls_used INT DEFAULT 0,
  trades_used INT DEFAULT 0,
  max_calls INT DEFAULT 10,
  max_trades INT DEFAULT 20,
  violations JSONB DEFAULT '[]',
  UNIQUE(agent_id, date)
);

CREATE TABLE agent_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  wake_time TIMESTAMPTZ NOT NULL,
  source TEXT CHECK(source IN ('default', 'agent_requested')),
  reason TEXT,
  used BOOLEAN DEFAULT false
);

CREATE TABLE market_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  captured_at TIMESTAMPTZ NOT NULL,
  universe TEXT[] NOT NULL,
  benchmark JSONB,
  quotes JSONB NOT NULL,
  movers JSONB,
  sector_summary JSONB,
  news_bundle JSONB,
  snapshot_hash TEXT NOT NULL
);

CREATE TABLE agent_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  snapshot_id UUID REFERENCES market_snapshots(id),
  model TEXT NOT NULL,
  prompt_version TEXT NOT NULL DEFAULT 'v1',
  system_prompt TEXT,
  user_prompt TEXT,
  raw_output TEXT,
  parsed_decision JSONB,
  token_usage JSONB,
  cost NUMERIC(10,6),
  response_time_ms INT,
  status TEXT CHECK(status IN ('success', 'timeout', 'parse_error', 'rejected')) DEFAULT 'success',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  decision_id UUID REFERENCES agent_decisions(id),
  symbol TEXT NOT NULL,
  side TEXT CHECK(side IN ('BUY', 'SELL')),
  amount NUMERIC(12,2),
  quantity INT,
  requested_price NUMERIC(10,2),
  executed_price NUMERIC(10,2),
  slippage NUMERIC(6,4),
  status TEXT CHECK(status IN ('pending', 'filled', 'partial', 'rejected', 'circuit_locked')) DEFAULT 'pending',
  executed_at TIMESTAMPTZ,
  rejection_reason TEXT
);

CREATE TABLE positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
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

CREATE TABLE exit_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  position_id UUID REFERENCES positions(id) ON DELETE CASCADE,
  target_price NUMERIC(10,2),
  stop_loss_price NUMERIC(10,2),
  exit_at TIMESTAMPTZ,
  trailing_stop_pct NUMERIC(5,2),
  triggered_by TEXT,
  triggered_at TIMESTAMPTZ
);

CREATE TABLE agent_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  week DATE NOT NULL,
  strengths TEXT[],
  mistakes TEXT[],
  coach_notes TEXT,
  metrics JSONB,
  UNIQUE(agent_id, week)
);

CREATE TABLE leaderboard_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
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
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
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

CREATE INDEX idx_agent_daily_limits_agent_date ON agent_daily_limits(agent_id, date);
CREATE INDEX idx_agent_schedules_wake ON agent_schedules(wake_time) WHERE used = false;
CREATE INDEX idx_agent_decisions_agent ON agent_decisions(agent_id, created_at);
CREATE INDEX idx_orders_status ON orders(status) WHERE status = 'pending';
CREATE INDEX idx_positions_open ON positions(agent_id) WHERE status = 'open';
CREATE INDEX idx_exit_rules_position ON exit_rules(position_id);
