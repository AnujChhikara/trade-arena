import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api, AgentDetail as AgentData, AgentOrder, Position, DecisionSummary } from '@/lib/api'
import { rupees, timeAgo } from '@/lib/format'
import { agentColor } from '@/lib/constants'
import { StatCard } from '@/components/stat-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { ArrowLeft, Wallet, Target, TrendingUp, BarChart3 } from 'lucide-react'
import type { ComponentProps } from 'react'

type BadgeVariant = ComponentProps<typeof Badge>['variant']

const decisionVariant = (d: string | null): BadgeVariant =>
  d === 'BUY' ? 'up' : d === 'SELL' ? 'down' : 'secondary'

const statusVariant = (s: string): BadgeVariant =>
  s === 'success' || s === 'filled' ? 'up'
  : s === 'parse_error' || s === 'rejected' ? 'down'
  : s === 'timeout' || s === 'pending' || s === 'partial' ? 'warning'
  : 'secondary'

export default function AgentDetail() {
  const { id } = useParams()
  const [agent, setAgent] = useState<AgentData | null>(null)
  const [orders, setOrders] = useState<AgentOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    Promise.all([
      api.agents.get(id).then(setAgent),
      api.agents.orders(id).then(setOrders),
    ]).catch((e) => setError(e.message)).finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-28" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    )
  }
  if (error) return <div className="mx-auto max-w-5xl rounded-lg border border-down/30 bg-down/10 p-4 text-sm text-down">{error}</div>
  if (!agent) return <p className="text-sm text-muted-foreground">Agent not found</p>

  const color = agentColor(0)
  const open = agent.positions.filter((p) => p.status === 'open')
  const closed = agent.positions.filter((p) => p.status === 'closed')
  const totalPnl = agent.positions.reduce((s, p) => s + parseFloat(p.realized_pnl || '0') + parseFloat(p.unrealized_pnl || '0'), 0)
  const wins = closed.filter((p) => parseFloat(p.realized_pnl) > 0).length
  const winRate = closed.length ? (wins / closed.length) * 100 : 0
  const capital = parseFloat(agent.capital || '1000000')
  const invested = open.reduce((s, p) => s + p.quantity * parseFloat(p.entry_price), 0)
  const cash = capital - invested
  const apiCost = agent.recent_decisions.reduce((s, d) => s + parseFloat(d.cost || '0'), 0)

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link to="/agents" className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="size-4" /> Agents
      </Link>

      <Card>
        <CardContent className="flex items-start gap-4 p-6">
          <div className="grid size-14 shrink-0 place-items-center rounded-xl font-display text-xl font-bold" style={{ background: `color-mix(in oklab, ${color} 15%, transparent)`, color }}>
            {agent.name.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-xl font-bold">{agent.name}</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{agent.persona ?? 'balanced'}</Badge>
              <span className="font-mono-data text-xs text-muted-foreground">{agent.model}</span>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Total P&amp;L</p>
            <p className={`font-display text-2xl font-bold tabular-nums ${totalPnl >= 0 ? 'text-up' : 'text-down'}`}>
              {totalPnl >= 0 ? '+' : ''}₹{Math.abs(totalPnl).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Capital" value={`₹${(capital / 100000).toFixed(1)}L`} icon={Wallet} />
        <StatCard label="Open Positions" value={open.length} icon={Target} />
        <StatCard label="Win Rate" value={`${winRate.toFixed(1)}%`} icon={TrendingUp} valueClassName={winRate > 50 ? 'text-up' : ''} />
        <StatCard label="Total Trades" value={closed.length} icon={BarChart3} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Portfolio Allocation
            <span className="font-mono-data text-xs font-normal text-muted-foreground">API cost ${apiCost.toFixed(5)}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Progress value={capital ? Math.min((invested / capital) * 100, 100) : 0} indicatorColor={color} />
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Capital', value: rupees(capital), cls: '' },
              { label: 'Invested', value: rupees(invested), cls: '', style: { color } },
              { label: 'Cash', value: rupees(cash), cls: 'text-up' },
            ].map((x) => (
              <div key={x.label}>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{x.label}</p>
                <p className={`mt-0.5 font-mono-data text-sm font-semibold tabular-nums ${x.cls}`} style={x.style}>{x.value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <Tabs defaultValue="positions">
          <CardHeader className="pb-0">
            <TabsList>
              <TabsTrigger value="positions">Positions ({open.length})</TabsTrigger>
              <TabsTrigger value="decisions">Decisions ({agent.recent_decisions.length})</TabsTrigger>
              <TabsTrigger value="orders">Orders ({orders.length})</TabsTrigger>
            </TabsList>
          </CardHeader>
          <CardContent className="px-0 pt-2">
            <TabsContent value="positions">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Symbol</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Entry</TableHead>
                    <TableHead className="text-right">LTP</TableHead>
                    <TableHead className="text-right">Unrealised P&amp;L</TableHead>
                    <TableHead className="pr-6">Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {open.map((p: Position) => {
                    const v = parseFloat(p.unrealized_pnl || '0')
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="pl-6 font-mono-data text-sm font-semibold">{p.symbol.replace('.NS', '')}</TableCell>
                        <TableCell className="text-right font-mono-data tabular-nums text-muted-foreground">{p.quantity}</TableCell>
                        <TableCell className="text-right font-mono-data tabular-nums text-muted-foreground">{rupees(p.entry_price)}</TableCell>
                        <TableCell className="text-right font-mono-data tabular-nums">{p.current_price ? rupees(p.current_price) : '—'}</TableCell>
                        <TableCell className={`text-right font-mono-data font-semibold tabular-nums ${v >= 0 ? 'text-up' : 'text-down'}`}>{v >= 0 ? '+' : ''}₹{Math.abs(v).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</TableCell>
                        <TableCell className="pr-6"><Badge variant={p.strategy_type === 'INTRADAY' ? 'warning' : 'secondary'}>{p.strategy_type}</Badge></TableCell>
                      </TableRow>
                    )
                  })}
                  {open.length === 0 && <TableRow><TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">No open positions</TableCell></TableRow>}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="decisions">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Time</TableHead>
                    <TableHead>Decision</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Hypothesis</TableHead>
                    <TableHead className="hidden text-right md:table-cell">ms</TableHead>
                    <TableHead className="hidden pr-6 text-right md:table-cell">Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agent.recent_decisions.map((d: DecisionSummary) => (
                    <TableRow key={d.id}>
                      <TableCell className="pl-6">
                        <p className="font-mono-data text-xs">{new Date(d.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                        <p className="text-xs text-muted-foreground">{timeAgo(d.created_at)}</p>
                      </TableCell>
                      <TableCell>{d.decision ? <Badge variant={decisionVariant(d.decision)}>{d.decision}</Badge> : <span className="text-xs text-muted-foreground">—</span>}</TableCell>
                      <TableCell><Badge variant={statusVariant(d.status)}>{d.status}</Badge></TableCell>
                      <TableCell><p className="max-w-xs truncate text-xs text-muted-foreground" title={d.hypothesis ?? ''}>{d.hypothesis || <span className="italic">no hypothesis</span>}</p></TableCell>
                      <TableCell className="hidden text-right font-mono-data text-xs tabular-nums text-muted-foreground md:table-cell">{d.response_time_ms ?? '—'}</TableCell>
                      <TableCell className="hidden pr-6 text-right font-mono-data text-xs tabular-nums text-muted-foreground md:table-cell">{d.cost ? `$${parseFloat(d.cost).toFixed(5)}` : '—'}</TableCell>
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
                    <TableHead className="pl-6">Time</TableHead>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Side</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="pr-6">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="pl-6 font-mono-data text-xs text-muted-foreground">{timeAgo(o.created_at)}</TableCell>
                      <TableCell className="font-mono-data text-sm font-semibold">{o.symbol.replace('.NS', '')}</TableCell>
                      <TableCell><Badge variant={o.side === 'BUY' ? 'up' : 'down'}>{o.side}</Badge></TableCell>
                      <TableCell className="text-right font-mono-data tabular-nums text-muted-foreground">{o.quantity ?? '—'}</TableCell>
                      <TableCell className="text-right font-mono-data tabular-nums text-muted-foreground">{o.executed_price ? rupees(o.executed_price) : '—'}</TableCell>
                      <TableCell className="pr-6">
                        <Badge variant={statusVariant(o.status)}>{o.status}</Badge>
                        {o.rejection_reason && <p className="mt-1 max-w-xs truncate text-xs text-muted-foreground" title={o.rejection_reason}>{o.rejection_reason}</p>}
                      </TableCell>
                    </TableRow>
                  ))}
                  {orders.length === 0 && <TableRow><TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">No orders placed yet</TableCell></TableRow>}
                </TableBody>
              </Table>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  )
}
