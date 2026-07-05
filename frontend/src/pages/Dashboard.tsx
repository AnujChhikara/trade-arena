import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, LeaderboardEntry, DailySnapshot, LeagueStatus } from '../lib/api'
import { rupees, pct, compact } from '../lib/format'
import StatCard from '../components/StatCard'
import DataTable from '../components/DataTable'
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart,
} from 'recharts'
import {
  TrendingUp, Clock, Users, Activity, Target,
} from 'lucide-react'

const COLORS = ['#2563eb', '#dc2626', '#16a34a', '#ca8a04', '#9333ea', '#0891b2', '#be185d']

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
        <div className="animate-pulse flex items-center gap-3 text-arena-muted">
          <Activity size={20} className="animate-spin" />
          <span className="text-sm">Loading league data...</span>
        </div>
      </div>
    )
  }

  const topAgent = leaderboard[0]
  const totalValue = leaderboard.reduce((s, a) => s + a.total_value, 0)
  const avgReturn = leaderboard.length > 0
    ? leaderboard.reduce((s, a) => s + a.return_pct, 0) / leaderboard.length
    : 0

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Market"
          value={status?.status === 'active' ? 'Open' : 'Closed'}
          icon={status?.status === 'active' ? TrendingUp : Clock}
        />
        <StatCard label="Day" value={status?.day ? status.day.charAt(0).toUpperCase() + status.day.slice(1) : '--'} icon={Clock} />
        <StatCard label="Agents" value={leaderboard.length} icon={Users} />
        <StatCard label="Next Check" value={status?.next_checkpoint || '--'} icon={Target} />
      </div>

      {chartData.length > 0 && (
        <div className="bg-white rounded-xl border border-arena-border shadow-sm">
          <div className="px-6 py-4 border-b border-arena-border">
            <h3 className="text-sm font-semibold text-arena-text">Portfolio Value Over Time</h3>
          </div>
          <div className="p-6">
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={chartData}>
                <defs>
                  {agentNames.map((name, i) => (
                    <linearGradient key={name} id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.1} />
                      <stop offset="95%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} stroke="#e2e8f0" />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} stroke="#e2e8f0" tickFormatter={(v: number) => compact(v)} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                  formatter={(v: any) => [rupees(Number(v) || 0), '']}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                {agentNames.map((name, i) => (
                  <Area
                    key={name}
                    type="monotone"
                    dataKey={name}
                    stroke={COLORS[i % COLORS.length]}
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Total Portfolio Value" value={rupees(totalValue)} icon={Activity} />
        <StatCard
          label="Average Return"
          value={avgReturn >= 0 ? `+${avgReturn.toFixed(2)}%` : `${avgReturn.toFixed(2)}%`}
          icon={TrendingUp}
          trend={avgReturn >= 0 ? { value: avgReturn, positive: true } : { value: Math.abs(avgReturn), positive: false }}
        />
        <StatCard
          label="Leader"
          value={topAgent?.name || '--'}
          icon={Users}
        />
      </div>

      <div className="bg-white rounded-xl border border-arena-border shadow-sm">
        <div className="px-6 py-4 border-b border-arena-border flex items-center justify-between">
          <h3 className="text-sm font-semibold text-arena-text">Leaderboard</h3>
          <span className="text-xs text-arena-muted">{leaderboard.length} agents</span>
        </div>
        <DataTable
          columns={[
            { key: 'rank', label: '#', align: 'center', className: 'w-10', render: (a: LeaderboardEntry) => (
              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                a.rank === 1 ? 'bg-yellow-100 text-yellow-700' :
                a.rank === 2 ? 'bg-slate-100 text-slate-500' :
                a.rank === 3 ? 'bg-orange-100 text-orange-700' :
                'text-arena-muted'
              }`}>{a.rank}</span>
            )},
            { key: 'name', label: 'Agent', render: (a: LeaderboardEntry) => (
              <div>
                <div className="font-medium text-arena-text">{a.name}</div>
                <div className="text-xs text-arena-muted">{a.model}</div>
              </div>
            )},
            { key: 'persona', label: 'Persona', hideOnMobile: true, render: (a: LeaderboardEntry) => (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">{a.persona || 'balanced'}</span>
            )},
            { key: 'total_value', label: 'Portfolio', align: 'right', render: (a: LeaderboardEntry) => (
              <span className="font-medium tabular-nums">{rupees(a.total_value)}</span>
            )},
            { key: 'return_pct', label: 'Return', align: 'right', render: (a: LeaderboardEntry) => (
              <span className={`font-semibold tabular-nums ${a.return_pct >= 0 ? 'text-arena-success' : 'text-arena-danger'}`}>
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
