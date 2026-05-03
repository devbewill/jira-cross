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
// fresh MemoryCache instance per route. Anchoring on globalThis ensures every
// module always gets the same object, surviving hot reloads.

const g = globalThis as typeof globalThis & {
  __epicsCache?: MemoryCache<any>;
  __releasesCache?: MemoryCache<any>;
  __releaseIssuesCache?: MemoryCache<any>;
  __storiesCache?: MemoryCache<any>;
  __versionIssuesCache?: MemoryCache<any>;
  __pspCache?: MemoryCache<any>;
  __sprintCache?: MemoryCache<any>;
  __timesheetCache?: MemoryCache<any>;
  __groupCache?: MemoryCache<any>;
};

const TTL = parseInt(process.env.JIRA_CACHE_TTL || '300', 10);
const SHORT_TTL = 60; // 60s for detail panels (stories, version-issues)

if (!g.__epicsCache)         g.__epicsCache         = new MemoryCache<any>(TTL);
if (!g.__releasesCache)      g.__releasesCache      = new MemoryCache<any>(TTL);
if (!g.__releaseIssuesCache) g.__releaseIssuesCache = new MemoryCache<any>(TTL);
if (!g.__storiesCache)       g.__storiesCache       = new MemoryCache<any>(SHORT_TTL);
if (!g.__versionIssuesCache) g.__versionIssuesCache = new MemoryCache<any>(SHORT_TTL);
if (!g.__pspCache)           g.__pspCache           = new MemoryCache<any>(TTL);
if (!g.__sprintCache)        g.__sprintCache        = new MemoryCache<any>(TTL);
if (!g.__timesheetCache)     g.__timesheetCache     = new MemoryCache<any>(TTL);
if (!g.__groupCache)         g.__groupCache         = new MemoryCache<any>(TTL);

export const epicsCache         = g.__epicsCache;
export const releasesCache      = g.__releasesCache;
export const releaseIssuesCache = g.__releaseIssuesCache;
export const storiesCache       = g.__storiesCache;
export const versionIssuesCache = g.__versionIssuesCache;
export const pspCache           = g.__pspCache;
export const sprintCache        = g.__sprintCache;
export const timesheetCache     = g.__timesheetCache;
export const groupCache         = g.__groupCache;
