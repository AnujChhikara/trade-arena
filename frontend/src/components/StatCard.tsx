import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string | number
  icon?: LucideIcon
  trend?: { value: number; positive: boolean }
  accent?: string
  className?: string
}

export default function StatCard({ label, value, icon: Icon, trend, accent, className = '' }: StatCardProps) {
  return (
    <div className={`bg-arena-surface border border-arena-border rounded-2xl p-6 hover:border-arena-border-bright transition-colors ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-medium text-arena-muted uppercase tracking-widest mb-2">{label}</div>
          <div className="text-2xl font-display font-bold text-arena-text tabular-nums truncate" style={accent ? { color: accent } : undefined}>
            {value}
          </div>
          {trend && (
            <div className={`flex items-center gap-1 mt-1.5 text-xs font-medium ${trend.positive ? 'text-arena-success' : 'text-arena-danger'}`}>
              <span>{trend.positive ? '▲' : '▼'}</span>
              <span className="font-mono-data">{Math.abs(trend.value).toFixed(2)}%</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className="w-9 h-9 rounded-lg bg-arena-primary-light flex items-center justify-center shrink-0 ml-3">
            <Icon size={17} className="text-arena-primary" />
          </div>
        )}
      </div>
    </div>
  )
}
