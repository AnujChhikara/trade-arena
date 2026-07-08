import { useEffect, useState } from 'react'
import { api, SnapshotSummary, SnapshotDetail } from '@/lib/api'
import { timeAgo, compact } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { TrendingUp, TrendingDown, Hash, BarChart3 } from 'lucide-react'

export default function Replay() {
  const [snapshots, setSnapshots] = useState<SnapshotSummary[]>([])
  const [selected, setSelected] = useState<SnapshotDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.snapshots.list(100).then((s) => {
      setSnapshots(s)
      if (s.length) api.snapshots.get(s[0].id).then(setSelected)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="mx-auto flex max-w-6xl gap-5">
        <Skeleton className="h-[70vh] w-64" />
        <Skeleton className="h-[70vh] flex-1" />
      </div>
    )
  }

  const sectors = selected?.sector_summary
    ? Object.entries(selected.sector_summary).sort((a, b) => (b[1].avg_change ?? 0) - (a[1].avg_change ?? 0))
    : []
  const gainers = selected?.movers?.top_gainers ?? []
  const losers = selected?.movers?.top_losers ?? []

  return (
    <div className="mx-auto flex max-w-6xl gap-5">
      {/* Timeline */}
      <Card className="w-64 shrink-0 py-0">
        <CardHeader className="border-b px-4 py-3">
          <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">Snapshots · {snapshots.length}</CardTitle>
        </CardHeader>
        <ScrollArea className="h-[70vh]">
          {snapshots.map((s) => (
            <button
              key={s.id}
              onClick={() => api.snapshots.get(s.id).then(setSelected)}
              className={cn(
                'block w-full border-b px-4 py-3 text-left transition-colors',
                selected?.id === s.id ? 'bg-primary/10 border-l-2 border-l-primary' : 'hover:bg-accent',
              )}
            >
              <p className="font-mono-data text-sm font-semibold">{new Date(s.captured_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {new Date(s.captured_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} · {timeAgo(s.captured_at)}
              </p>
            </button>
          ))}
          {snapshots.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">No snapshots yet</p>}
        </ScrollArea>
      </Card>

      {/* Detail */}
      <div className="min-w-0 flex-1 space-y-5">
        {selected ? (
          <>
            <Card>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-medium">{new Date(selected.captured_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                  <p className="mt-0.5 font-mono-data text-xs text-muted-foreground">Hash: {selected.snapshot_hash?.slice(0, 20) ?? selected.id.slice(0, 20)}…</p>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Hash className="size-3.5" />
                  <span className="font-mono-data text-xs">{selected.universe?.length ?? 0} symbols</span>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-5 md:grid-cols-2">
              <Card>
                <CardHeader><CardTitle>Benchmark</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { label: 'Index', value: selected.benchmark?.index ?? 'NIFTY 100', cls: '' },
                    { label: 'Advancing', value: selected.benchmark?.advancing ?? 0, cls: 'text-up' },
                    { label: 'Declining', value: selected.benchmark?.declining ?? 0, cls: 'text-down' },
                    { label: 'Unchanged', value: selected.benchmark?.unchanged ?? 0, cls: 'text-muted-foreground' },
                  ].map((x) => (
                    <div key={x.label} className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{x.label}</span>
                      <span className={cn('font-mono-data text-sm font-semibold tabular-nums', x.cls)}>{x.value}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Top Movers</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-up"><TrendingUp className="size-3.5" /> Gainers</p>
                    {gainers.slice(0, 3).map((g) => (
                      <div key={g.symbol} className="flex items-center justify-between py-1">
                        <span className="font-mono-data text-xs font-semibold">{g.symbol.replace('.NS', '')}</span>
                        <span className="font-mono-data text-xs font-bold tabular-nums text-up">+{g.change_pct?.toFixed(2)}%</span>
                      </div>
                    ))}
                    {gainers.length === 0 && <p className="text-xs text-muted-foreground">No data</p>}
                  </div>
                  <div className="border-t pt-3">
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-down"><TrendingDown className="size-3.5" /> Losers</p>
                    {losers.slice(0, 3).map((l) => (
                      <div key={l.symbol} className="flex items-center justify-between py-1">
                        <span className="font-mono-data text-xs font-semibold">{l.symbol.replace('.NS', '')}</span>
                        <span className="font-mono-data text-xs font-bold tabular-nums text-down">{l.change_pct?.toFixed(2)}%</span>
                      </div>
                    ))}
                    {losers.length === 0 && <p className="text-xs text-muted-foreground">No data</p>}
                  </div>
                </CardContent>
              </Card>
            </div>

            {sectors.length > 0 && (
              <Card>
                <CardHeader><CardTitle>Sector Summary</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                    {sectors.map(([sector, data]) => {
                      const chg = data.avg_change ?? 0
                      const pos = chg >= 0
                      return (
                        <div key={sector} className={cn('rounded-lg border p-3', pos ? 'border-up/20 bg-up/5' : 'border-down/20 bg-down/5')}>
                          <p className="mb-1 truncate text-xs text-muted-foreground">{sector}</p>
                          <p className={cn('font-mono-data text-base font-bold tabular-nums', pos ? 'text-up' : 'text-down')}>{pos ? '+' : ''}{chg.toFixed(2)}%</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">{data.stock_count} stocks</p>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader><CardTitle>Recent Quotes · top 20 by volume</CardTitle></CardHeader>
              <CardContent className="px-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-6">Symbol</TableHead>
                      <TableHead className="text-right">LTP</TableHead>
                      <TableHead className="text-right">Change %</TableHead>
                      <TableHead className="pr-6 text-right">Volume</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(selected.quotes ?? {})
                      .sort(([, a], [, b]) => (b.volume ?? 0) - (a.volume ?? 0))
                      .slice(0, 20)
                      .map(([sym, q]) => (
                        <TableRow key={sym}>
                          <TableCell className="pl-6 font-mono-data text-xs font-semibold">{sym.replace('.NS', '')}</TableCell>
                          <TableCell className="text-right font-mono-data text-xs tabular-nums">{q.ltp?.toFixed(2) ?? '—'}</TableCell>
                          <TableCell className={cn('text-right font-mono-data text-xs font-bold tabular-nums', (q.change_pct ?? 0) >= 0 ? 'text-up' : 'text-down')}>
                            {q.change_pct != null ? `${q.change_pct >= 0 ? '+' : ''}${q.change_pct.toFixed(2)}%` : '—'}
                          </TableCell>
                          <TableCell className="pr-6 text-right font-mono-data text-xs tabular-nums text-muted-foreground">{q.volume ? compact(q.volume).replace('₹', '') : '—'}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
              <BarChart3 className="size-7 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Select a snapshot from the timeline</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
