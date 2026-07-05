import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string | number
  icon?: LucideIcon
  trend?: { value: number; positive: boolean }
  className?: string
}

export default function StatCard({ label, value, icon: Icon, trend, className = '' }: StatCardProps) {
  return (
    <div className={`bg-white rounded-xl border border-[var(--color-arena-border)] shadow-sm p-5 ${className}`}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-medium text-[var(--color-arena-muted)] uppercase tracking-wider mb-1">{label}</div>
          <div className="text-2xl font-bold tracking-tight">{value}</div>
          {trend && (
            <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${trend.positive ? 'text-arena-success' : 'text-arena-danger'}`}>
              <span>{trend.positive ? '↑' : '↓'}</span>
              <span>{Math.abs(trend.value).toFixed(2)}%</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className="w-10 h-10 rounded-lg bg-arena-primary-light flex items-center justify-center shrink-0">
            <Icon size={20} className="text-arena-primary" />
          </div>
        )}
      </div>
    </div>
  )
}
