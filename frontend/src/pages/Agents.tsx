import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, Agent, LeaderboardEntry } from '../lib/api'
import { rupees, pct } from '../lib/format'
import { Activity, TrendingUp, TrendingDown, ChevronRight } from 'lucide-react'
import { AGENT_COLORS } from './Dashboard'

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
        <div className="flex items-center gap-3 text-arena-muted">
          <div className="w-4 h-4 border-2 border-arena-primary/30 border-t-arena-primary rounded-full animate-spin" />
          <span className="text-sm font-mono-data tracking-wider">LOADING AGENTS...</span>
        </div>
      </div>
    )
  }

  const rankMap = Object.fromEntries(leaderboard.map(e => [e.id, e]))
  const sortedAgents = [...agents].sort((a, b) => {
    const ra = rankMap[a.id]?.rank ?? 999
    const rb = rankMap[b.id]?.rank ?? 999
    return ra - rb
  })

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-display font-bold text-arena-text">Agents</h2>
          <p className="text-xs text-arena-muted mt-0.5 tracking-wide">{agents.length} active competitors · NIFTY 100</p>
        </div>
      </div>

      <div className="space-y-2">
        {sortedAgents.map((agent, i) => {
          const lb = rankMap[agent.id]
          const returnPct = lb?.return_pct ?? 0
          const isPositive = returnPct >= 0
          const color = AGENT_COLORS[i % AGENT_COLORS.length]
          const isLeader = lb?.rank === 1

          return (
            <div
              key={agent.id}
              onClick={() => nav(`/agents/${agent.id}`)}
              className="bg-arena-surface border border-arena-border rounded-xl p-5 cursor-pointer hover:border-arena-border-bright hover:bg-arena-surface-2 transition-all group"
              style={isLeader ? { borderColor: `${color}40` } : undefined}
            >
              <div className="flex items-center gap-4">
                {/* Rank + color dot */}
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-sm font-bold font-mono-data w-6 text-center ${isLeader ? 'text-arena-gold' : 'text-arena-muted'}`}>
                    #{lb?.rank ?? '--'}
                  </span>
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center font-display font-bold text-sm shrink-0"
                    style={{ backgroundColor: `${color}18`, color }}
                  >
                    {agent.name.charAt(0)}
                  </div>
                </div>

                {/* Name + model */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-arena-text group-hover:text-arena-primary transition-colors" style={isLeader ? { color } : undefined}>
                      {agent.name}
                    </span>
                    {isLeader && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider" style={{ backgroundColor: `${color}20`, color }}>
                        Leader
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-arena-muted font-mono-data truncate">{agent.model}</span>
                    <span className="text-arena-border">·</span>
                    <span className="text-[10px] text-arena-muted">{agent.persona || 'balanced'}</span>
                  </div>
                </div>

                {/* Portfolio */}
                <div className="text-right shrink-0 hidden sm:block">
                  <div className="text-[10px] text-arena-muted uppercase tracking-widest mb-1">Portfolio</div>
                  <div className="text-sm font-mono-data font-semibold tabular-nums text-arena-text">
                    {lb ? rupees(lb.total_value) : rupees(agent.capital)}
                  </div>
                </div>

                {/* Return */}
                <div className="text-right shrink-0 w-20">
                  <div className="text-[10px] text-arena-muted uppercase tracking-widest mb-1">Return</div>
                  <div className={`flex items-center justify-end gap-1 text-sm font-mono-data font-bold tabular-nums ${isPositive ? 'text-arena-success' : returnPct < 0 ? 'text-arena-danger' : 'text-arena-muted'}`}>
                    {returnPct !== 0 && (isPositive ? <TrendingUp size={13} /> : <TrendingDown size={13} />)}
                    {pct(returnPct)}
                  </div>
                </div>

                <ChevronRight size={16} className="text-arena-border group-hover:text-arena-muted transition-colors shrink-0" />
              </div>
            </div>
          )
        })}
      </div>

      {agents.length === 0 && (
        <div className="bg-arena-surface border border-arena-border rounded-xl p-12 text-center">
          <Activity size={28} className="mx-auto text-arena-muted mb-3" />
          <p className="text-sm text-arena-muted">No agents yet.</p>
          <p className="text-xs text-arena-muted mt-1 font-mono-data">POST /api/league/seed-agents</p>
        </div>
      )}
    </div>
  )
}
