import { useEffect, useState } from 'react'
import { api, SnapshotSummary } from '../lib/api'
import { timeAgo, compact } from '../lib/format'
import { Activity, TrendingUp, TrendingDown, BarChart3, Hash, Layers } from 'lucide-react'

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
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse flex items-center gap-3 text-arena-muted">
          <Activity size={20} className="animate-spin" />
          <span className="text-sm">Loading snapshots...</span>
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
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-arena-text">Market Replay</h2>
        <p className="text-sm text-arena-muted mt-1">Browse checkpoint snapshots to view market state at any point in time.</p>
      </div>

      <div className="flex gap-6">
        <div className="w-72 shrink-0">
          <div className="bg-white rounded-xl border border-arena-border shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-arena-border flex items-center gap-2 text-sm font-semibold">
              <Layers size={16} className="text-arena-primary" />
              Snapshots
              <span className="ml-auto text-xs text-arena-muted font-normal">{snapshots.length}</span>
            </div>
            <div className="max-h-[65vh] overflow-y-auto">
              {snapshots.map(s => (
                <div
                  key={s.id}
                  onClick={() => api.snapshots.get(s.id).then(setSelected)}
                  className={`px-4 py-3 cursor-pointer border-b border-arena-border/50 transition-colors ${
                    selected?.id === s.id ? 'bg-arena-primary-light border-l-2 border-l-arena-primary' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="text-sm font-medium">{new Date(s.captured_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-arena-muted">{new Date(s.captured_at).toLocaleDateString()}</span>
                    <span className="text-xs text-arena-muted">{timeAgo(s.captured_at)}</span>
                  </div>
                  <div className="text-[10px] text-arena-muted font-mono mt-0.5 truncate">{s.snapshot_hash.slice(0, 16)}...</div>
                </div>
              ))}
              {snapshots.length === 0 && (
                <div className="p-6 text-center text-sm text-arena-muted">No snapshots yet</div>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 min-w-0 space-y-4">
          {selected ? (
            <>
              <div className="bg-white rounded-xl border border-arena-border shadow-sm">
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold">
                        Snapshot — {new Date(selected.captured_at).toLocaleString()}
                      </h3>
                      <div className="text-xs text-arena-muted font-mono mt-1">Hash: {selected.snapshot_hash || selected.id.slice(0, 16)}...</div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Hash size={14} className="text-arena-muted" />
                      <span className="text-arena-muted">{selected.universe?.length || 0} symbols</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl border border-arena-border shadow-sm">
                  <div className="px-5 py-3 border-b border-arena-border">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-arena-muted">Benchmark</h4>
                  </div>
                  <div className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-arena-muted">Index</span>
                      <span className="text-sm font-medium">{selected.benchmark?.index || 'NIFTY 100'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-arena-muted">Advancing</span>
                      <span className="text-sm font-medium text-arena-success">{selected.benchmark?.advancing || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-arena-muted">Declining</span>
                      <span className="text-sm font-medium text-arena-danger">{selected.benchmark?.declining || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-arena-muted">Unchanged</span>
                      <span className="text-sm font-medium">{selected.benchmark?.unchanged || 0}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-arena-border shadow-sm">
                  <div className="px-5 py-3 border-b border-arena-border">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-arena-muted">Top Movers</h4>
                  </div>
                  <div className="p-5 space-y-2">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs text-arena-success font-medium mb-2">
                        <TrendingUp size={14} />
                        Gainers
                      </div>
                      {gainers.slice(0, 3).map((g: any) => (
                        <div key={g.symbol} className="flex items-center justify-between py-1">
                          <span className="text-sm font-medium">{g.symbol}</span>
                          <span className="text-sm text-arena-success font-medium">+{g.change_pct?.toFixed(2)}%</span>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-arena-border pt-2">
                      <div className="flex items-center gap-1.5 text-xs text-arena-danger font-medium mb-2">
                        <TrendingDown size={14} />
                        Losers
                      </div>
                      {losers.slice(0, 3).map((l: any) => (
                        <div key={l.symbol} className="flex items-center justify-between py-1">
                          <span className="text-sm font-medium">{l.symbol}</span>
                          <span className="text-sm text-arena-danger font-medium">{l.change_pct?.toFixed(2)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-arena-border shadow-sm">
                <div className="px-5 py-3 border-b border-arena-border">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-arena-muted">Sector Summary</h4>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {sectors.map(([sector, data]) => (
                      <div key={sector} className="bg-slate-50 rounded-lg p-3">
                        <div className="text-xs text-arena-muted font-medium truncate">{sector}</div>
                        <div className={`text-lg font-bold mt-1 ${(data.avg_change ?? 0) >= 0 ? 'text-arena-success' : 'text-arena-danger'}`}>
                          {(data.avg_change ?? 0) >= 0 ? '+' : ''}{data.avg_change?.toFixed(2) ?? '0.00'}%
                        </div>
                        <div className="text-[10px] text-arena-muted">{data.stock_count} stocks</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-arena-border shadow-sm">
                <div className="px-5 py-3 border-b border-arena-border">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-arena-muted">
                    Recent Quotes
                    <span className="ml-2 text-arena-muted font-normal normal-case">(top 20 by volume)</span>
                  </h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-arena-border">
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-arena-muted uppercase">Symbol</th>
                        <th className="px-4 py-2.5 text-right text-xs font-semibold text-arena-muted uppercase">LTP</th>
                        <th className="px-4 py-2.5 text-right text-xs font-semibold text-arena-muted uppercase">Change</th>
                        <th className="px-4 py-2.5 text-right text-xs font-semibold text-arena-muted uppercase">Volume</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(selected.quotes || {})
                        .sort(([, a]: any, [, b]: any) => (b.volume || 0) - (a.volume || 0))
                        .slice(0, 20)
                        .map(([sym, q]: [string, any]) => (
                          <tr key={sym} className="border-b border-arena-border/50">
                            <td className="px-4 py-2 text-sm font-medium">{sym}</td>
                            <td className="px-4 py-2 text-sm text-right tabular-nums">{q.ltp?.toFixed(2) || '--'}</td>
                            <td className={`px-4 py-2 text-sm text-right font-medium tabular-nums ${(q.change_pct ?? 0) >= 0 ? 'text-arena-success' : 'text-arena-danger'}`}>
                              {q.change_pct != null ? `${q.change_pct >= 0 ? '+' : ''}${q.change_pct.toFixed(2)}%` : '--'}
                            </td>
                            <td className="px-4 py-2 text-sm text-right tabular-nums text-arena-muted">{q.volume ? compact(q.volume) : '--'}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-xl border border-arena-border shadow-sm">
              <div className="p-6 flex items-center justify-center h-48">
                <div className="text-center">
                  <BarChart3 size={32} className="mx-auto text-arena-muted mb-2" />
                  <p className="text-sm text-arena-muted">Select a snapshot from the timeline</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
