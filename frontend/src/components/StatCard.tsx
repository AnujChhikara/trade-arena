import type { LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: string | number
  icon?: LucideIcon
  trend?: { value: number; positive: boolean }
  accent?: string
  className?: string
}

export default function StatCard({ label, value, icon: Icon, trend, accent, className }: StatCardProps) {
  return (
    <Card className={cn('p-5 transition-colors hover:border-border/80', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{label}</div>
          <div
            className="mt-2.5 text-2xl font-display font-bold tabular-nums truncate"
            style={accent ? { color: accent } : undefined}
          >
            {value}
          </div>
          {trend && (
            <div className={cn('mt-1.5 flex items-center gap-1 text-xs font-mono-data', trend.positive ? 'text-up' : 'text-down')}>
              <span>{trend.positive ? '▲' : '▼'}</span>
              <span>{Math.abs(trend.value).toFixed(2)}%</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className="grid place-items-center size-9 shrink-0 rounded-lg bg-secondary text-muted-foreground">
            <Icon size={16} />
          </div>
        )}
      </div>
    </Card>
  )
}
