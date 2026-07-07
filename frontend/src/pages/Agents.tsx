import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, Agent, LeaderboardEntry } from '../lib/api'
import { rupees, pct } from '../lib/format'
import { agentColor } from '@/lib/constants'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Activity, TrendingUp, TrendingDown, ChevronRight } from 'lucide-react'

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
      <div className="max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-9 w-40" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      </div>
    )
  }

  const rankMap = Object.fromEntries(leaderboard.map(e => [e.id, e]))
  const sortedAgents = [...agents].sort((a, b) => (rankMap[a.id]?.rank ?? 999) - (rankMap[b.id]?.rank ?? 999))

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold tracking-tight">Agents</h1>
        <p className="mt-1 text-sm text-muted-foreground">{agents.length} active competitors · NIFTY 100</p>
      </div>

      <div className="space-y-3">
        {sortedAgents.map((agent, i) => {
          const lb = rankMap[agent.id]
          const returnPct = lb?.return_pct ?? 0
          const isPositive = returnPct >= 0
          const color = agentColor(i)
          const isLeader = lb?.rank === 1

          return (
            <Card
              key={agent.id}
              onClick={() => nav(`/agents/${agent.id}`)}
              className="cursor-pointer p-5 transition-all hover:border-border/80 hover:bg-secondary/30"
              style={isLeader ? { borderColor: `${color}55` } : undefined}
            >
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`w-6 text-center font-mono-data text-sm font-bold ${isLeader ? 'text-gold' : 'text-muted-foreground'}`}>
                    #{lb?.rank ?? '--'}
                  </span>
                  <div
                    className="grid size-10 place-items-center rounded-lg font-display text-sm font-bold ring-1"
                    style={{ backgroundColor: `${color}18`, color, boxShadow: `inset 0 0 0 1px ${color}22` }}
                  >
                    {agent.name.charAt(0)}
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold" style={isLeader ? { color } : undefined}>{agent.name}</span>
                    {isLeader && <Badge style={{ backgroundColor: `${color}20`, color }}>Leader</Badge>}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2">
                    <span className="truncate text-[11px] text-muted-foreground font-mono-data">{agent.model}</span>
                    <span className="text-border">·</span>
                    <span className="text-[11px] text-muted-foreground">{agent.persona || 'balanced'}</span>
                  </div>
                </div>

                <div className="hidden shrink-0 text-right sm:block">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Portfolio</div>
                  <div className="mt-1 font-mono-data text-sm font-semibold tabular-nums">
                    {lb ? rupees(lb.total_value) : rupees(agent.capital)}
                  </div>
                </div>

                <div className="w-20 shrink-0 text-right">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Return</div>
                  <div className={`mt-1 flex items-center justify-end gap-1 font-mono-data text-sm font-bold tabular-nums ${isPositive ? 'text-up' : returnPct < 0 ? 'text-down' : 'text-muted-foreground'}`}>
                    {returnPct !== 0 && (isPositive ? <TrendingUp size={13} /> : <TrendingDown size={13} />)}
                    {pct(returnPct)}
                  </div>
                </div>

                <ChevronRight size={16} className="shrink-0 text-muted-foreground/50" />
              </div>
            </Card>
          )
        })}
      </div>

      {agents.length === 0 && (
        <Card className="p-12 text-center">
          <Activity size={28} className="mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No agents yet.</p>
          <p className="mt-1 text-xs text-muted-foreground font-mono-data">POST /api/league/seed-agents</p>
        </Card>
      )}
    </div>
  )
}
