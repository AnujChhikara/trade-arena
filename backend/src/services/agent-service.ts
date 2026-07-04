import { z } from 'zod';
import { db } from '../db/index.js';
import { agents } from '../db/schema/agents.js';
import { agentDecisions } from '../db/schema/decisions.js';

const AgentDecisionSchema = z.object({
  decision: z.enum(['BUY', 'SELL', 'HOLD']),
  orders: z.array(z.object({
    symbol: z.string().min(1).max(20),
    amount: z.number().min(1000).max(1000000).optional(),
    type: z.enum(['INTRADAY', 'DELIVERY']),
    all: z.boolean().optional(),
  })).optional(),
  next_check: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  hypothesis: z.string().max(200).optional(),
  risk_flags: z.array(z.string()).optional(),
  exit_strategy: z.object({
    stop_loss: z.string().optional(),
    target: z.string().optional(),
    time: z.string().optional(),
  }).optional(),
});

export type AgentDecision = z.infer<typeof AgentDecisionSchema>;

export interface Agent {
  id: string;
  name: string;
  model: string;
  system_prompt: string;
  persona: string | null;
  capital: string;
  is_active: boolean;
  _positions?: AgentPosition[];
}

export interface AgentPosition {
  id: string;
  symbol: string;
  quantity: number;
  entry_price: string;
  current_price: string | null;
  strategy_type: string;
}

export interface AgentResult {
  status: 'success' | 'timeout' | 'parse_error' | 'rejected';
  raw_output: string | null;
  parsed_decision: AgentDecision | null;
  rejection_reason?: string;
  response_time_ms: number;
  token_usage: Record<string, number>;
  cost: number;
}

export async function callAgent(agent: Agent, snapshot: any, limits: { calls_remaining: number; trades_remaining: number; max_calls: number; max_trades: number }): Promise<AgentResult> {
  console.log(`[Agent] Calling ${agent.name} (mock)...`);
  await new Promise(r => setTimeout(r, 300 + Math.random() * 400));
  return mockResult(snapshot);
}

export async function storeDecision(agentId: string, snapshotId: string, model: string, result: AgentResult) {
  const [inserted] = await db.insert(agentDecisions).values({
    agentId,
    snapshotId,
    model,
    rawOutput: result.raw_output,
    parsedDecision: result.parsed_decision as any,
    tokenUsage: result.token_usage as any,
    cost: String(result.cost),
    responseTimeMs: result.response_time_ms,
    status: result.status,
  }).returning({ id: agentDecisions.id });
  return inserted.id;
}



function mockResult(snapshot: any): AgentResult {
  const symbols = Object.keys(snapshot.quotes || {}).slice(0, 20);
  if (Math.random() < 0.6 || symbols.length === 0) {
    return { status: 'success', raw_output: '{"decision":"HOLD","orders":[],"next_check":"14:30","hypothesis":"No signal"}', parsed_decision: { decision: 'HOLD' }, response_time_ms: 500, token_usage: { prompt_tokens: 800, completion_tokens: 100, total_tokens: 900 }, cost: 0.0005 };
  }
  const pick = symbols[Math.floor(Math.random() * symbols.length)];
  return { status: 'success', raw_output: JSON.stringify({ decision: 'BUY', orders: [{ symbol: pick, amount: 50000, type: 'INTRADAY' }], next_check: '14:30', hypothesis: 'Momentum', exit_strategy: { stop_loss: '-3%', target: '+5%', time: '15:00' } }), parsed_decision: { decision: 'BUY', orders: [{ symbol: pick, amount: 50000, type: 'INTRADAY' }], exit_strategy: { stop_loss: '-3%', target: '+5%', time: '15:00' } }, response_time_ms: 800, token_usage: { prompt_tokens: 800, completion_tokens: 120, total_tokens: 920 }, cost: 0.0005 };
}
