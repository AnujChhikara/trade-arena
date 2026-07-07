import { useEffect, useState } from 'react'
import { api, SnapshotSummary } from '../lib/api'
import { timeAgo, compact } from '../lib/format'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, BarChart3, Hash, Layers } from 'lucide-react'

interface SnapshotDetail {
  id: string
  captured_at: string
  snapshot_hash?: string
  benchmark: any
  movers: any
  sector_summary: Record<string, { stock_count: number; avg_change: number | null }>
  quotes: Record<string, any>
  universe: string[]
}

export default function Replay() {
  const [snapshots, setSnapshots] = useState<SnapshotSummary[]>([])
  const [selected, setSelected] = useState<SnapshotDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.snapshots.list(100).then(s => {
      setSnapshots(s)
      if (s.length > 0) api.snapshots.get(s[0].id).then(setSelected)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <Skeleton className="h-9 w-48" />
        <div className="flex gap-5">
          <Skeleton className="h-[70vh] w-64 rounded-xl" />
          <Skeleton className="h-[70vh] flex-1 rounded-xl" />
        </div>
      </div>
    )
  }

  const sectors = selected?.sector_summary
    ? Object.entries(selected.sector_summary).sort((a, b) => (b[1].avg_change ?? 0) - (a[1].avg_change ?? 0))
    : []
  const gainers = selected?.movers?.top_gainers || []
  const losers = selected?.movers?.top_losers || []

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold tracking-tight">Market Replay</h1>
        <p className="mt-1 text-sm text-muted-foreground">Browse checkpoint snapshots — view market state at any point in time</p>
      </div>

      <div className="flex gap-5">
        {/* Timeline */}
        <Card className="w-64 shrink-0 overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Layers size={14} className="text-primary" /> Snapshots</CardTitle>
            <CardDescription>{snapshots.length}</CardDescription>
          </CardHeader>
          <div className="max-h-[68vh] overflow-y-auto">
            {snapshots.map(s => (
              <button
                key={s.id}
                onClick={() => api.snapshots.get(s.id).then(setSelected)}
                className={cn(
                  'block w-full border-b border-border/40 px-4 py-3 text-left transition-all',
                  selected?.id === s.id ? 'bg-primary/8 border-l-2 border-l-primary' : 'hover:bg-secondary/50',
                )}
              >
                <div className="font-mono-data text-sm font-semibold">
                  {new Date(s.captured_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className="text-[10px] font-mono-data text-muted-foreground">
                    {new Date(s.captured_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{timeAgo(s.captured_at)}</span>
                </div>
              </button>
            ))}
            {snapshots.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">No snapshots yet</div>}
          </div>
        </Card>

        {/* Detail */}
        <div className="min-w-0 flex-1 space-y-5">
          {selected ? (
            <>
              <Card className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold">
                      {new Date(selected.captured_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="mt-1 text-[10px] font-mono-data text-muted-foreground">Hash: {selected.snapshot_hash || selected.id.slice(0, 16)}...</div>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Hash size={13} />
                    <span className="font-mono-data text-[11px]">{selected.universe?.length || 0} symbols</span>
                  </div>
                </div>
              </Card>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Card className="overflow-hidden">
                  <CardHeader><CardTitle>Benchmark</CardTitle></CardHeader>
                  <div className="space-y-3 p-5">
                    {[
                      { label: 'Index', value: selected.benchmark?.index || 'NIFTY 100', cls: 'text-foreground' },
                      { label: 'Advancing', value: selected.benchmark?.advancing || 0, cls: 'text-up' },
                      { label: 'Declining', value: selected.benchmark?.declining || 0, cls: 'text-down' },
                      { label: 'Unchanged', value: selected.benchmark?.unchanged || 0, cls: 'text-muted-foreground' },
                    ].map(({ label, value, cls }) => (
                      <div key={label} className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{label}</span>
                        <span className={cn('font-mono-data text-sm font-semibold tabular-nums', cls)}>{value}</span>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="overflow-hidden">
                  <CardHeader><CardTitle>Top Movers</CardTitle></CardHeader>
                  <div className="space-y-3 p-5">
                    <div>
                      <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-up"><TrendingUp size={12} /> Gainers</div>
                      {gainers.slice(0, 3).map((g: any) => (
                        <div key={g.symbol} className="flex items-center justify-between py-1">
                          <span className="font-mono-data text-xs font-semibold">{g.symbol.replace('.NS', '')}</span>
                          <span className="font-mono-data text-xs font-bold tabular-nums text-up">+{g.change_pct?.toFixed(2)}%</span>
                        </div>
                      ))}
                      {gainers.length === 0 && <p className="text-xs text-muted-foreground">No data</p>}
                    </div>
                    <div className="border-t border-border/50 pt-3">
                      <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-down"><TrendingDown size={12} /> Losers</div>
                      {losers.slice(0, 3).map((l: any) => (
                        <div key={l.symbol} className="flex items-center justify-between py-1">
                          <span className="font-mono-data text-xs font-semibold">{l.symbol.replace('.NS', '')}</span>
                          <span className="font-mono-data text-xs font-bold tabular-nums text-down">{l.change_pct?.toFixed(2)}%</span>
                        </div>
                      ))}
                      {losers.length === 0 && <p className="text-xs text-muted-foreground">No data</p>}
                    </div>
                  </div>
                </Card>
              </div>

              {sectors.length > 0 && (
                <Card className="overflow-hidden">
                  <CardHeader><CardTitle>Sector Summary</CardTitle></CardHeader>
                  <div className="p-5">
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                      {sectors.map(([sector, data]) => {
                        const chg = data.avg_change ?? 0
                        const pos = chg >= 0
                        return (
                          <div key={sector} className={cn('rounded-lg border p-3', pos ? 'border-up/20 bg-up-soft/40' : 'border-down/20 bg-down-soft/40')}>
                            <div className="mb-1 truncate text-[10px] font-medium text-muted-foreground">{sector}</div>
                            <div className={cn('font-mono-data text-base font-bold tabular-nums', pos ? 'text-up' : 'text-down')}>{pos ? '+' : ''}{chg.toFixed(2)}%</div>
                            <div className="mt-0.5 text-[9px] text-muted-foreground">{data.stock_count} stocks</div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </Card>
              )}

              <Card className="overflow-hidden">
                <CardHeader>
                  <CardTitle>Recent Quotes</CardTitle>
                  <CardDescription>top 20 by volume</CardDescription>
                </CardHeader>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Symbol</TableHead>
                      <TableHead className="text-right">LTP</TableHead>
                      <TableHead className="text-right">Change %</TableHead>
                      <TableHead className="text-right">Volume</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(selected.quotes || {})
                      .sort(([, a]: any, [, b]: any) => (b.volume || 0) - (a.volume || 0))
                      .slice(0, 20)
                      .map(([sym, q]: [string, any]) => (
                        <TableRow key={sym}>
                          <TableCell className="font-mono-data text-xs font-semibold">{sym.replace('.NS', '')}</TableCell>
                          <TableCell className="text-right font-mono-data text-xs tabular-nums">{q.ltp?.toFixed(2) || '--'}</TableCell>
                          <TableCell className={cn('text-right font-mono-data text-xs font-bold tabular-nums', (q.change_pct ?? 0) >= 0 ? 'text-up' : 'text-down')}>
                            {q.change_pct != null ? `${q.change_pct >= 0 ? '+' : ''}${q.change_pct.toFixed(2)}%` : '--'}
                          </TableCell>
                          <TableCell className="text-right font-mono-data text-xs tabular-nums text-muted-foreground">{q.volume ? compact(q.volume) : '--'}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </Card>
            </>
          ) : (
            <Card className="p-12 text-center">
              <BarChart3 size={28} className="mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Select a snapshot from the timeline</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
