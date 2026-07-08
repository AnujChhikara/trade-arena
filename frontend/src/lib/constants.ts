// Agent identity colors — align with --chart-1..5 hues
export const AGENT_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
]

export function agentColor(i: number) {
  return AGENT_COLORS[i % AGENT_COLORS.length]
}
