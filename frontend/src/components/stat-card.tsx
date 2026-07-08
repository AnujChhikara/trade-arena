import type { LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'
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
    <Card className="gap-0 p-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        {Icon && <Icon className="size-4 text-muted-foreground/70" />}
      </div>
      <p className={cn('mt-2 truncate font-display text-xl font-bold tabular-nums md:text-2xl', valueClassName)}>{value}</p>
      {hint && <p className="mt-0.5 font-mono-data text-[11px] text-muted-foreground">{hint}</p>}
    </Card>
  )
}
