import crypto from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { marketSnapshots } from '../db/schema/market.js';
import redis from '../config/redis.js';
import { NIFTY_100_SYMBOLS, nseSymbol } from '../config/nifty100.js';
import { fetchAllQuotes, type QuoteData } from './market-data.js';

const SECTOR_MAP: Record<string, string> = {
  RELIANCE: 'Energy', HDFCBANK: 'Financial Services', ICICIBANK: 'Financial Services',
  SBIN: 'Financial Services', KOTAKBANK: 'Financial Services', AXISBANK: 'Financial Services',
  BAJFINANCE: 'Financial Services', BAJAJFINSV: 'Financial Services', SHRIRAMFIN: 'Financial Services',
  CHOLAFIN: 'Financial Services', MUTHOOTFIN: 'Financial Services', PNB: 'Financial Services',
  BANKBARODA: 'Financial Services', CANBK: 'Financial Services', UNIONBANK: 'Financial Services',
  HDFCLIFE: 'Financial Services', SBILIFE: 'Financial Services', HDFCAMC: 'Financial Services',
  BAJAJHLDNG: 'Financial Services', PFC: 'Financial Services', RECLTD: 'Financial Services',
  IRFC: 'Financial Services', JIOFIN: 'Financial Services', TATACAP: 'Financial Services',
  TCS: 'Information Technology', INFY: 'Information Technology', HCLTECH: 'Information Technology',
  WIPRO: 'Information Technology', TECHM: 'Information Technology', LTM: 'Information Technology',
  ETERNAL: 'Information Technology',
  BHARTIARTL: 'Telecom',
  LT: 'Construction', ULTRACEMCO: 'Construction', GRASIM: 'Construction',
  AMBUJACEM: 'Construction', SHREECEM: 'Construction', LODHA: 'Construction', DLF: 'Construction',
  MARUTI: 'Automobile', 'M&M': 'Automobile', EICHERMOT: 'Automobile', TVSMOTOR: 'Automobile',
  'BAJAJ-AUTO': 'Automobile', TMPV: 'Automobile', MOTHERSON: 'Automobile', HYUNDAI: 'Automobile',
  SUNPHARMA: 'Pharmaceuticals', DIVISLAB: 'Pharmaceuticals', TORNTPHARM: 'Pharmaceuticals',
  CIPLA: 'Pharmaceuticals', DRREDDY: 'Pharmaceuticals', ZYDUSLIFE: 'Pharmaceuticals',
  APOLLOHOSP: 'Healthcare', MAXHEALTH: 'Healthcare',
  ITC: 'FMCG', HINDUNILVR: 'FMCG', BRITANNIA: 'FMCG', TATACONSUM: 'FMCG',
  GODREJCP: 'FMCG', VBL: 'FMCG', UNITDSPR: 'FMCG',
  TITAN: 'Consumer Durables', TRENT: 'Consumer Durables', DMART: 'Consumer Durables',
  PIDILITIND: 'Consumer Durables',
  ADANIPORTS: 'Infrastructure', BEL: 'Infrastructure', HAL: 'Infrastructure',
  SIEMENS: 'Infrastructure', ABB: 'Infrastructure', CGPOWER: 'Infrastructure',
  CUMMINSIND: 'Infrastructure', BOSCHLTD: 'Infrastructure',
  TATAPOWER: 'Power', NTPC: 'Power', POWERGRID: 'Power', ADANIPOWER: 'Power',
  ADANIGREEN: 'Power', ADANIENSOL: 'Power',
  COALINDIA: 'Energy', ONGC: 'Energy', IOC: 'Energy', BPCL: 'Energy', GAIL: 'Energy',
  ADANIENT: 'Commodities',
  TATASTEEL: 'Metals & Mining', JSWSTEEL: 'Metals & Mining', HINDALCO: 'Metals & Mining',
  HINDZINC: 'Metals & Mining', VEDL: 'Metals & Mining', JINDALSTEL: 'Metals & Mining',
  INDIGO: 'Aviation', MAZDOCK: 'Defence', SOLARINDS: 'Chemicals', INDHOTEL: 'Hospitality',
};

export interface SnapshotData {
  id: string;
  captured_at: Date;
  universe: string[];
  benchmark: SnapshotBenchmark;
  quotes: Record<string, QuoteData>;
  movers: SnapshotMovers;
  sector_summary: SnapshotSectorSummary;
  news_bundle: null;
  snapshot_hash: string;
}

interface SnapshotBenchmark {
  index: string;
  price: number | null;
  change_pct: number | null;
  advancing: number;
  declining: number;
  unchanged: number;
}

interface SnapshotMovers {
  top_gainers: { symbol: string; name: string; ltp: number | null; change_pct: number | null }[];
  top_losers: { symbol: string; name: string; ltp: number | null; change_pct: number | null }[];
  most_active: { symbol: string; name: string; ltp: number | null; volume: number }[];
}

interface SnapshotSectorSummary {
  [sector: string]: { stock_count: number; avg_change: number | null };
}

export async function buildSnapshot(): Promise<SnapshotData> {
  console.log('[Snapshot] Building...');
  const start = Date.now();

  const quotes = await fetchAllQuotes();
  const valid = quotes.filter(q => q.change_pct != null);

  const avgChange = valid.length > 0
    ? valid.reduce((s, q) => s + (q.change_pct as number), 0) / valid.length
    : null;
  const avgPrice = valid.length > 0
    ? valid.reduce((s, q) => s + (q.ltp || 0), 0) / valid.length
    : null;

  const sorted = [...valid].sort((a, b) => (b.change_pct as number) - (a.change_pct as number));

  const sectorMap: Record<string, { stocks: string[]; totalChange: number; count: number }> = {};
  quotes.forEach(q => {
    const sector = SECTOR_MAP[q.symbol];
    if (!sector) return;
    if (!sectorMap[sector]) sectorMap[sector] = { stocks: [], totalChange: 0, count: 0 };
    sectorMap[sector].stocks.push(q.symbol);
    if (q.change_pct != null) {
      sectorMap[sector].totalChange += q.change_pct;
      sectorMap[sector].count += 1;
    }
  });

  const sectorSummary: SnapshotSectorSummary = {};
  for (const [sector, data] of Object.entries(sectorMap)) {
    sectorSummary[sector] = {
      stock_count: data.stocks.length,
      avg_change: data.count > 0 ? Math.round((data.totalChange / data.count) * 100) / 100 : null,
    };
  }

  const snapshotPayload = {
    captured_at: new Date(),
    universe: NIFTY_100_SYMBOLS.map(nseSymbol),
    benchmark: {
      index: 'NIFTY 100',
      price: avgPrice ? Math.round(avgPrice * 100) / 100 : null,
      change_pct: avgChange ? Math.round(avgChange * 100) / 100 : null,
      advancing: valid.filter(q => (q.change_pct as number) > 0).length,
      declining: valid.filter(q => (q.change_pct as number) < 0).length,
      unchanged: valid.filter(q => (q.change_pct as number) === 0).length,
    },
    quotes: Object.fromEntries(quotes.map(q => [q.symbol, q])),
    movers: {
      top_gainers: sorted.slice(0, 5).map(q => ({ symbol: q.symbol, name: q.name, ltp: q.ltp, change_pct: q.change_pct })),
      top_losers: sorted.slice(-5).reverse().map(q => ({ symbol: q.symbol, name: q.name, ltp: q.ltp, change_pct: q.change_pct })),
      most_active: [...valid].sort((a, b) => b.volume - a.volume).slice(0, 5).map(q => ({ symbol: q.symbol, name: q.name, ltp: q.ltp, volume: q.volume })),
    },
    sector_summary: sectorSummary,
    news_bundle: null,
  };

  const snapshotHash = crypto.createHash('sha256').update(JSON.stringify(snapshotPayload)).digest('hex');

  const [inserted] = await db.insert(marketSnapshots).values({
    capturedAt: snapshotPayload.captured_at,
    universe: snapshotPayload.universe,
    benchmark: JSON.stringify(snapshotPayload.benchmark),
    quotes: JSON.stringify(snapshotPayload.quotes),
    movers: JSON.stringify(snapshotPayload.movers),
    sectorSummary: JSON.stringify(snapshotPayload.sector_summary),
    snapshotHash,
  }).returning();

  await redis.set('snapshot:latest', inserted.id);
  await redis.setex(`snapshot:${inserted.id}`, 86400, JSON.stringify(snapshotPayload));

  const elapsed = Date.now() - start;
  console.log(`[Snapshot] Done in ${elapsed}ms. ID: ${inserted.id}`);

  return { id: inserted.id, ...snapshotPayload } as SnapshotData;
}

export async function getLatestSnapshot() {
  const id = await redis.get('snapshot:latest');
  if (id) {
    const cached = await redis.get(`snapshot:${id}`);
    if (cached) return { id, ...JSON.parse(cached) };
  }

  const [row] = await db.select().from(marketSnapshots).orderBy(marketSnapshots.capturedAt).limit(1);
  if (!row) return null;
  return formatRow(row);
}

export async function getSnapshotById(id: string) {
  const cached = await redis.get(`snapshot:${id}`);
  if (cached) return { id, ...JSON.parse(cached) };

  const [row] = await db.select().from(marketSnapshots).where(eq(marketSnapshots.id, id));
  if (!row) return null;
  return formatRow(row);
}

function formatRow(row: typeof marketSnapshots.$inferSelect) {
  return {
    id: row.id,
    captured_at: row.capturedAt,
    universe: row.universe,
    benchmark: row.benchmark,
    quotes: row.quotes,
    movers: row.movers,
    sector_summary: row.sectorSummary,
    snapshot_hash: row.snapshotHash,
  };
}
