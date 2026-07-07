import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api, AgentDetail as AgentData, AgentOrder } from '../lib/api'
import { rupees, timeAgo } from '../lib/format'
import StatCard from '../components/StatCard'
import DataTable from '../components/DataTable'
import { ArrowLeft, TrendingUp, Wallet, Target, BarChart3, Brain, ShoppingCart } from 'lucide-react'
import { AGENT_COLORS } from './Dashboard'

type Tab = 'positions' | 'decisions' | 'orders'

const DECISION_BADGES: Record<string, { bg: string; text: string; label: string }> = {
  BUY:  { bg: '#052E16', text: '#22C55E', label: 'BUY' },
  SELL: { bg: '#2D0808', text: '#EF4444', label: 'SELL' },
  HOLD: { bg: '#1B2E45', text: '#64748B', label: 'HOLD' },
}

const STATUS_BADGES: Record<string, { bg: string; text: string }> = {
  success:     { bg: '#052E16', text: '#22C55E' },
  parse_error: { bg: '#2D0808', text: '#EF4444' },
  timeout:     { bg: '#2D1A00', text: '#F59E0B' },
  rejected:    { bg: '#2D1A00', text: '#F59E0B' },
}

const ORDER_STATUS: Record<string, { bg: string; text: string }> = {
  filled:        { bg: '#052E16', text: '#22C55E' },
  pending:       { bg: '#2D1A00', text: '#F59E0B' },
  rejected:      { bg: '#2D0808', text: '#EF4444' },
  circuit_locked:{ bg: '#1B2E45', text: '#64748B' },
  partial:       { bg: '#0C2340', text: '#38BDF8' },
}

function Badge({ bg, text, label }: { bg: string; text: string; label: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider font-mono-data"
      style={{ backgroundColor: bg, color: text }}>
      {label}
    </span>
  )
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
        <div className="flex items-center gap-3 text-arena-muted">
          <div className="w-4 h-4 border-2 border-arena-primary/30 border-t-arena-primary rounded-full animate-spin" />
          <span className="text-sm font-mono-data tracking-wider">LOADING AGENT...</span>
        </div>
      </div>
    )
  }

  if (error) return (
    <div className="bg-arena-danger-light border border-arena-danger/20 rounded-xl p-4 text-sm text-arena-danger">
      {error}
    </div>
  )
  if (!agent) return <div className="text-arena-muted text-sm">Agent not found</div>

  // Determine agent color by finding index in typical list (fallback to primary)
  const agentColor = AGENT_COLORS[0]

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

  const tabs = [
    { key: 'positions' as Tab, label: 'Positions', icon: Target, count: openPositions.length },
    { key: 'decisions' as Tab, label: 'Decisions', icon: Brain, count: agent.recent_decisions.length },
    { key: 'orders' as Tab, label: 'Orders', icon: ShoppingCart, count: agentOrders.length },
  ]

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <Link to="/agents" className="inline-flex items-center gap-1.5 text-xs text-arena-muted hover:text-arena-text transition-colors font-medium uppercase tracking-wider">
        <ArrowLeft size={14} />
        Agents
      </Link>

      {/* Header */}
      <div className="bg-arena-surface border border-arena-border rounded-xl p-6" style={{ borderColor: `${agentColor}30` }}>
        <div className="flex items-start gap-4">
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center font-display font-bold text-xl shrink-0"
            style={{ backgroundColor: `${agentColor}15`, color: agentColor }}
          >
            {agent.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-display font-bold text-arena-text">{agent.name}</h2>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="text-[10px] px-2 py-0.5 rounded font-medium uppercase tracking-wider bg-arena-border text-arena-muted">
                {agent.persona || 'balanced'}
              </span>
              <span className="text-[10px] text-arena-muted font-mono-data">{agent.model}</span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[10px] text-arena-muted uppercase tracking-widest mb-1">Total P&L</div>
            <div className={`text-2xl font-display font-bold tabular-nums ${totalPnl >= 0 ? 'text-arena-success' : 'text-arena-danger'}`}>
              {totalPnl >= 0 ? '+' : ''}₹{Math.abs(totalPnl).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Capital" value={`₹${(capital / 100000).toFixed(1)}L`} icon={Wallet} />
        <StatCard label="Open Positions" value={openPositions.length} icon={Target} />
        <StatCard label="Win Rate" value={`${winRate.toFixed(1)}%`} icon={TrendingUp} accent={winRate > 50 ? '#22C55E' : undefined} />
        <StatCard label="Total Trades" value={totalTrades} icon={BarChart3} />
      </div>

      {/* Portfolio breakdown */}
      <div className="bg-arena-surface border border-arena-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] font-semibold text-arena-muted uppercase tracking-widest">Portfolio Allocation</span>
          <span className="text-[10px] font-mono-data text-arena-muted">
            API cost: ${totalCostUsd.toFixed(5)}
          </span>
        </div>

        <div className="h-2 rounded-full bg-arena-border overflow-hidden mb-3">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${Math.min(investedPct, 100)}%`, backgroundColor: agentColor, boxShadow: `0 0 8px ${agentColor}60` }}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-[10px] text-arena-muted uppercase tracking-widest mb-1">Capital</div>
            <div className="text-sm font-mono-data font-semibold tabular-nums text-arena-text">{rupees(capital)}</div>
          </div>
          <div>
            <div className="text-[10px] text-arena-muted uppercase tracking-widest mb-1">Invested</div>
            <div className="text-sm font-mono-data font-semibold tabular-nums" style={{ color: agentColor }}>{rupees(invested)}</div>
          </div>
          <div>
            <div className="text-[10px] text-arena-muted uppercase tracking-widest mb-1">Cash</div>
            <div className="text-sm font-mono-data font-semibold tabular-nums text-arena-success">{rupees(cash)}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-arena-surface border border-arena-border rounded-xl overflow-hidden">
        <div className="flex border-b border-arena-border">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-5 py-3.5 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all ${
                tab === t.key
                  ? 'border-arena-primary text-arena-primary'
                  : 'border-transparent text-arena-muted hover:text-arena-text'
              }`}
            >
              <t.icon size={13} />
              {t.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono-data ${
                tab === t.key ? 'bg-arena-primary-light text-arena-primary' : 'bg-arena-border text-arena-muted'
              }`}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {tab === 'positions' && (
          <DataTable
            columns={[
              { key: 'symbol', label: 'Symbol', render: (p: any) => (
                <span className="font-mono-data text-sm font-semibold text-arena-text">{p.symbol.replace('.NS', '')}</span>
              )},
              { key: 'quantity', label: 'Qty', align: 'right', render: (p: any) => (
                <span className="font-mono-data tabular-nums text-arena-text-dim">{p.quantity}</span>
              )},
              { key: 'entry_price', label: 'Entry', align: 'right', render: (p: any) => (
                <span className="font-mono-data tabular-nums text-arena-text-dim">{rupees(p.entry_price)}</span>
              )},
              { key: 'current_price', label: 'LTP', align: 'right', render: (p: any) => (
                <span className="font-mono-data tabular-nums">{p.current_price ? rupees(p.current_price) : <span className="text-arena-muted">--</span>}</span>
              )},
              { key: 'unrealized_pnl', label: 'Unrealised P&L', align: 'right', render: (p: any) => {
                const v = parseFloat(p.unrealized_pnl || '0')
                return <span className={`font-mono-data font-semibold tabular-nums ${v >= 0 ? 'text-arena-success' : 'text-arena-danger'}`}>{v >= 0 ? '+' : ''}₹{Math.abs(v).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
              }},
              { key: 'strategy_type', label: 'Type', render: (p: any) => (
                <Badge
                  bg={p.strategy_type === 'INTRADAY' ? '#2D1A00' : '#1B2E45'}
                  text={p.strategy_type === 'INTRADAY' ? '#F59E0B' : '#64748B'}
                  label={p.strategy_type}
                />
              )},
            ]}
            data={openPositions}
            emptyMessage="No open positions"
          />
        )}

        {tab === 'decisions' && (
          <DataTable
            columns={[
              { key: 'created_at', label: 'Time', render: (d: any) => (
                <div>
                  <div className="text-xs text-arena-text font-mono-data">
                    {new Date(d.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="text-[10px] text-arena-muted">{timeAgo(d.created_at)}</div>
                </div>
              )},
              { key: 'decision', label: 'Decision', render: (d: any) => {
                const b = d.decision ? DECISION_BADGES[d.decision] : null
                return b ? <Badge {...b} /> : <span className="text-arena-muted text-xs">--</span>
              }},
              { key: 'status', label: 'Status', render: (d: any) => {
                const b = STATUS_BADGES[d.status] || { bg: '#1B2E45', text: '#64748B' }
                return <Badge bg={b.bg} text={b.text} label={d.status} />
              }},
              { key: 'hypothesis', label: 'Hypothesis', render: (d: any) => (
                <div className="text-xs text-arena-text-dim max-w-xs truncate" title={d.hypothesis || ''}>
                  {d.hypothesis || <span className="italic text-arena-muted">no hypothesis</span>}
                </div>
              )},
              { key: 'response_time_ms', label: 'ms', align: 'right', hideOnMobile: true, render: (d: any) => (
                <span className="text-[11px] font-mono-data tabular-nums text-arena-muted">{d.response_time_ms ?? '--'}</span>
              )},
              { key: 'cost', label: 'Cost', align: 'right', hideOnMobile: true, render: (d: any) => (
                <span className="text-[11px] font-mono-data tabular-nums text-arena-muted">
                  {d.cost ? `$${parseFloat(d.cost).toFixed(5)}` : '--'}
                </span>
              )},
            ]}
            data={agent.recent_decisions}
            emptyMessage="No decisions yet"
          />
        )}

        {tab === 'orders' && (
          <DataTable
            columns={[
              { key: 'created_at', label: 'Time', render: (o: AgentOrder) => (
                <span className="text-[11px] font-mono-data text-arena-muted">{timeAgo(o.created_at)}</span>
              )},
              { key: 'symbol', label: 'Symbol', render: (o: AgentOrder) => (
                <span className="font-mono-data font-semibold text-sm text-arena-text">{o.symbol.replace('.NS', '')}</span>
              )},
              { key: 'side', label: 'Side', render: (o: AgentOrder) => (
                <Badge
                  bg={o.side === 'BUY' ? '#052E16' : '#2D0808'}
                  text={o.side === 'BUY' ? '#22C55E' : '#EF4444'}
                  label={o.side}
                />
              )},
              { key: 'quantity', label: 'Qty', align: 'right', render: (o: AgentOrder) => (
                <span className="font-mono-data tabular-nums text-arena-text-dim">{o.quantity ?? '--'}</span>
              )},
              { key: 'executed_price', label: 'Price', align: 'right', render: (o: AgentOrder) => (
                <span className="font-mono-data tabular-nums text-arena-text-dim">
                  {o.executed_price ? rupees(o.executed_price) : <span className="text-arena-muted">--</span>}
                </span>
              )},
              { key: 'amount', label: 'Amount', align: 'right', hideOnMobile: true, render: (o: AgentOrder) => (
                <span className="font-mono-data tabular-nums text-arena-text-dim">
                  {o.amount ? rupees(o.amount) : '--'}
                </span>
              )},
              { key: 'status', label: 'Status', render: (o: AgentOrder) => {
                const b = ORDER_STATUS[o.status] || { bg: '#1B2E45', text: '#64748B' }
                return (
                  <div>
                    <Badge bg={b.bg} text={b.text} label={o.status} />
                    {o.rejection_reason && (
                      <div className="text-[10px] text-arena-muted mt-1 max-w-xs truncate" title={o.rejection_reason}>
                        {o.rejection_reason}
                      </div>
                    )}
                  </div>
                )
              }},
            ]}
            data={agentOrders}
            emptyMessage="No orders placed yet"
          />
        )}
      </div>
    </div>
  )
}
