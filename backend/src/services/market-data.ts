import { NIFTY_100_SYMBOLS, NIFTY_100_NAMES, nseSymbol } from '../config/nifty100.js';

export interface QuoteData {
  symbol: string;
  yahoo_symbol: string;
  name: string;
  ltp: number | null;
  prev_close: number | null;
  change: number | null;
  change_pct: number | null;
  volume: number;
  open: number | null;
  high: number | null;
  low: number | null;
  is_market_open: boolean;
  fetched_at: string;
}

const BASE_PRICES: Record<string, number> = {};
function getBasePrice(sym: string): number {
  if (!BASE_PRICES[sym]) {
    const hash = sym.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    BASE_PRICES[sym] = 100 + (hash % 9900);
  }
  return BASE_PRICES[sym];
}

export async function fetchAllQuotes(): Promise<QuoteData[]> {
  const now = new Date();
  const day = now.getDay();
  const time = now.getHours() * 100 + now.getMinutes();
  const isOpen = day >= 1 && day <= 5 && time >= 915 && time <= 1530;

  return NIFTY_100_SYMBOLS.map((sym) => {
    const base = getBasePrice(sym);
    const drift = isOpen ? (Math.random() - 0.48) * 2 : 0;
    const ltp = Math.round((base + drift) * 100) / 100;
    const prevClose = base;
    const change = ltp - prevClose;
    const changePct = Math.round((change / prevClose) * 10000) / 100;

    return {
      symbol: nseSymbol(sym),
      yahoo_symbol: sym,
      name: NIFTY_100_NAMES[sym] || sym,
      ltp,
      prev_close: prevClose,
      change: Math.round(change * 100) / 100,
      change_pct: changePct,
      volume: Math.floor(Math.random() * 10_000_000) + 100_000,
      open: ltp - Math.random() * 5,
      high: ltp + Math.random() * 10,
      low: ltp - Math.random() * 10,
      is_market_open: isOpen,
      fetched_at: now.toISOString(),
    };
  });
}
