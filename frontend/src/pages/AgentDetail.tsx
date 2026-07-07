import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api, AgentDetail as AgentData, AgentOrder } from '../lib/api'
import { rupees, timeAgo } from '../lib/format'
import { agentColor } from '@/lib/constants'
import StatCard from '../components/StatCard'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, TrendingUp, Wallet, Target, BarChart3, Brain, ShoppingCart } from 'lucide-react'

const decisionVariant = (d: string | null): 'up' | 'down' | 'default' =>
  d === 'BUY' ? 'up' : d === 'SELL' ? 'down' : 'default'

const statusVariant = (s: string): 'up' | 'down' | 'warning' | 'default' =>
  s === 'success' || s === 'filled' ? 'up'
  : s === 'parse_error' || s === 'rejected' ? 'down'
  : s === 'timeout' || s === 'pending' || s === 'partial' ? 'warning'
  : 'default'

export default function AgentDetail() {
  const { id } = useParams()
  const [agent, setAgent] = useState<AgentData | null>(null)
  const [agentOrders, setAgentOrders] = useState<AgentOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    Promise.all([
      api.agents.get(id).then(setAgent),
      api.agents.orders(id).then(setAgentOrders),
    ]).catch(e => setError(e.message)).finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-28 rounded-xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      </div>
    )
  }

  if (error) return (
    <div className="max-w-5xl mx-auto rounded-xl border border-down/20 bg-down-soft p-4 text-sm text-down">{error}</div>
  )
  if (!agent) return <div className="text-sm text-muted-foreground">Agent not found</div>

  const color = agentColor(0)
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
    <div className="max-w-5xl mx-auto space-y-6">
      <Link to="/agents" className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft size={14} /> Agents
      </Link>

      {/* Header */}
      <Card className="p-6" style={{ borderColor: `${color}30` }}>
        <div className="flex items-start gap-4">
          <div className="grid size-14 shrink-0 place-items-center rounded-xl font-display text-xl font-bold" style={{ backgroundColor: `${color}15`, color }}>
            {agent.name.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-display font-bold">{agent.name}</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <Badge>{agent.persona || 'balanced'}</Badge>
              <span className="text-[11px] text-muted-foreground font-mono-data">{agent.model}</span>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Total P&L</div>
            <div className={`text-2xl font-display font-bold tabular-nums ${totalPnl >= 0 ? 'text-up' : 'text-down'}`}>
              {totalPnl >= 0 ? '+' : ''}₹{Math.abs(totalPnl).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Capital" value={`₹${(capital / 100000).toFixed(1)}L`} icon={Wallet} />
        <StatCard label="Open Positions" value={openPositions.length} icon={Target} />
        <StatCard label="Win Rate" value={`${winRate.toFixed(1)}%`} icon={TrendingUp} accent={winRate > 50 ? 'var(--up)' : undefined} />
        <StatCard label="Total Trades" value={totalTrades} icon={BarChart3} />
      </div>

      {/* Allocation */}
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Portfolio Allocation</span>
          <span className="text-[11px] font-mono-data text-muted-foreground">API cost: ${totalCostUsd.toFixed(5)}</span>
        </div>
        <div className="mb-3 h-2.5 overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(investedPct, 100)}%`, backgroundColor: color, boxShadow: `0 0 10px ${color}70` }} />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Capital</div>
            <div className="mt-1 font-mono-data text-sm font-semibold tabular-nums">{rupees(capital)}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Invested</div>
            <div className="mt-1 font-mono-data text-sm font-semibold tabular-nums" style={{ color }}>{rupees(invested)}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Cash</div>
            <div className="mt-1 font-mono-data text-sm font-semibold tabular-nums text-up">{rupees(cash)}</div>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <Card className="overflow-hidden">
        <Tabs defaultValue="positions">
          <TabsList className="px-2">
            <TabsTrigger value="positions"><Target size={13} /> Positions <span className="ml-1 rounded bg-secondary px-1.5 py-0.5 font-mono-data text-[10px]">{openPositions.length}</span></TabsTrigger>
            <TabsTrigger value="decisions"><Brain size={13} /> Decisions <span className="ml-1 rounded bg-secondary px-1.5 py-0.5 font-mono-data text-[10px]">{agent.recent_decisions.length}</span></TabsTrigger>
            <TabsTrigger value="orders"><ShoppingCart size={13} /> Orders <span className="ml-1 rounded bg-secondary px-1.5 py-0.5 font-mono-data text-[10px]">{agentOrders.length}</span></TabsTrigger>
          </TabsList>

          <TabsContent value="positions">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Entry</TableHead>
                  <TableHead className="text-right">LTP</TableHead>
                  <TableHead className="text-right">Unrealised P&L</TableHead>
                  <TableHead>Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {openPositions.map((p: any) => {
                  const v = parseFloat(p.unrealized_pnl || '0')
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono-data text-sm font-semibold">{p.symbol.replace('.NS', '')}</TableCell>
                      <TableCell className="text-right font-mono-data tabular-nums text-muted-foreground">{p.quantity}</TableCell>
                      <TableCell className="text-right font-mono-data tabular-nums text-muted-foreground">{rupees(p.entry_price)}</TableCell>
                      <TableCell className="text-right font-mono-data tabular-nums">{p.current_price ? rupees(p.current_price) : <span className="text-muted-foreground">--</span>}</TableCell>
                      <TableCell className={`text-right font-mono-data font-semibold tabular-nums ${v >= 0 ? 'text-up' : 'text-down'}`}>{v >= 0 ? '+' : ''}₹{Math.abs(v).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</TableCell>
                      <TableCell><Badge variant={p.strategy_type === 'INTRADAY' ? 'warning' : 'default'}>{p.strategy_type}</Badge></TableCell>
                    </TableRow>
                  )
                })}
                {openPositions.length === 0 && <TableRow><TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">No open positions</TableCell></TableRow>}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="decisions">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Decision</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Hypothesis</TableHead>
                  <TableHead className="hidden md:table-cell text-right">ms</TableHead>
                  <TableHead className="hidden md:table-cell text-right">Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agent.recent_decisions.map((d: any) => (
                  <TableRow key={d.id}>
                    <TableCell>
                      <div className="font-mono-data text-xs">{new Date(d.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                      <div className="text-[10px] text-muted-foreground">{timeAgo(d.created_at)}</div>
                    </TableCell>
                    <TableCell>{d.decision ? <Badge variant={decisionVariant(d.decision)}>{d.decision}</Badge> : <span className="text-xs text-muted-foreground">--</span>}</TableCell>
                    <TableCell><Badge variant={statusVariant(d.status)}>{d.status}</Badge></TableCell>
                    <TableCell><div className="max-w-xs truncate text-xs text-muted-foreground" title={d.hypothesis || ''}>{d.hypothesis || <span className="italic">no hypothesis</span>}</div></TableCell>
                    <TableCell className="hidden md:table-cell text-right font-mono-data text-[11px] tabular-nums text-muted-foreground">{d.response_time_ms ?? '--'}</TableCell>
                    <TableCell className="hidden md:table-cell text-right font-mono-data text-[11px] tabular-nums text-muted-foreground">{d.cost ? `$${parseFloat(d.cost).toFixed(5)}` : '--'}</TableCell>
                  </TableRow>
                ))}
                {agent.recent_decisions.length === 0 && <TableRow><TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">No decisions yet</TableCell></TableRow>}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="orders">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Side</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="hidden md:table-cell text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agentOrders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono-data text-[11px] text-muted-foreground">{timeAgo(o.created_at)}</TableCell>
                    <TableCell className="font-mono-data text-sm font-semibold">{o.symbol.replace('.NS', '')}</TableCell>
                    <TableCell><Badge variant={o.side === 'BUY' ? 'up' : 'down'}>{o.side}</Badge></TableCell>
                    <TableCell className="text-right font-mono-data tabular-nums text-muted-foreground">{o.quantity ?? '--'}</TableCell>
                    <TableCell className="text-right font-mono-data tabular-nums text-muted-foreground">{o.executed_price ? rupees(o.executed_price) : <span className="text-muted-foreground">--</span>}</TableCell>
                    <TableCell className="hidden md:table-cell text-right font-mono-data tabular-nums text-muted-foreground">{o.amount ? rupees(o.amount) : '--'}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(o.status)}>{o.status}</Badge>
                      {o.rejection_reason && <div className="mt-1 max-w-xs truncate text-[10px] text-muted-foreground" title={o.rejection_reason}>{o.rejection_reason}</div>}
                    </TableCell>
                  </TableRow>
                ))}
                {agentOrders.length === 0 && <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">No orders placed yet</TableCell></TableRow>}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  )
}
