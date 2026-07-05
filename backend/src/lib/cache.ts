interface CacheEntry {
  data: unknown;
  expiresAt: number;
}

const store = new Map<string, CacheEntry>();
const CLEANUP_INTERVAL = 30_000;

let cleanupTimer: ReturnType<typeof setInterval> | null = null;
if (typeof setInterval !== 'undefined') {
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (entry.expiresAt <= now) store.delete(key);
    }
  }, CLEANUP_INTERVAL);
}

export function getCached<T>(key: string): T | undefined {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt <= Date.now()) {
    store.delete(key);
    return undefined;
  }
  return entry.data as T;
}

export function setCache(key: string, data: unknown, ttlMs: number): void {
  store.set(key, { data, expiresAt: Date.now() + ttlMs });
}

export function clearCache(pattern?: string): void {
  if (!pattern) { store.clear(); return; }
  for (const key of store.keys()) {
    if (key.includes(pattern)) store.delete(key);
  }
}

export function cacheMiddleware(ttlMs: number) {
  return (req: any, res: any, next: any) => {
    if (req.method !== 'GET') return next();

    const key = `${req.path}:${JSON.stringify(req.query)}`;
    const cached = getCached<unknown>(key);
    if (cached) {
      res.json(cached);
      return;
    }

    const originalJson = res.json.bind(res);
    res.json = (body: unknown) => {
      setCache(key, body, ttlMs);
      return originalJson(body);
    };
    next();
  };
}

export function stopCacheCleanup(): void {
  if (cleanupTimer) clearInterval(cleanupTimer);
}
