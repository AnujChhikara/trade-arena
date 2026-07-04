import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, LeaderboardEntry, DailySnapshot, LeagueStatus } from '../lib/api'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const COLORS = ['#2563eb', '#dc2626', '#16a34a', '#ca8a04', '#9333ea', '#0891b2', '#be185d']

export default function Dashboard() {
  const nav = useNavigate()
  const [status, setStatus] = useState<LeagueStatus | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [daily, setDaily] = useState<DailySnapshot[]>([])

  useEffect(() => {
    api.league.status().then(setStatus)
    api.leaderboard.current().then(setLeaderboard)
    api.leaderboard.daily().then(setDaily)
  }, [])

  const chartData = (() => {
    const agentNames = [...new Set(daily.flatMap(d => d.entries.map(e => e.agentName)))]
    return daily.map(d => {
      const row: Record<string, any> = { date: d.date }
      for (const e of d.entries) row[e.agentName] = parseFloat(e.capital)
      for (const name of agentNames) if (!(name in row)) row[name] = null
      return row
    })
  })()

  const agentNames = [...new Set(daily.flatMap(d => d.entries.map(e => e.agentName)))]

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        <StatCard label="Market" value={status?.status === 'active' ? 'Open' : 'Closed'} color={status?.status === 'active' ? '#16a34a' : '#6b7280'} />
        <StatCard label="Day" value={status?.day || '--'} />
        <StatCard label="Agents" value={leaderboard.length} />
        <StatCard label="Next Checkpoint" value={status?.next_checkpoint || '--'} />
      </div>

      {chartData.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 8, padding: 24, marginBottom: 24, border: '1px solid #e5e7eb' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600 }}>Portfolio Value Over Time</h3>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#9ca3af" />
              <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
              <Tooltip />
              <Legend />
              {agentNames.map((name, i) => (
                <Line key={name} type="monotone" dataKey={name} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} connectNulls />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb', background: '#f9fafb' }}>
              <Th>#</Th>
              <Th>Agent</Th>
              <Th>Persona</Th>
              <Th>Model</Th>
              <Th style={{ textAlign: 'right' }}>Portfolio Value</Th>
              <Th style={{ textAlign: 'right' }}>Return</Th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((a, i) => (
              <tr key={a.id} onClick={() => nav(`/agents/${a.id}`)} style={{ cursor: 'pointer', borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '10px 16px', textAlign: 'center', fontWeight: 600, color: i < 3 ? '#2563eb' : '#6b7280' }}>{a.rank}</td>
                <td style={{ padding: '10px 16px', fontWeight: 500 }}>{a.name}</td>
                <td style={{ padding: '10px 16px', color: '#6b7280', textTransform: 'capitalize' }}>{a.persona || '--'}</td>
                <td style={{ padding: '10px 16px', color: '#6b7280', fontSize: 13 }}>{a.model}</td>
                <td style={{ padding: '10px 16px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>₹{a.total_value.toLocaleString()}</td>
                <td style={{ padding: '10px 16px', textAlign: 'right', color: a.return_pct >= 0 ? '#16a34a' : '#dc2626', fontWeight: 600 }}>{a.return_pct >= 0 ? '+' : ''}{a.return_pct}%</td>
              </tr>
            ))}
            {leaderboard.length === 0 && (
              <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: '#9ca3af' }}>No agents seeded yet. POST /api/league/seed-agents</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Th({ children, style: s }: any) {
  return <th style={{ padding: '10px 16px', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280', textAlign: 'left', ...s }}>{children}</th>
}

function StatCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div style={{ flex: 1, background: '#fff', borderRadius: 8, padding: '16px 20px', border: '1px solid #e5e7eb' }}>
      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: color || '#111827' }}>{value}</div>
    </div>
  )
}
