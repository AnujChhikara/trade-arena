import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api, AgentDetail as AgentData } from '../lib/api'
import { rupees, pct, timeAgo } from '../lib/format'
import StatCard from '../components/StatCard'
import DataTable from '../components/DataTable'
import { ArrowLeft, TrendingUp, Wallet, Target, BarChart3, Activity } from 'lucide-react'

export default function AgentDetail() {
  const { id } = useParams()
  const [agent, setAgent] = useState<AgentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    api.agents.get(id).then(setAgent).catch(e => setError(e.message)).finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse flex items-center gap-3 text-[var(--color-arena-muted)]">
          <Activity size={20} className="animate-spin" />
          <span className="text-sm">Loading agent...</span>
        </div>
      </div>
    )
  }

  if (error) return <div className="text-[var(--color-arena-danger)] bg-[var(--color-arena-danger-light)] rounded-lg p-4 text-sm">{error}</div>
  if (!agent) return <div className="text-[var(--color-arena-muted)] text-sm">Agent not found</div>

  const openPositions = agent.positions.filter(p => p.status === 'open')
  const closedPositions = agent.positions.filter(p => p.status === 'closed')
  const totalPnl = agent.positions.reduce((s, p) => s + parseFloat(p.realized_pnl || '0') + parseFloat(p.unrealized_pnl || '0'), 0)
  const totalTrades = closedPositions.length
  const winningTrades = closedPositions.filter(p => parseFloat(p.realized_pnl) > 0).length
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-[var(--color-arena-muted)] hover:text-[var(--color-arena-text)] transition-colors">
        <ArrowLeft size={16} />
        Back to Dashboard
      </Link>

      {/* Agent Hero */}
      <div className="bg-white rounded-xl border border-[var(--color-arena-border)] shadow-sm">
        <div className="p-6">
          <div className="flex items-start gap-5">
            <div className="w-14 h-14 rounded-xl bg-[var(--color-arena-primary-light)] flex items-center justify-center shrink-0">
              <BarChart3 size={28} className="text-[var(--color-arena-primary)]" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-[var(--color-arena-text)]">{agent.name}</h2>
              <div className="flex items-center gap-3 mt-1 text-sm text-[var(--color-arena-muted)]">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">{agent.persona || 'balanced'}</span>
                <span>{agent.model}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-medium text-[var(--color-arena-muted)] uppercase tracking-wider">Total P&L</div>
              <div className={`text-2xl font-bold ${totalPnl >= 0 ? 'text-[var(--color-arena-success)]' : 'text-[var(--color-arena-danger)]'}`}>
                {pct(totalPnl)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Capital" value={rupees(agent.capital)} icon={Wallet} />
        <StatCard label="Open Positions" value={openPositions.length} icon={Target} />
        <StatCard label="Win Rate" value={winRate.toFixed(1) + '%'} icon={TrendingUp} />
        <StatCard label="Total Trades" value={totalTrades} icon={BarChart3} />
      </div>

      {/* Open Positions */}
      <div className="bg-white rounded-xl border border-[var(--color-arena-border)] shadow-sm">
        <div className="px-6 py-4 border-b border-[var(--color-arena-border)]">
          <h3 className="text-sm font-semibold">Open Positions</h3>
        </div>
        <DataTable
          columns={[
            { key: 'symbol', label: 'Symbol', render: (p: any) => (
              <span className="font-medium text-[var(--color-arena-text)]">{p.symbol.replace('.NS', '')}</span>
            )},
            { key: 'quantity', label: 'Qty', align: 'right' },
            { key: 'entry_price', label: 'Entry', align: 'right', render: (p: any) => rupees(p.entry_price) },
            { key: 'current_price', label: 'LTP', align: 'right', render: (p: any) => p.current_price ? rupees(p.current_price) : <span className="text-[var(--color-arena-muted)]">--</span> },
            { key: 'unrealized_pnl', label: 'P&L', align: 'right', render: (p: any) => {
              const v = parseFloat(p.unrealized_pnl || '0')
              return <span className={`font-semibold ${v >= 0 ? 'text-[var(--color-arena-success)]' : 'text-[var(--color-arena-danger)]'}`}>{pct(v)}</span>
            }},
            { key: 'strategy_type', label: 'Type', render: (p: any) => (
              <span className={p.strategy_type === 'INTRADAY' ? 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--color-arena-warning-light)] text-[var(--color-arena-warning)]' : 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600'}>{p.strategy_type}</span>
            )},
          ]}
          data={openPositions}
          emptyMessage="No open positions"
        />
      </div>

      {/* Recent Decisions */}
      <div className="bg-white rounded-xl border border-[var(--color-arena-border)] shadow-sm">
        <div className="px-6 py-4 border-b border-[var(--color-arena-border)]">
          <h3 className="text-sm font-semibold">Recent Decisions</h3>
        </div>
        <DataTable
          columns={[
            { key: 'created_at', label: 'Time', render: (d: any) => (
              <div>
                <div className="text-sm text-[var(--color-arena-text)]">{new Date(d.created_at).toLocaleDateString()}</div>
                <div className="text-xs text-[var(--color-arena-muted)]">{timeAgo(d.created_at)}</div>
              </div>
            )},
            { key: 'status', label: 'Status', render: (d: any) => (
              <span className={d.status === 'success' ? 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--color-arena-success-light)] text-[var(--color-arena-success)]' : d.status === 'parse_error' ? 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--color-arena-danger-light)] text-[var(--color-arena-danger)]' : 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--color-arena-warning-light)] text-[var(--color-arena-warning)]'}>
                {d.status}
              </span>
            )},
          ]}
          data={agent.recent_decisions}
          emptyMessage="No decisions recorded yet"
        />
      </div>
    </div>
  )
}
