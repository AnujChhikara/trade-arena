import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api, AgentDetail as AgentData, AgentOrder } from '../lib/api'
import { rupees, timeAgo } from '../lib/format'
import StatCard from '../components/StatCard'
import DataTable from '../components/DataTable'
import { ArrowLeft, TrendingUp, Wallet, Target, BarChart3, Activity, Brain, ShoppingCart } from 'lucide-react'

type Tab = 'positions' | 'decisions' | 'orders'

const DECISION_COLORS: Record<string, string> = {
  BUY: 'bg-arena-success-light text-arena-success',
  SELL: 'bg-arena-danger-light text-arena-danger',
  HOLD: 'bg-slate-100 text-slate-500',
}

const STATUS_COLORS: Record<string, string> = {
  success: 'bg-arena-success-light text-arena-success',
  parse_error: 'bg-arena-danger-light text-arena-danger',
  timeout: 'bg-arena-warning-light text-arena-warning',
  rejected: 'bg-arena-warning-light text-arena-warning',
}

const ORDER_STATUS_COLORS: Record<string, string> = {
  filled: 'bg-arena-success-light text-arena-success',
  pending: 'bg-arena-warning-light text-arena-warning',
  rejected: 'bg-arena-danger-light text-arena-danger',
  circuit_locked: 'bg-slate-100 text-slate-500',
  partial: 'bg-blue-100 text-blue-700',
}

export default function AgentDetail() {
  const { id } = useParams()
  const [agent, setAgent] = useState<AgentData | null>(null)
  const [agentOrders, setAgentOrders] = useState<AgentOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<Tab>('positions')

  useEffect(() => {
    if (!id) return
    Promise.all([
      api.agents.get(id).then(setAgent),
      api.agents.orders(id).then(setAgentOrders),
    ]).catch(e => setError(e.message)).finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse flex items-center gap-3 text-arena-muted">
          <Activity size={20} className="animate-spin" />
          <span className="text-sm">Loading agent...</span>
        </div>
      </div>
    )
  }

  if (error) return <div className="text-arena-danger bg-arena-danger-light rounded-lg p-4 text-sm">{error}</div>
  if (!agent) return <div className="text-arena-muted text-sm">Agent not found</div>

  const openPositions = agent.positions.filter(p => p.status === 'open')
  const closedPositions = agent.positions.filter(p => p.status === 'closed')
  const totalPnl = agent.positions.reduce((s, p) => s + parseFloat(p.realized_pnl || '0') + parseFloat(p.unrealized_pnl || '0'), 0)
  const totalTrades = closedPositions.length
  const winningTrades = closedPositions.filter(p => parseFloat(p.realized_pnl) > 0).length
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0

  const capital = parseFloat(agent.capital || '1000000')
  const invested = openPositions.reduce((s, p) => s + p.quantity * parseFloat(p.entry_price), 0)
  const cash = capital - invested
  const investedPct = capital > 0 ? (invested / capital) * 100 : 0

  const totalCostUsd = agent.recent_decisions.reduce((s, d) => s + parseFloat(d.cost || '0'), 0)

  return (
    <div className="space-y-6">
      <Link to="/agents" className="inline-flex items-center gap-1.5 text-sm text-arena-muted hover:text-arena-text transition-colors">
        <ArrowLeft size={16} />
        Back to Agents
      </Link>

      {/* Header card */}
      <div className="bg-white rounded-xl border border-arena-border shadow-sm">
        <div className="p-6">
          <div className="flex items-start gap-5">
            <div className="w-14 h-14 rounded-xl bg-arena-primary-light flex items-center justify-center shrink-0">
              <BarChart3 size={28} className="text-arena-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-arena-text">{agent.name}</h2>
              <div className="flex items-center gap-3 mt-1 text-sm text-arena-muted">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">{agent.persona || 'balanced'}</span>
                <span>{agent.model}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-medium text-arena-muted uppercase tracking-wider">Total P&L</div>
              <div className={`text-2xl font-bold ${totalPnl >= 0 ? 'text-arena-success' : 'text-arena-danger'}`}>
                {totalPnl >= 0 ? '+' : ''}₹{totalPnl.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Capital" value={rupees(agent.capital)} icon={Wallet} />
        <StatCard label="Open Positions" value={openPositions.length} icon={Target} />
        <StatCard label="Win Rate" value={winRate.toFixed(1) + '%'} icon={TrendingUp} />
        <StatCard label="Total Trades" value={totalTrades} icon={BarChart3} />
      </div>

      {/* Portfolio breakdown */}
      <div className="bg-white rounded-xl border border-arena-border shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-arena-text">Portfolio Breakdown</h3>
          <span className="text-xs text-arena-muted">
            API cost: ${totalCostUsd.toFixed(5)} ({(totalCostUsd * 83).toFixed(3)} INR)
          </span>
        </div>
        <div className="flex items-center gap-4 mb-3">
          <div className="flex-1">
            <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full bg-arena-primary rounded-full transition-all"
                style={{ width: `${Math.min(investedPct, 100)}%` }}
              />
            </div>
          </div>
          <span className="text-xs tabular-nums text-arena-muted w-12 text-right">{investedPct.toFixed(1)}%</span>
        </div>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-xs text-arena-muted uppercase tracking-wider mb-1">Total Capital</div>
            <div className="font-semibold tabular-nums">{rupees(capital)}</div>
          </div>
          <div>
            <div className="text-xs text-arena-muted uppercase tracking-wider mb-1">Invested</div>
            <div className="font-semibold tabular-nums text-arena-primary">{rupees(invested)}</div>
          </div>
          <div>
            <div className="text-xs text-arena-muted uppercase tracking-wider mb-1">Cash</div>
            <div className="font-semibold tabular-nums text-arena-success">{rupees(cash)}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-arena-border shadow-sm">
        <div className="flex border-b border-arena-border">
          {([
            { key: 'positions', label: 'Positions', icon: Target, count: openPositions.length },
            { key: 'decisions', label: 'Decisions', icon: Brain, count: agent.recent_decisions.length },
            { key: 'orders', label: 'Orders', icon: ShoppingCart, count: agentOrders.length },
          ] as const).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key
                  ? 'border-arena-primary text-arena-primary'
                  : 'border-transparent text-arena-muted hover:text-arena-text'
              }`}
            >
              <t.icon size={15} />
              {t.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === t.key ? 'bg-arena-primary-light text-arena-primary' : 'bg-slate-100 text-arena-muted'}`}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {tab === 'positions' && (
          <>
            <div className="px-5 py-3 border-b border-arena-border">
              <span className="text-xs font-semibold uppercase tracking-wider text-arena-muted">Open Positions ({openPositions.length})</span>
            </div>
            <DataTable
              columns={[
                { key: 'symbol', label: 'Symbol', render: (p: any) => <span className="font-medium">{p.symbol.replace('.NS', '')}</span> },
                { key: 'quantity', label: 'Qty', align: 'right' },
                { key: 'entry_price', label: 'Entry', align: 'right', render: (p: any) => rupees(p.entry_price) },
                { key: 'current_price', label: 'LTP', align: 'right', render: (p: any) => p.current_price ? rupees(p.current_price) : <span className="text-arena-muted">--</span> },
                { key: 'unrealized_pnl', label: 'Unrealised P&L', align: 'right', render: (p: any) => {
                  const v = parseFloat(p.unrealized_pnl || '0')
                  return <span className={`font-semibold ${v >= 0 ? 'text-arena-success' : 'text-arena-danger'}`}>{v >= 0 ? '+' : ''}₹{Math.abs(v).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                }},
                { key: 'strategy_type', label: 'Type', render: (p: any) => (
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${p.strategy_type === 'INTRADAY' ? 'bg-arena-warning-light text-arena-warning' : 'bg-slate-100 text-slate-600'}`}>{p.strategy_type}</span>
                )},
              ]}
              data={openPositions}
              emptyMessage="No open positions"
            />
          </>
        )}

        {tab === 'decisions' && (
          <DataTable
            columns={[
              { key: 'created_at', label: 'Time', render: (d: any) => (
                <div>
                  <div className="text-sm text-arena-text">{new Date(d.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                  <div className="text-xs text-arena-muted">{timeAgo(d.created_at)}</div>
                </div>
              )},
              { key: 'decision', label: 'Decision', render: (d: any) => d.decision ? (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${DECISION_COLORS[d.decision] || 'bg-slate-100 text-slate-500'}`}>{d.decision}</span>
              ) : <span className="text-arena-muted text-xs">--</span> },
              { key: 'status', label: 'Status', render: (d: any) => (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[d.status] || 'bg-slate-100 text-slate-500'}`}>{d.status}</span>
              )},
              { key: 'hypothesis', label: 'Hypothesis', render: (d: any) => (
                <div className="text-xs text-arena-muted max-w-xs truncate" title={d.hypothesis || ''}>
                  {d.hypothesis || <span className="italic">no hypothesis</span>}
                </div>
              )},
              { key: 'response_time_ms', label: 'Latency', align: 'right', hideOnMobile: true, render: (d: any) => (
                <span className="text-xs tabular-nums text-arena-muted">{d.response_time_ms ? `${d.response_time_ms}ms` : '--'}</span>
              )},
              { key: 'cost', label: 'Cost', align: 'right', hideOnMobile: true, render: (d: any) => (
                <span className="text-xs tabular-nums text-arena-muted">{d.cost ? `$${parseFloat(d.cost).toFixed(5)}` : '--'}</span>
              )},
            ]}
            data={agent.recent_decisions}
            emptyMessage="No decisions recorded yet"
          />
        )}

        {tab === 'orders' && (
          <DataTable
            columns={[
              { key: 'created_at', label: 'Time', render: (o: AgentOrder) => (
                <div className="text-xs text-arena-muted">{timeAgo(o.created_at)}</div>
              )},
              { key: 'symbol', label: 'Symbol', render: (o: AgentOrder) => <span className="font-medium">{o.symbol.replace('.NS', '')}</span> },
              { key: 'side', label: 'Side', render: (o: AgentOrder) => (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${o.side === 'BUY' ? 'bg-arena-success-light text-arena-success' : 'bg-arena-danger-light text-arena-danger'}`}>{o.side}</span>
              )},
              { key: 'quantity', label: 'Qty', align: 'right', render: (o: AgentOrder) => <span className="tabular-nums">{o.quantity ?? '--'}</span> },
              { key: 'executed_price', label: 'Exec Price', align: 'right', render: (o: AgentOrder) => o.executed_price ? rupees(o.executed_price) : <span className="text-arena-muted">--</span> },
              { key: 'amount', label: 'Amount', align: 'right', hideOnMobile: true, render: (o: AgentOrder) => o.amount ? rupees(o.amount) : '--' },
              { key: 'status', label: 'Status', render: (o: AgentOrder) => (
                <div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ORDER_STATUS_COLORS[o.status] || 'bg-slate-100 text-slate-500'}`}>{o.status}</span>
                  {o.rejection_reason && <div className="text-xs text-arena-muted mt-0.5 max-w-xs truncate" title={o.rejection_reason}>{o.rejection_reason}</div>}
                </div>
              )},
            ]}
            data={agentOrders}
            emptyMessage="No orders placed yet"
          />
        )}
      </div>
    </div>
  )
}
