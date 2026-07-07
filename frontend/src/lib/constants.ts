// Agent identity colors — mirror --agent-* tokens in index.css
export const AGENT_COLORS = ['#38BDF8', '#A78BFA', '#34D399', '#FB923C', '#FB7185', '#FBBF24']

export function agentColor(i: number) {
  return AGENT_COLORS[i % AGENT_COLORS.length]
}
