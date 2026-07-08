import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { DailySnapshot } from '@/lib/api'
import { compact } from '@/lib/format'
import {
  ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart'

export function PortfolioChart({ daily }: { daily: DailySnapshot[] }) {
  const agentNames = [...new Set(daily.flatMap((d) => d.entries.map((e) => e.agentName)))]

  const config: ChartConfig = Object.fromEntries(
    agentNames.map((name, i) => [name, { label: name, color: `var(--chart-${(i % 5) + 1})` }]),
  )

  const data = daily.map((d) => {
    const row: Record<string, number | string | null> = { date: d.date.slice(5) }
    for (const name of agentNames) row[name] = null
    for (const e of d.entries) row[e.agentName] = parseFloat(e.capital)
    return row
  })

  const sparse = data.length <= 2

  return (
    <ChartContainer config={config} className="h-[240px] w-full">
      <AreaChart data={data} margin={{ left: 4, right: 12, top: 8 }}>
        <defs>
          {agentNames.map((name) => (
            <linearGradient key={name} id={`fill-${name}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={`var(--color-${name})`} stopOpacity={0.25} />
              <stop offset="95%" stopColor={`var(--color-${name})`} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} padding={{ left: 16, right: 16 }} />
        <YAxis tickLine={false} axisLine={false} width={52} tickFormatter={(v) => compact(v)} domain={['dataMin - 5000', 'dataMax + 5000']} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        {agentNames.map((name) => (
          <Area
            key={name}
            dataKey={name}
            type="monotone"
            fill={`url(#fill-${name})`}
            stroke={`var(--color-${name})`}
            strokeWidth={2}
            connectNulls
            dot={sparse ? { r: 3 } : false}
          />
        ))}
      </AreaChart>
    </ChartContainer>
  )
}
