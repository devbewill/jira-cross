interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class MemoryCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private readonly ttlSeconds: number;

  constructor(ttlSeconds: number = 300) {
    this.ttlSeconds = ttlSeconds;
  }

  set(key: string, value: T): void {
    const expiresAt = Date.now() + this.ttlSeconds * 1000;
    this.cache.set(key, { value, expiresAt });
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

// ─── Singleton instances via globalThis ───────────────────────────────────────
// Next.js dev mode hot-reloads individual route modules, which would create a
// fresh MemoryCache instance per route — meaning refresh/route.ts would clear a
// different object than epics/route.ts reads from.
// Anchoring the instances on globalThis ensures every module always gets the
// exact same object, surviving hot reloads.

const g = globalThis as typeof globalThis & {
  __epicsCache?: MemoryCache<any>;
  __releasesCache?: MemoryCache<any>;
};

const TTL = parseInt(process.env.JIRA_CACHE_TTL || '300', 10);

if (!g.__epicsCache)    g.__epicsCache    = new MemoryCache<any>(TTL);
if (!g.__releasesCache) g.__releasesCache = new MemoryCache<any>(TTL);

export const epicsCache    = g.__epicsCache;
export const releasesCache = g.__releasesCache;
