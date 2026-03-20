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

// Global cache instance for epics data
export const epicsCache = new MemoryCache<any>(
  parseInt(process.env.JIRA_CACHE_TTL || '300', 10)
);
