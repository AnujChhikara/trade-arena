import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, Agent, LeaderboardEntry } from '../lib/api'
import { rupees, pct } from '../lib/format'
import { Activity, BarChart3, TrendingUp, TrendingDown, Cpu } from 'lucide-react'

const PERSONA_COLORS: Record<string, string> = {
  momentum: 'bg-blue-100 text-blue-700',
  value: 'bg-green-100 text-green-700',
  scalper: 'bg-orange-100 text-orange-700',
  balanced: 'bg-slate-100 text-slate-600',
}

export default function AgentsList() {
  const nav = useNavigate()
  const [agents, setAgents] = useState<Agent[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.agents.list().then(setAgents),
      api.leaderboard.current().then(setLeaderboard),
    ]).finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse flex items-center gap-3 text-arena-muted">
          <Activity size={20} className="animate-spin" />
          <span className="text-sm">Loading agents...</span>
        </div>
      </div>
    )
  }

  const rankMap = Object.fromEntries(leaderboard.map(e => [e.id, e]))

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-arena-text">Agents</h2>
        <p className="text-sm text-arena-muted mt-1">{agents.length} active agents competing this week</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {agents.map(agent => {
          const lb = rankMap[agent.id]
          const returnPct = lb?.return_pct ?? 0
          const isPositive = returnPct >= 0
          const persona = agent.persona || 'balanced'

          return (
            <div
              key={agent.id}
              onClick={() => nav(`/agents/${agent.id}`)}
              className="bg-white rounded-xl border border-arena-border shadow-sm p-6 cursor-pointer hover:border-arena-primary hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-arena-primary-light flex items-center justify-center shrink-0">
                    <Cpu size={20} className="text-arena-primary" />
                  </div>
                  <div>
                    <div className="font-semibold text-arena-text">{agent.name}</div>
                    <div className="text-xs text-arena-muted mt-0.5">{agent.model}</div>
                  </div>
                </div>
                {lb?.rank && (
                  <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                    lb.rank === 1 ? 'bg-yellow-100 text-yellow-700' :
                    lb.rank === 2 ? 'bg-slate-100 text-slate-500' :
                    lb.rank === 3 ? 'bg-orange-100 text-orange-700' :
                    'bg-slate-50 text-slate-400'
                  }`}>#{lb.rank}</span>
                )}
              </div>

              <div className="flex items-center gap-2 mb-4">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${PERSONA_COLORS[persona] || 'bg-slate-100 text-slate-600'}`}>
                  {persona}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-arena-muted uppercase tracking-wider mb-1">Portfolio</div>
                  <div className="text-lg font-bold text-arena-text tabular-nums">
                    {lb ? rupees(lb.total_value) : rupees(agent.capital)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-arena-muted uppercase tracking-wider mb-1">Return</div>
                  <div className={`text-lg font-bold tabular-nums flex items-center gap-1 ${isPositive ? 'text-arena-success' : 'text-arena-danger'}`}>
                    {isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                    {pct(returnPct)}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {agents.length === 0 && (
        <div className="bg-white rounded-xl border border-arena-border p-12 text-center">
          <BarChart3 size={32} className="mx-auto text-arena-muted mb-3" />
          <p className="text-sm text-arena-muted">No agents yet. POST /api/league/seed-agents with x-service-key header.</p>
        </div>
      )}
    </div>
  )
}
