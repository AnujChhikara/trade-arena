import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, LeaderboardEntry, DailySnapshot, LeagueStatus } from '../lib/api'
import { rupees, pct, compact } from '../lib/format'
import { AGENT_COLORS, agentColor } from '@/lib/constants'
import StatCard from '../components/StatCard'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart,
} from 'recharts'
import { TrendingUp, Clock, Users, Swords } from 'lucide-react'

export default function Dashboard() {
  const nav = useNavigate()
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<LeagueStatus | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [daily, setDaily] = useState<DailySnapshot[]>([])

  useEffect(() => {
    Promise.all([
      api.league.status().then(setStatus),
      api.leaderboard.current().then(setLeaderboard),
      api.leaderboard.daily().then(setDaily),
    ]).finally(() => setLoading(false))
  }, [])

  const agentNames = [...new Set(daily.flatMap(d => d.entries.map(e => e.agentName)))]
  const chartData = daily.map(d => {
    const row: Record<string, any> = { date: d.date.slice(5) }
    for (const e of d.entries) row[e.agentName] = parseFloat(e.capital)
    for (const name of agentNames) if (!(name in row)) row[name] = null
    return row
  })

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <Skeleton className="h-9 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    )
  }

  const topAgent = leaderboard[0]
  const totalValue = leaderboard.reduce((s, a) => s + a.total_value, 0)
  const avgReturn = leaderboard.length > 0
    ? leaderboard.reduce((s, a) => s + a.return_pct, 0) / leaderboard.length
    : 0
  const maxValue = leaderboard.length > 0 ? Math.max(...leaderboard.map(a => a.total_value)) : 1
  const isOpen = status?.status === 'active'
  const sparseChart = chartData.length <= 2

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Heading */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">Live standings across all competing agents</p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5">
          <span className={`size-1.5 rounded-full ${isOpen ? 'bg-up animate-pulse' : 'bg-muted-foreground'}`} />
          <span className={`text-[11px] font-medium uppercase tracking-wider ${isOpen ? 'text-up' : 'text-muted-foreground'}`}>
            {isOpen ? 'Market Open' : 'Market Closed'}
          </span>
          <span className="text-border">·</span>
          <span className="text-[11px] font-mono-data text-muted-foreground">Next {status?.next_checkpoint || '--'}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Portfolio" value={compact(totalValue)} icon={TrendingUp} />
        <StatCard
          label="Avg Return"
          value={avgReturn >= 0 ? `+${avgReturn.toFixed(2)}%` : `${avgReturn.toFixed(2)}%`}
          icon={TrendingUp}
          accent={avgReturn >= 0 ? 'var(--up)' : 'var(--down)'}
          trend={avgReturn !== 0 ? { value: avgReturn, positive: avgReturn >= 0 } : undefined}
        />
        <StatCard label="Leader" value={topAgent?.name || '--'} icon={Users} />
        <StatCard label="Next Check" value={status?.next_checkpoint || '--'} icon={Clock} />
      </div>

      {/* Battle Standings — signature */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2.5">
            <Swords size={14} className="text-primary" />
            Battle Standings
          </CardTitle>
          <CardDescription>live competition</CardDescription>
        </CardHeader>
        <div className="p-3 sm:p-4">
          {leaderboard.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No agents seeded yet</p>
          ) : leaderboard.map((agent, i) => {
            const color = agentColor(i)
            const barWidth = maxValue > 0 ? (agent.total_value / maxValue) * 100 : 0
            const isLeader = i === 0
            return (
              <button
                key={agent.id}
                onClick={() => nav(`/agents/${agent.id}`)}
                className="grid w-full items-center gap-4 rounded-xl px-3 py-3.5 text-left transition-colors hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                style={{ gridTemplateColumns: '2rem minmax(8rem,10rem) 1fr 6rem 5rem' }}
              >
                <span className={`text-center font-mono-data text-sm font-bold ${isLeader ? 'text-gold' : 'text-muted-foreground'}`}>
                  #{agent.rank}
                </span>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold" style={{ color: isLeader ? color : undefined }}>
                    {agent.name}
                  </div>
                  <div className="truncate text-[11px] text-muted-foreground">{agent.persona || 'balanced'}</div>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${barWidth}%`, backgroundColor: color, boxShadow: isLeader ? `0 0 12px ${color}80` : undefined }}
                  />
                </div>
                <div className="text-right font-mono-data text-sm font-semibold tabular-nums">{compact(agent.total_value)}</div>
                <div className={`text-right font-mono-data text-sm font-bold tabular-nums ${agent.return_pct > 0 ? 'text-up' : agent.return_pct < 0 ? 'text-down' : 'text-muted-foreground'}`}>
                  {pct(agent.return_pct)}
                </div>
              </button>
            )
          })}
        </div>
      </Card>

      {/* Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Portfolio Value Over Time</CardTitle>
            {sparseChart && <CardDescription>collecting daily data…</CardDescription>}
          </CardHeader>
          <CardContent className="px-2 py-5 sm:px-4">
            <ResponsiveContainer width="100%" height={230}>
              <AreaChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                <defs>
                  {agentNames.map((name, i) => (
                    <linearGradient key={name} id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={AGENT_COLORS[i % AGENT_COLORS.length]} stopOpacity={0.22} />
                      <stop offset="95%" stopColor={AGENT_COLORS[i % AGENT_COLORS.length]} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} stroke="var(--border)" axisLine={false} tickLine={false} padding={{ left: 16, right: 16 }} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} stroke="none" tickLine={false} axisLine={false} width={48} tickFormatter={(v: number) => compact(v)} domain={['dataMin - 5000', 'dataMax + 5000']} />
                <Tooltip
                  contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11, color: 'var(--foreground)' }}
                  formatter={(v: any) => [rupees(Number(v) || 0), '']}
                  labelStyle={{ color: 'var(--muted-foreground)', fontSize: 10, marginBottom: 4 }}
                />
                <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11, paddingTop: 16, color: 'var(--muted-foreground)' }} />
                {agentNames.map((name, i) => (
                  <Area
                    key={name}
                    type="monotone"
                    dataKey={name}
                    stroke={AGENT_COLORS[i % AGENT_COLORS.length]}
                    strokeWidth={2}
                    fill={`url(#grad-${i})`}
                    dot={sparseChart ? { r: 3, strokeWidth: 0, fill: AGENT_COLORS[i % AGENT_COLORS.length] } : false}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                    connectNulls
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Full leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle>Full Leaderboard</CardTitle>
          <CardDescription>{leaderboard.length} agents</CardDescription>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-center">#</TableHead>
              <TableHead>Agent</TableHead>
              <TableHead className="hidden md:table-cell">Persona</TableHead>
              <TableHead className="text-right">Portfolio</TableHead>
              <TableHead className="text-right">Return</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leaderboard.map((a, i) => (
              <TableRow key={a.id} data-clickable="true" onClick={() => nav(`/agents/${a.id}`)}>
                <TableCell className="text-center">
                  <span className={`inline-grid size-6 place-items-center rounded-full font-mono-data text-[10px] font-bold ${a.rank === 1 ? 'bg-warning-soft text-gold' : 'text-muted-foreground'}`}>
                    {a.rank}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: agentColor(i) }} />
                    <div>
                      <div className="text-sm font-medium">{a.name}</div>
                      <div className="text-[10px] text-muted-foreground font-mono-data">{a.model}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <Badge>{a.persona || 'balanced'}</Badge>
                </TableCell>
                <TableCell className="text-right font-mono-data text-sm font-semibold tabular-nums">{rupees(a.total_value)}</TableCell>
                <TableCell className={`text-right font-mono-data text-sm font-bold tabular-nums ${a.return_pct >= 0 ? 'text-up' : 'text-down'}`}>
                  {pct(a.return_pct)}
                </TableCell>
              </TableRow>
            ))}
            {leaderboard.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                  No agents seeded yet. POST /api/league/seed-agents with x-service-key header.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
