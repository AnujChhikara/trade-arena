import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider font-mono-data whitespace-nowrap',
  {
    variants: {
      variant: {
        default: 'bg-secondary text-muted-foreground',
        primary: 'bg-primary/12 text-primary',
        up: 'bg-up-soft text-up',
        down: 'bg-down-soft text-down',
        warning: 'bg-warning-soft text-warning',
        outline: 'border border-border text-muted-foreground',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

function Badge({
  className, variant, ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
