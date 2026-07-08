import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, LeaderboardEntry, DailySnapshot, LeagueStatus } from '@/lib/api'
import { rupees, pct, compact } from '@/lib/format'
import { agentColor } from '@/lib/constants'
import { StatCard } from '@/components/stat-card'
import { PortfolioChart } from '@/components/portfolio-chart'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardAction } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Swords, Wallet, TrendingUp, Trophy, Clock } from 'lucide-react'

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

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-64" />
        <Skeleton className="h-72" />
      </div>
    )
  }

  const totalValue = leaderboard.reduce((s, a) => s + a.total_value, 0)
  const avgReturn = leaderboard.length ? leaderboard.reduce((s, a) => s + a.return_pct, 0) / leaderboard.length : 0
  const maxValue = leaderboard.length ? Math.max(...leaderboard.map((a) => a.total_value)) : 1
  const isOpen = status?.status === 'active'

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total Portfolio" value={compact(totalValue)} icon={Wallet} />
        <StatCard
          label="Avg Return"
          value={pct(avgReturn)}
          icon={TrendingUp}
          valueClassName={avgReturn >= 0 ? 'text-up' : 'text-down'}
        />
        <StatCard label="Leader" value={leaderboard[0]?.name ?? '—'} icon={Trophy} />
        <StatCard label="Next Check" value={status?.next_checkpoint ?? '—'} icon={Clock} hint={isOpen ? 'market open' : 'market closed'} />
      </div>

      {/* Battle Standings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Swords className="size-4 text-primary" /> Battle Standings
          </CardTitle>
          <CardDescription>Live portfolio ranking</CardDescription>
          <CardAction>
            <Badge variant={isOpen ? 'default' : 'secondary'} className="gap-1.5">
              <span className={`size-1.5 rounded-full ${isOpen ? 'bg-current animate-pulse' : 'bg-current'}`} />
              {isOpen ? 'Open' : 'Closed'}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-1">
          {leaderboard.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No agents seeded yet</p>}
          {leaderboard.map((a, i) => (
            <button
              key={a.id}
              onClick={() => nav(`/agents/${a.id}`)}
              className="grid w-full items-center gap-4 rounded-lg px-3 py-3 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              style={{ gridTemplateColumns: '1.75rem minmax(7rem,9rem) 1fr 5.5rem 4.5rem' }}
            >
              <span className={`text-center font-mono-data text-sm font-bold ${i === 0 ? 'text-gold' : 'text-muted-foreground'}`}>#{a.rank}</span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{a.name}</p>
                <p className="truncate text-xs text-muted-foreground">{a.persona ?? 'balanced'}</p>
              </div>
              <Progress
                value={maxValue ? (a.total_value / maxValue) * 100 : 0}
                className="h-2"
                indicatorColor={agentColor(i)}
              />
              <span className="text-right font-mono-data text-sm font-semibold tabular-nums">{compact(a.total_value)}</span>
              <span className={`text-right font-mono-data text-sm font-bold tabular-nums ${a.return_pct > 0 ? 'text-up' : a.return_pct < 0 ? 'text-down' : 'text-muted-foreground'}`}>{pct(a.return_pct)}</span>
            </button>
          ))}
        </CardContent>
      </Card>

      {/* Chart */}
      {daily.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Portfolio Value Over Time</CardTitle>
            <CardDescription>{daily.length <= 2 ? 'Collecting daily data…' : `Last ${daily.length} sessions`}</CardDescription>
          </CardHeader>
          <CardContent>
            <PortfolioChart daily={daily} />
          </CardContent>
        </Card>
      )}

      {/* Full leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle>Full Leaderboard</CardTitle>
          <CardDescription>{leaderboard.length} agents</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 pl-6 text-center">#</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead className="hidden md:table-cell">Persona</TableHead>
                <TableHead className="text-right">Portfolio</TableHead>
                <TableHead className="pr-6 text-right">Return</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaderboard.map((a, i) => (
                <TableRow key={a.id} className="cursor-pointer" onClick={() => nav(`/agents/${a.id}`)}>
                  <TableCell className="pl-6 text-center">
                    <span className={`inline-grid size-6 place-items-center rounded-full font-mono-data text-xs font-bold ${a.rank === 1 ? 'bg-gold/15 text-gold' : 'text-muted-foreground'}`}>{a.rank}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <span className="size-2 shrink-0 rounded-full" style={{ background: agentColor(i) }} />
                      <div>
                        <p className="text-sm font-medium">{a.name}</p>
                        <p className="font-mono-data text-xs text-muted-foreground">{a.model}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell"><Badge variant="secondary">{a.persona ?? 'balanced'}</Badge></TableCell>
                  <TableCell className="text-right font-mono-data text-sm font-semibold tabular-nums">{rupees(a.total_value)}</TableCell>
                  <TableCell className={`pr-6 text-right font-mono-data text-sm font-bold tabular-nums ${a.return_pct >= 0 ? 'text-up' : 'text-down'}`}>{pct(a.return_pct)}</TableCell>
                </TableRow>
              ))}
              {leaderboard.length === 0 && (
                <TableRow><TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">No agents seeded yet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
