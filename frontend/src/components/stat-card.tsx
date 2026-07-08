import type { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: string | number
  icon?: LucideIcon
  hint?: string
  valueClassName?: string
}

export function StatCard({ label, value, icon: Icon, hint, valueClassName }: StatCardProps) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3 p-5">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className={cn('mt-2 truncate font-display text-2xl font-bold tabular-nums', valueClassName)}>{value}</p>
          {hint && <p className="mt-1 font-mono-data text-xs text-muted-foreground">{hint}</p>}
        </div>
        {Icon && (
          <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary text-muted-foreground">
            <Icon className="size-4" />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
