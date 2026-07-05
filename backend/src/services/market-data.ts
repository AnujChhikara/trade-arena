import yahooFinance from 'yahoo-finance2';

import redis from '../config/redis.js';
import { config } from '../config/index.js';
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

const yf = yahooFinance;

export async function fetchAllQuotes(): Promise<QuoteData[]> {
  const results: QuoteData[] = [];

  for (let i = 0; i < NIFTY_100_SYMBOLS.length; i += config.yahooFinance.batchSize) {
    const batch = NIFTY_100_SYMBOLS.slice(i, i + config.yahooFinance.batchSize);
    const cached = await redis.mget(batch.map(s => `quote:${s}`));
    const toFetch: string[] = [];

    batch.forEach((sym, idx) => {
      if (cached[idx]) {
        results.push(JSON.parse(cached[idx]!));
      } else {
        toFetch.push(sym);
      }
    });

    if (toFetch.length > 0) {
      try {
        const quotes = await yf.quote(toFetch);
        const mapped = quotes.map((q, idx) => {
          const data = mapQuoteResponse(toFetch[idx], q);
          redis.setex(`quote:${toFetch[idx]}`, config.yahooFinance.quoteTtl, JSON.stringify(data));
          return data;
        });
        results.push(...mapped);
      } catch (err) {
        console.error('[MarketData] Batch fetch error:', (err as Error).message);
      }
    }
  }

  return results;
}

type Quote = Awaited<ReturnType<typeof yf.quote>>[number];

function mapQuoteResponse(symbol: string, quote: Quote): QuoteData {
  const ltp = quote.regularMarketPrice ?? null;
  const prevClose = quote.regularMarketPreviousClose ?? null;
  const change = ltp != null && prevClose != null ? ltp - prevClose : null;
  const changePct = change != null && prevClose != null && prevClose !== 0
    ? (change / prevClose) * 100
    : null;

  return {
    symbol: nseSymbol(symbol),
    yahoo_symbol: symbol,
    name: NIFTY_100_NAMES[symbol] || quote.shortName || quote.longName || symbol,
    ltp,
    prev_close: prevClose,
    change,
    change_pct: changePct ? Math.round(changePct * 100) / 100 : null,
    volume: quote.regularMarketVolume || 0,
    open: quote.regularMarketOpen ?? null,
    high: quote.regularMarketDayHigh ?? null,
    low: quote.regularMarketDayLow ?? null,
    is_market_open: quote.marketState === 'REGULAR',
    fetched_at: new Date().toISOString(),
  };
}
