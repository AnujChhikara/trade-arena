const BASE = '/api'

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export interface Agent {
  id: string; name: string; model: string; persona: string | null
  capital: string; is_active: boolean; created_at: string
}

export interface Position {
  id: string; agent_id: string; symbol: string; quantity: number
  entry_price: string; current_price: string | null
  strategy_type: 'INTRADAY' | 'DELIVERY'
  realized_pnl: string; unrealized_pnl: string; status: 'open' | 'closed'
  entered_at: string
}

export interface DecisionSummary {
  id: string; created_at: string; status: string
  decision: string | null; hypothesis: string | null
  cost: string | null; response_time_ms: number | null
}

export interface AgentDetail extends Agent {
  positions: Position[]
  recent_decisions: DecisionSummary[]
}

export interface AgentOrder {
  id: string; symbol: string; side: 'BUY' | 'SELL'
  quantity: number | null; amount: string | null
  executed_price: string | null; status: string
  rejection_reason: string | null; created_at: string; executed_at: string | null
}

export interface LeaderboardEntry {
  rank: number; id: string; name: string; persona: string | null
  model: string; capital: number; stock_value: number
  total_value: number; return_pct: number
}

export interface DailySnapshot {
  date: string
  entries: Array<{
    date: string; agentId: string; agentName: string; rank: number
    capital: string; returnPct: string
  }>
}

export interface SnapshotSummary {
  id: string; captured_at: string; snapshot_hash: string
}

export interface SnapshotDetail {
  id: string; captured_at: string; snapshot_hash?: string
  benchmark: { index?: string; advancing?: number; declining?: number; unchanged?: number } | null
  movers: { top_gainers?: Array<{ symbol: string; change_pct: number }>; top_losers?: Array<{ symbol: string; change_pct: number }> } | null
  sector_summary: Record<string, { stock_count: number; avg_change: number | null }>
  quotes: Record<string, { ltp?: number; change_pct?: number; volume?: number }>
  universe: string[]
}

export interface LeagueStatus {
  status: 'active' | 'idle'; day: string; is_friday: boolean
  next_checkpoint: string; snapshot_count: number; decision_count: number
}

export const api = {
  agents: {
    list: () => get<Agent[]>('/agents'),
    get: (id: string) => get<AgentDetail>(`/agents/${id}`),
    orders: (id: string) => get<AgentOrder[]>(`/agents/${id}/orders`),
  },
  leaderboard: {
    current: () => get<LeaderboardEntry[]>('/leaderboard'),
    daily: () => get<DailySnapshot[]>('/leaderboard/daily'),
  },
  snapshots: {
    list: (limit = 50) => get<SnapshotSummary[]>(`/snapshots?limit=${limit}`),
    get: (id: string) => get<SnapshotDetail>(`/snapshots/${id}`),
  },
  league: {
    status: () => get<LeagueStatus>('/league/status'),
  },
}
