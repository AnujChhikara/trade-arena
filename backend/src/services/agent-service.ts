import { z } from 'zod';
import { db } from '../db/index.js';
import { agents } from '../db/schema/agents.js';
import { agentDecisions } from '../db/schema/decisions.js';
import { config } from '../config/index.js';

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
  const prompt = buildPrompt(agent, snapshot, limits);
  console.log(`[Agent] Calling ${agent.name} (${agent.model})...`);
  const start = Date.now();

  if (!config.openRouter.apiKey) {
    console.warn('[Agent] No OpenRouter key. Using mock.');
    await new Promise(r => setTimeout(r, 500));
    return mockResult(snapshot);
  }

  try {
    const response = await fetch(`${config.openRouter.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.openRouter.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://trade-arena.app',
        'X-Title': 'AI Trading League',
      },
      body: JSON.stringify({
        model: agent.model,
        messages: [
          { role: 'system' as const, content: prompt.system },
          { role: 'user' as const, content: prompt.user },
        ],
        max_tokens: 500,
        temperature: 0.7,
        response_format: { type: 'json_object' },
      }),
      signal: AbortSignal.timeout(30000),
    });

    const rt = Date.now() - start;
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`OpenRouter ${response.status}: ${body.slice(0, 200)}`);
    }

    const data = await response.json() as any;
    const rawOutput: string = data.choices?.[0]?.message?.content || '{}';
    const usage = data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

    const parsed = AgentDecisionSchema.safeParse(JSON.parse(rawOutput));
    if (!parsed.success) {
      return { status: 'parse_error', raw_output: rawOutput, parsed_decision: null, response_time_ms: rt, token_usage: usage, cost: estimateCost(usage, agent.model) };
    }

    const valid = validateDecision(parsed.data, limits, agent._positions || []);
    if (!valid.valid) {
      return { status: 'rejected', raw_output: rawOutput, parsed_decision: parsed.data, rejection_reason: valid.reason, response_time_ms: rt, token_usage: usage, cost: estimateCost(usage, agent.model) };
    }

    return { status: 'success', raw_output: rawOutput, parsed_decision: parsed.data, response_time_ms: rt, token_usage: usage, cost: estimateCost(usage, agent.model) };
  } catch (err) {
    const rt = Date.now() - start;
    const isTimeout = (err as Error).name === 'TimeoutError';
    console.error(`[Agent] ${agent.name} error:`, (err as Error).message);
    return { status: isTimeout ? 'timeout' : 'parse_error', raw_output: null, parsed_decision: null, response_time_ms: rt, token_usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }, cost: 0 };
  }
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

function buildPrompt(agent: Agent, snapshot: any, limits: { calls_remaining: number; trades_remaining: number }) {
  const positions = agent._positions || [];
  const totalValue = parseFloat(agent.capital || '1000000');
  const holdings = positions.length === 0 ? 'No open positions.' : positions.map(p =>
    `${p.symbol} | Qty: ${p.quantity} | Entry: ₹${p.entry_price} | LTP: ₹${snapshot.quotes[p.symbol]?.ltp || 'N/A'} | Unrealized P&L: ₹${((snapshot.quotes[p.symbol]?.ltp || 0) - parseFloat(p.entry_price)) * p.quantity}`
  ).join('\n');

  const invested = positions.reduce((s, p) => s + p.quantity * parseFloat(p.entry_price), 0);
  const cashAvailable = totalValue - invested;

  return {
    system: `You are ${agent.name}, an AI portfolio manager in a paper-trading league.
Your persona: ${agent.persona || 'Balanced trader'}.
You manage ₹10,00,000 capital.

LEAGUE RULES (strictly enforced):
- Long-only. No shorting, no leverage, no derivatives.
- You CANNOT sell a stock you do not hold in your positions.
- Each BUY or SELL order must include symbol, amount (₹), and type (INTRADAY or DELIVERY).
- INTRADAY positions auto-close at 3:15 PM same day.
- DELIVERY positions force-liquidated Friday 3:30 PM.
- Max ${config.league.maxSingleStockExposure}% of capital in any single stock.
- Max ${config.league.maxSectorExposure}% in any sector.
- ${config.league.slippagePct}% slippage applied on every fill.
- Circuit-locked stocks get zero fill (cannot buy upper circuit, cannot sell lower circuit).
- 60-min cooldown after a stop-loss hit.
- No new positions after 3:10 PM.
- ${limits.calls_remaining} API calls remaining today / ${limits.trades_remaining} trades remaining today.

YOUR CURRENT PORTFOLIO:
${holdings}

Cash available: ₹${Math.round(cashAvailable).toLocaleString()}
Portfolio value: ₹${Math.round(totalValue).toLocaleString()}

Respond with JSON only:
{
  "decision": "BUY | SELL | HOLD",
  "orders": [{ "symbol": "RELIANCE", "amount": 50000, "type": "INTRADAY" }],
  "next_check": "14:30",
  "hypothesis": "Brief reasoning for your decision",
  "exit_strategy": { "stop_loss": "-2%", "target": "+5%", "time": "15:00" }
}`,
    user: `Current time: ${snapshot.captured_at}
Market benchmark: ${snapshot.benchmark?.change_pct ?? 'N/A'}%
Gainers: ${snapshot.movers?.top_gainers?.map((s: any) => `${s.symbol} +${s.change_pct}%`).join(', ') || ''}
Losers: ${snapshot.movers?.top_losers?.map((s: any) => `${s.symbol} ${s.change_pct}%`).join(', ') || ''}
Sector trends: ${Object.entries(snapshot.sector_summary || {}).map(([s, d]: any) => `${s} ${d.avg_change > 0 ? '+' : ''}${d.avg_change}%`).join(', ')}`,
  };
}

function validateDecision(decision: AgentDecision, limits: { trades_remaining: number }, positions: AgentPosition[]) {
  if (decision.decision !== 'HOLD' && (!decision.orders || decision.orders.length === 0)) {
    return { valid: false, reason: 'Non-HOLD must include orders' };
  }
  if (decision.orders && decision.orders.length > limits.trades_remaining) {
    return { valid: false, reason: `Orders (${decision.orders.length}) exceed remaining trades (${limits.trades_remaining})` };
  }
  if (decision.orders) {
    for (const order of decision.orders) {
      if (decision.decision === 'SELL') {
        const held = positions.some(p => p.symbol === order.symbol && p.quantity > 0);
        if (!held) {
          return { valid: false, reason: `Cannot SELL ${order.symbol} - no open position held` };
        }
      }
    }
  }
  return { valid: true, reason: undefined };
}

function estimateCost(usage: { prompt_tokens: number; completion_tokens: number }, model: string): number {
  const rates: Record<string, { input: number; output: number }> = {
    'openai/gpt-4o-mini': { input: 0.15 / 1e6, output: 0.60 / 1e6 },
    'openai/gpt-4o': { input: 2.50 / 1e6, output: 10.00 / 1e6 },
  };
  const r = rates[model] || rates['openai/gpt-4o-mini'];
  return (usage.prompt_tokens * r.input) + (usage.completion_tokens * r.output);
}

function mockResult(snapshot: any): AgentResult {
  const symbols = Object.keys(snapshot.quotes || {}).slice(0, 20);
  if (Math.random() < 0.6 || symbols.length === 0) {
    return { status: 'success', raw_output: '{"decision":"HOLD","orders":[],"next_check":"14:30","hypothesis":"No signal"}', parsed_decision: { decision: 'HOLD' }, response_time_ms: 500, token_usage: { prompt_tokens: 800, completion_tokens: 100, total_tokens: 900 }, cost: 0.0005 };
  }
  const pick = symbols[Math.floor(Math.random() * symbols.length)];
  return { status: 'success', raw_output: JSON.stringify({ decision: 'BUY', orders: [{ symbol: pick, amount: 50000, type: 'INTRADAY' }], next_check: '14:30', hypothesis: 'Momentum', exit_strategy: { stop_loss: '-3%', target: '+5%', time: '15:00' } }), parsed_decision: { decision: 'BUY', orders: [{ symbol: pick, amount: 50000, type: 'INTRADAY' }], exit_strategy: { stop_loss: '-3%', target: '+5%', time: '15:00' } }, response_time_ms: 800, token_usage: { prompt_tokens: 800, completion_tokens: 120, total_tokens: 920 }, cost: 0.0005 };
}
