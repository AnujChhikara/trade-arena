import { useEffect, useState } from 'react'
import { api, SnapshotSummary } from '../lib/api'
import { timeAgo, compact } from '../lib/format'
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
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-arena-muted">
          <div className="w-4 h-4 border-2 border-arena-primary/30 border-t-arena-primary rounded-full animate-spin" />
          <span className="text-sm font-mono-data tracking-wider">LOADING SNAPSHOTS...</span>
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
    <div className="space-y-4 max-w-7xl mx-auto">
      <div>
        <h2 className="text-lg font-display font-bold text-arena-text">Market Replay</h2>
        <p className="text-xs text-arena-muted mt-0.5 tracking-wide">Browse checkpoint snapshots — view market state at any point in time</p>
      </div>

      <div className="flex gap-4">
        {/* Snapshot timeline sidebar */}
        <div className="w-64 shrink-0">
          <div className="bg-arena-surface border border-arena-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-arena-border flex items-center gap-2">
              <Layers size={14} className="text-arena-primary" />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-arena-muted">Snapshots</span>
              <span className="ml-auto text-[10px] font-mono-data text-arena-muted">{snapshots.length}</span>
            </div>
            <div className="max-h-[72vh] overflow-y-auto">
              {snapshots.map(s => (
                <div
                  key={s.id}
                  onClick={() => api.snapshots.get(s.id).then(setSelected)}
                  className={`px-4 py-3 cursor-pointer border-b border-arena-border/40 transition-all ${
                    selected?.id === s.id
                      ? 'bg-arena-primary-light border-l-2 border-l-arena-primary'
                      : 'hover:bg-arena-surface-2'
                  }`}
                >
                  <div className="text-sm font-mono-data font-semibold text-arena-text">
                    {new Date(s.captured_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-arena-muted font-mono-data">
                      {new Date(s.captured_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </span>
                    <span className="text-[10px] text-arena-muted">{timeAgo(s.captured_at)}</span>
                  </div>
                  <div className="text-[9px] text-arena-muted/60 font-mono-data mt-0.5 truncate">
                    {s.snapshot_hash?.slice(0, 12)}...
                  </div>
                </div>
              ))}
              {snapshots.length === 0 && (
                <div className="p-6 text-center text-sm text-arena-muted">No snapshots yet</div>
              )}
            </div>
          </div>
        </div>

        {/* Detail panel */}
        <div className="flex-1 min-w-0 space-y-4">
          {selected ? (
            <>
              {/* Header bar */}
              <div className="bg-arena-surface border border-arena-border rounded-xl p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-arena-text">
                      {new Date(selected.captured_at).toLocaleString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </div>
                    <div className="text-[10px] text-arena-muted font-mono-data mt-1">
                      Hash: {selected.snapshot_hash || selected.id.slice(0, 16)}...
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-arena-muted">
                    <Hash size={13} />
                    <span className="text-[11px] font-mono-data">{selected.universe?.length || 0} symbols</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Benchmark */}
                <div className="bg-arena-surface border border-arena-border rounded-xl overflow-hidden">
                  <div className="px-5 py-3 border-b border-arena-border">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-arena-muted">Benchmark</span>
                  </div>
                  <div className="p-5 space-y-3">
                    {[
                      { label: 'Index', value: selected.benchmark?.index || 'NIFTY 100', className: 'text-arena-text font-medium' },
                      { label: 'Advancing', value: selected.benchmark?.advancing || 0, className: 'text-arena-success font-semibold' },
                      { label: 'Declining', value: selected.benchmark?.declining || 0, className: 'text-arena-danger font-semibold' },
                      { label: 'Unchanged', value: selected.benchmark?.unchanged || 0, className: 'text-arena-muted' },
                    ].map(({ label, value, className }) => (
                      <div key={label} className="flex items-center justify-between">
                        <span className="text-xs text-arena-muted">{label}</span>
                        <span className={`text-sm font-mono-data tabular-nums ${className}`}>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Movers */}
                <div className="bg-arena-surface border border-arena-border rounded-xl overflow-hidden">
                  <div className="px-5 py-3 border-b border-arena-border">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-arena-muted">Top Movers</span>
                  </div>
                  <div className="p-5 space-y-3">
                    <div>
                      <div className="flex items-center gap-1.5 text-[10px] text-arena-success font-semibold uppercase tracking-wider mb-2">
                        <TrendingUp size={12} />
                        Gainers
                      </div>
                      {gainers.slice(0, 3).map((g: any) => (
                        <div key={g.symbol} className="flex items-center justify-between py-1">
                          <span className="text-xs font-mono-data font-semibold text-arena-text">{g.symbol.replace('.NS', '')}</span>
                          <span className="text-xs font-mono-data font-bold text-arena-success tabular-nums">+{g.change_pct?.toFixed(2)}%</span>
                        </div>
                      ))}
                      {gainers.length === 0 && <p className="text-xs text-arena-muted">No data</p>}
                    </div>
                    <div className="border-t border-arena-border/50 pt-3">
                      <div className="flex items-center gap-1.5 text-[10px] text-arena-danger font-semibold uppercase tracking-wider mb-2">
                        <TrendingDown size={12} />
                        Losers
                      </div>
                      {losers.slice(0, 3).map((l: any) => (
                        <div key={l.symbol} className="flex items-center justify-between py-1">
                          <span className="text-xs font-mono-data font-semibold text-arena-text">{l.symbol.replace('.NS', '')}</span>
                          <span className="text-xs font-mono-data font-bold text-arena-danger tabular-nums">{l.change_pct?.toFixed(2)}%</span>
                        </div>
                      ))}
                      {losers.length === 0 && <p className="text-xs text-arena-muted">No data</p>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Sector summary */}
              {sectors.length > 0 && (
                <div className="bg-arena-surface border border-arena-border rounded-xl overflow-hidden">
                  <div className="px-5 py-3 border-b border-arena-border">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-arena-muted">Sector Summary</span>
                  </div>
                  <div className="p-5">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {sectors.map(([sector, data]) => {
                        const chg = data.avg_change ?? 0
                        const pos = chg >= 0
                        return (
                          <div
                            key={sector}
                            className="rounded-lg p-3 border transition-colors"
                            style={{
                              backgroundColor: pos ? '#052E1618' : '#2D080818',
                              borderColor: pos ? '#22C55E20' : '#EF444420',
                            }}
                          >
                            <div className="text-[10px] text-arena-muted font-medium truncate mb-1">{sector}</div>
                            <div className={`text-base font-mono-data font-bold tabular-nums ${pos ? 'text-arena-success' : 'text-arena-danger'}`}>
                              {pos ? '+' : ''}{chg.toFixed(2)}%
                            </div>
                            <div className="text-[9px] text-arena-muted mt-0.5">{data.stock_count} stocks</div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Quotes table */}
              <div className="bg-arena-surface border border-arena-border rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-arena-border flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-arena-muted">Recent Quotes</span>
                  <span className="text-[10px] text-arena-muted font-mono-data">top 20 by volume</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-arena-border">
                        {['Symbol', 'LTP', 'Change %', 'Volume'].map((h, i) => (
                          <th key={h} className={`px-4 py-2.5 text-[10px] font-semibold text-arena-muted uppercase tracking-widest ${i === 0 ? 'text-left' : 'text-right'}`}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(selected.quotes || {})
                        .sort(([, a]: any, [, b]: any) => (b.volume || 0) - (a.volume || 0))
                        .slice(0, 20)
                        .map(([sym, q]: [string, any]) => (
                          <tr key={sym} className="border-b border-arena-border/30 hover:bg-arena-surface-2 transition-colors">
                            <td className="px-4 py-2 text-xs font-mono-data font-semibold text-arena-text">{sym.replace('.NS', '')}</td>
                            <td className="px-4 py-2 text-xs text-right font-mono-data tabular-nums text-arena-text">
                              {q.ltp?.toFixed(2) || '--'}
                            </td>
                            <td className={`px-4 py-2 text-xs text-right font-mono-data font-bold tabular-nums ${(q.change_pct ?? 0) >= 0 ? 'text-arena-success' : 'text-arena-danger'}`}>
                              {q.change_pct != null ? `${q.change_pct >= 0 ? '+' : ''}${q.change_pct.toFixed(2)}%` : '--'}
                            </td>
                            <td className="px-4 py-2 text-xs text-right font-mono-data tabular-nums text-arena-muted">
                              {q.volume ? compact(q.volume) : '--'}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-arena-surface border border-arena-border rounded-xl">
              <div className="p-12 flex items-center justify-center">
                <div className="text-center">
                  <BarChart3 size={28} className="mx-auto text-arena-muted mb-3" />
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
