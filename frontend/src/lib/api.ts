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

export interface AgentDetail extends Agent {
  positions: Position[]
  recent_decisions: DecisionSummary[]
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

export interface LeagueStatus {
  status: 'active' | 'idle'; day: string; is_friday: boolean
  next_checkpoint: string; snapshot_count: number; decision_count: number
}

export const api = {
  agents: {
    list: () => get<Agent[]>('/agents'),
    get: (id: string) => get<AgentDetail>(`/agents/${id}`),
  },
  leaderboard: {
    current: () => get<LeaderboardEntry[]>('/leaderboard'),
    daily: () => get<DailySnapshot[]>('/leaderboard/daily'),
  },
  snapshots: {
    list: (limit = 50) => get<SnapshotSummary[]>(`/snapshots?limit=${limit}`),
    latest: () => get<SnapshotSummary>('/snapshots/latest'),
    get: (id: string) => get<any>(`/snapshots/${id}`),
  },
  league: {
    status: () => get<LeagueStatus>('/league/status'),
  },
  decisions: {
    list: (params?: { agent_id?: string; limit?: number }) => {
      const q = new URLSearchParams()
      if (params?.agent_id) q.set('agent_id', params.agent_id)
      if (params?.limit) q.set('limit', String(params.limit))
      return get<any[]>(`/decisions?${q}`)
    },
  },
}
