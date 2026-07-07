import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, LeaderboardEntry, DailySnapshot, LeagueStatus } from '../lib/api'
import { rupees, pct, compact } from '../lib/format'
import StatCard from '../components/StatCard'
import DataTable from '../components/DataTable'
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart,
} from 'recharts'
import { TrendingUp, Clock, Users } from 'lucide-react'

export const AGENT_COLORS = ['#38BDF8', '#A78BFA', '#34D399', '#F97316', '#FB7185', '#FBBF24']

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

  const chartData = (() => {
    const agentNames = [...new Set(daily.flatMap(d => d.entries.map(e => e.agentName)))]
    return daily.map(d => {
      const row: Record<string, any> = { date: d.date.slice(5) }
      for (const e of d.entries) row[e.agentName] = parseFloat(e.capital)
      for (const name of agentNames) if (!(name in row)) row[name] = null
      return row
    })
  })()
  const agentNames = [...new Set(daily.flatMap(d => d.entries.map(e => e.agentName)))]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-arena-muted">
          <div className="w-4 h-4 border-2 border-arena-primary/30 border-t-arena-primary rounded-full animate-spin" />
          <span className="text-sm font-mono-data tracking-wider">LOADING LEAGUE DATA...</span>
        </div>
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

  return (
    <div className="space-y-4 max-w-7xl mx-auto">

      {/* Battle standings — signature element */}
      <div className="bg-arena-surface border border-arena-border rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-arena-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-arena-muted uppercase tracking-widest">Battle Standings</span>
            <span className="text-[10px] font-mono-data text-arena-muted">— live competition</span>
          </div>
          <div className="flex items-center gap-2">
            {isOpen ? (
              <div className="flex items-center gap-1.5 text-arena-success">
                <div className="w-1.5 h-1.5 rounded-full bg-arena-success animate-pulse" />
                <span className="text-[10px] font-medium uppercase tracking-wider">Market Open</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-arena-muted">
                <div className="w-1.5 h-1.5 rounded-full bg-arena-muted" />
                <span className="text-[10px] font-medium uppercase tracking-wider">Market Closed</span>
              </div>
            )}
            <span className="text-arena-border mx-1">·</span>
            <span className="text-[10px] font-mono-data text-arena-muted">Next {status?.next_checkpoint || '--'}</span>
          </div>
        </div>

        <div className="p-5 space-y-3">
          {leaderboard.length === 0 ? (
            <div className="text-center text-sm text-arena-muted py-4">No agents seeded yet</div>
          ) : leaderboard.map((agent, i) => {
            const color = AGENT_COLORS[i % AGENT_COLORS.length]
            const barWidth = maxValue > 0 ? (agent.total_value / maxValue) * 100 : 0
            const isLeader = i === 0
            return (
              <div
                key={agent.id}
                onClick={() => nav(`/agents/${agent.id}`)}
                className="grid items-center gap-4 cursor-pointer group"
                style={{ gridTemplateColumns: '1.5rem 7rem 1fr 5.5rem 4.5rem' }}
              >
                {/* Rank */}
                <span className={`text-xs font-bold font-mono-data text-center ${isLeader ? 'text-arena-gold' : 'text-arena-muted'}`}>
                  #{agent.rank}
                </span>

                {/* Name */}
                <div>
                  <div className="text-xs font-semibold text-arena-text group-hover:text-arena-primary transition-colors truncate" style={{ color: isLeader ? color : undefined }}>
                    {agent.name}
                  </div>
                  <div className="text-[10px] text-arena-muted truncate">{agent.persona || 'balanced'}</div>
                </div>

                {/* Progress bar */}
                <div className="h-2 rounded-full bg-arena-border overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${barWidth}%`,
                      backgroundColor: color,
                      boxShadow: isLeader ? `0 0 8px ${color}60` : undefined,
                    }}
                  />
                </div>

                {/* Portfolio value */}
                <div className="text-right">
                  <span className="text-xs font-mono-data font-semibold text-arena-text tabular-nums">
                    {compact(agent.total_value)}
                  </span>
                </div>

                {/* Return */}
                <div className="text-right">
                  <span className={`text-xs font-mono-data font-bold tabular-nums ${agent.return_pct > 0 ? 'text-arena-success' : agent.return_pct < 0 ? 'text-arena-danger' : 'text-arena-muted'}`}>
                    {pct(agent.return_pct)}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="bg-arena-surface border border-arena-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-arena-border">
            <span className="text-[10px] font-semibold text-arena-muted uppercase tracking-widest">Portfolio Value Over Time</span>
          </div>
          <div className="p-5">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  {agentNames.map((name, i) => (
                    <linearGradient key={name} id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={AGENT_COLORS[i % AGENT_COLORS.length]} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={AGENT_COLORS[i % AGENT_COLORS.length]} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1B2E45" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748B', fontFamily: 'var(--font-mono)' }} stroke="#1B2E45" axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#64748B', fontFamily: 'var(--font-mono)' }} stroke="none" tickLine={false} axisLine={false} tickFormatter={(v: number) => compact(v)} width={48} />
                <Tooltip
                  contentStyle={{ background: '#0D1526', border: '1px solid #1B2E45', borderRadius: 8, fontSize: 11, color: '#E2E8F0' }}
                  formatter={(v: any) => [rupees(Number(v) || 0), '']}
                  labelStyle={{ color: '#64748B', fontSize: 10, marginBottom: 4 }}
                />
                <Legend
                  iconType="circle"
                  iconSize={6}
                  wrapperStyle={{ fontSize: 11, paddingTop: 12, color: '#94A3B8' }}
                />
                {agentNames.map((name, i) => (
                  <Area
                    key={name}
                    type="monotone"
                    dataKey={name}
                    stroke={AGENT_COLORS[i % AGENT_COLORS.length]}
                    strokeWidth={2}
                    fill={`url(#grad-${i})`}
                    dot={false}
                    connectNulls
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Portfolio" value={compact(totalValue)} icon={TrendingUp} />
        <StatCard
          label="Avg Return"
          value={avgReturn >= 0 ? `+${avgReturn.toFixed(2)}%` : `${avgReturn.toFixed(2)}%`}
          icon={TrendingUp}
          accent={avgReturn >= 0 ? '#22C55E' : '#EF4444'}
          trend={avgReturn !== 0 ? { value: avgReturn, positive: avgReturn >= 0 } : undefined}
        />
        <StatCard label="Leader" value={topAgent?.name || '--'} icon={Users} />
        <StatCard label="Next Check" value={status?.next_checkpoint || '--'} icon={Clock} />
      </div>

      {/* Full leaderboard table */}
      <div className="bg-arena-surface border border-arena-border rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-arena-border flex items-center justify-between">
          <span className="text-[10px] font-semibold text-arena-muted uppercase tracking-widest">Full Leaderboard</span>
          <span className="text-[10px] text-arena-muted font-mono-data">{leaderboard.length} agents</span>
        </div>
        <DataTable
          columns={[
            { key: 'rank', label: '#', align: 'center', className: 'w-12', render: (a: LeaderboardEntry) => (
              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold font-mono-data ${
                a.rank === 1 ? 'bg-arena-warning-light text-arena-warning' :
                a.rank === 2 ? 'bg-arena-border text-arena-muted' :
                a.rank === 3 ? 'text-arena-muted' : 'text-arena-muted'
              }`}>{a.rank}</span>
            )},
            { key: 'name', label: 'Agent', render: (a: LeaderboardEntry) => {
              const idx = leaderboard.findIndex(x => x.id === a.id)
              const color = AGENT_COLORS[idx % AGENT_COLORS.length]
              return (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                  <div>
                    <div className="text-sm font-medium text-arena-text">{a.name}</div>
                    <div className="text-[10px] text-arena-muted font-mono-data">{a.model}</div>
                  </div>
                </div>
              )
            }},
            { key: 'persona', label: 'Persona', hideOnMobile: true, render: (a: LeaderboardEntry) => (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-arena-border text-arena-muted">
                {a.persona || 'balanced'}
              </span>
            )},
            { key: 'total_value', label: 'Portfolio', align: 'right', render: (a: LeaderboardEntry) => (
              <span className="font-mono-data text-sm font-semibold tabular-nums">{rupees(a.total_value)}</span>
            )},
            { key: 'return_pct', label: 'Return', align: 'right', render: (a: LeaderboardEntry) => (
              <span className={`font-mono-data text-sm font-bold tabular-nums ${a.return_pct >= 0 ? 'text-arena-success' : 'text-arena-danger'}`}>
                {pct(a.return_pct)}
              </span>
            )},
          ]}
          data={leaderboard}
          onRowClick={(a) => nav(`/agents/${a.id}`)}
          emptyMessage="No agents seeded yet. POST /api/league/seed-agents with x-service-key header."
        />
      </div>
    </div>
  )
}
