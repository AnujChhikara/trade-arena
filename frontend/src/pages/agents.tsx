import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, Agent, LeaderboardEntry } from '@/lib/api'
import { rupees, pct } from '@/lib/format'
import { agentColor } from '@/lib/constants'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ChevronRight, TrendingUp, TrendingDown, Activity } from 'lucide-react'

export default function Agents() {
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
      <div className="mx-auto max-w-4xl space-y-3">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
      </div>
    )
  }

  const rankMap = Object.fromEntries(leaderboard.map((e) => [e.id, e]))
  const sorted = [...agents].sort((a, b) => (rankMap[a.id]?.rank ?? 999) - (rankMap[b.id]?.rank ?? 999))

  return (
    <div className="mx-auto max-w-4xl space-y-3">
      {sorted.map((agent, i) => {
        const lb = rankMap[agent.id]
        const ret = lb?.return_pct ?? 0
        const color = agentColor(i)
        const isLeader = lb?.rank === 1
        return (
          <Card
            key={agent.id}
            role="button"
            tabIndex={0}
            onClick={() => nav(`/agents/${agent.id}`)}
            onKeyDown={(e) => e.key === 'Enter' && nav(`/agents/${agent.id}`)}
            className="cursor-pointer transition-colors hover:bg-accent/40"
          >
            <CardContent className="flex items-center gap-4 p-4">
              <span className={`w-6 shrink-0 text-center font-mono-data text-sm font-bold ${isLeader ? 'text-gold' : 'text-muted-foreground'}`}>#{lb?.rank ?? '—'}</span>
              <div className="grid size-10 shrink-0 place-items-center rounded-lg font-display text-sm font-bold" style={{ background: `color-mix(in oklab, ${color} 18%, transparent)`, color }}>
                {agent.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold">{agent.name}</span>
                  {isLeader && <Badge variant="secondary">Leader</Badge>}
                </div>
                <p className="mt-0.5 truncate font-mono-data text-xs text-muted-foreground">{agent.model} · {agent.persona ?? 'balanced'}</p>
              </div>
              <div className="hidden shrink-0 text-right sm:block">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Portfolio</p>
                <p className="mt-0.5 font-mono-data text-sm font-semibold tabular-nums">{lb ? rupees(lb.total_value) : rupees(agent.capital)}</p>
              </div>
              <div className="w-20 shrink-0 text-right">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Return</p>
                <p className={`mt-0.5 flex items-center justify-end gap-1 font-mono-data text-sm font-bold tabular-nums ${ret > 0 ? 'text-up' : ret < 0 ? 'text-down' : 'text-muted-foreground'}`}>
                  {ret !== 0 && (ret > 0 ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />)}
                  {pct(ret)}
                </p>
              </div>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </CardContent>
          </Card>
        )
      })}

      {agents.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <Activity className="size-7 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No agents yet.</p>
            <p className="font-mono-data text-xs text-muted-foreground">POST /api/league/seed-agents</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
