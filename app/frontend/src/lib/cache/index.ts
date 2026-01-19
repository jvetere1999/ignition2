/**
 * Caching Utilities & Strategies
 *
 * Provides caching abstractions, invalidation strategies, and storage backends
 * for managing application cache across different layers.
 */

/**
 * Cache entry metadata
 */
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  createdAt: number;
  hits: number;
}

/**
 * Cache configuration
 */
interface CacheConfig {
  ttlMs: number;
  maxSize?: number;
  onEvict?: (key: string, value: unknown) => void;
}

/**
 * In-memory cache implementation
 */
export class MemoryCache<T = unknown> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private config: Required<CacheConfig>;

  constructor(config: CacheConfig) {
    this.config = {
      ttlMs: config.ttlMs,
      maxSize: config.maxSize || 100,
      onEvict: config.onEvict || (() => {}),
    };
  }

  /**
   * Get value from cache
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.config.onEvict(key, entry.value);
      return null;
    }

    entry.hits++;
    return entry.value;
  }

  /**
   * Set value in cache
   */
  set(key: string, value: T): void {
    // Check size limit
    if (
      this.cache.size >= this.config.maxSize &&
      !this.cache.has(key)
    ) {
      this.evictLeastUsed();
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + this.config.ttlMs,
      createdAt: Date.now(),
      hits: 0,
    });
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete specific key
   */
  delete(key: string): boolean {
    const had = this.cache.has(key);
    if (had) {
      const entry = this.cache.get(key);
      this.cache.delete(key);
      if (entry) {
        this.config.onEvict(key, entry.value);
      }
    }
    return had;
  }

  /**
   * Clear all cache
   */
  clear(): void {
    for (const [key, entry] of this.cache) {
      this.config.onEvict(key, entry.value);
    }
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get all keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache stats
   */
  getStats() {
    let totalHits = 0;
    let totalEntries = 0;

    for (const entry of this.cache.values()) {
      totalHits += entry.hits;
      totalEntries++;
    }

    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      totalHits,
      averageHits: totalEntries > 0 ? totalHits / totalEntries : 0,
      utilization: (this.cache.size / this.config.maxSize) * 100,
    };
  }

  /**
   * Evict least used entry
   */
  private evictLeastUsed(): void {
    let leastUsedKey: string | null = null;
    let minHits = Infinity;

    for (const [key, entry] of this.cache) {
      if (entry.hits < minHits) {
        minHits = entry.hits;
        leastUsedKey = key;
      }
    }

    if (leastUsedKey) {
      this.delete(leastUsedKey);
    }
  }
}

/**
 * LocalStorage-backed cache
 */
export class LocalStorageCache<T = unknown> {
  private prefix: string;
  private config: CacheConfig;

  constructor(namespace: string, config: CacheConfig) {
    this.prefix = `cache:${namespace}:`;
    this.config = config;
  }

  /**
   * Get value from storage
   */
  get(key: string): T | null {
    try {
      const item = localStorage.getItem(this.prefix + key);
      if (!item) {
        return null;
      }

      const entry = JSON.parse(item) as CacheEntry<T>;

      if (Date.now() > entry.expiresAt) {
        localStorage.removeItem(this.prefix + key);
        return null;
      }

      return entry.value;
    } catch {
      return null;
    }
  }

  /**
   * Set value in storage
   */
  set(key: string, value: T): void {
    try {
      const entry: CacheEntry<T> = {
        value,
        expiresAt: Date.now() + this.config.ttlMs,
        createdAt: Date.now(),
        hits: 0,
      };

      localStorage.setItem(this.prefix + key, JSON.stringify(entry));
    } catch {
      // Storage full or unavailable
    }
  }

  /**
   * Delete specific key
   */
  delete(key: string): boolean {
    try {
      localStorage.removeItem(this.prefix + key);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    try {
      const keys = Object.keys(localStorage);
      for (const key of keys) {
        if (key.startsWith(this.prefix)) {
          localStorage.removeItem(key);
        }
      }
    } catch {
      // Storage unavailable
    }
  }
}

/**
 * Cache invalidation strategies
 */
export class CacheInvalidation {
  /**
   * Time-based invalidation (TTL)
   */
  static timeBasedKey(baseKey: string, intervalMs: number): string {
    const interval = Math.floor(Date.now() / intervalMs);
    return `${baseKey}:${interval}`;
  }

  /**
   * Version-based invalidation
   */
  static versionedKey(baseKey: string, version: number | string): string {
    return `${baseKey}:v${version}`;
  }

  /**
   * Pattern-based invalidation
   */
  static matchPattern(keys: string[], pattern: string): string[] {
    const regex = new RegExp(pattern);
    return keys.filter((key) => regex.test(key));
  }

  /**
   * Tag-based invalidation
   */
  static createTaggedKey(baseKey: string, tags: string[]): string {
    return `${baseKey}:${tags.sort().join(',')}`;
  }
}

/**
 * Query result caching decorator
 */
export function withCache<T>(
  cache: MemoryCache<T>,
  ttlMs: number = 5 * 60 * 1000
) {
  return function (
    target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      const cacheKey = `${propertyKey}:${JSON.stringify(args)}`;

      // Check cache
      let cached = cache.get(cacheKey);
      if (cached) {
        return cached;
      }

      // Call original method
      const result = await originalMethod.apply(this, args);

      // Cache result
      cache.set(cacheKey, result);

      return result;
    };

    return descriptor;
  };
}

/**
 * Cache statistics tracker
 */
export class CacheStats {
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    sets: 0,
  };

  /**
   * Record cache hit
   */
  recordHit(): void {
    this.stats.hits++;
  }

  /**
   * Record cache miss
   */
  recordMiss(): void {
    this.stats.misses++;
  }

  /**
   * Record eviction
   */
  recordEviction(): void {
    this.stats.evictions++;
  }

  /**
   * Record set
   */
  recordSet(): void {
    this.stats.sets++;
  }

  /**
   * Get hit rate
   */
  getHitRate(): number {
    const total = this.stats.hits + this.stats.misses;
    return total === 0 ? 0 : (this.stats.hits / total) * 100;
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      ...this.stats,
      hitRate: this.getHitRate(),
    };
  }

  /**
   * Reset statistics
   */
  reset(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      sets: 0,
    };
  }
}

/**
 * Multi-level caching (L1 memory + L2 storage)
 */
export class MultiLevelCache<T> {
  private l1: MemoryCache<T>;
  private l2: LocalStorageCache<T>;

  constructor(namespace: string, ttlMs: number = 5 * 60 * 1000) {
    this.l1 = new MemoryCache({ ttlMs, maxSize: 50 });
    this.l2 = new LocalStorageCache(namespace, { ttlMs });
  }

  /**
   * Get from L1 or L2
   */
  get(key: string): T | null {
    let value = this.l1.get(key);
    if (value !== null) {
      return value;
    }

    value = this.l2.get(key);
    if (value !== null) {
      // Promote to L1
      this.l1.set(key, value);
    }

    return value;
  }

  /**
   * Set in both L1 and L2
   */
  set(key: string, value: T): void {
    this.l1.set(key, value);
    this.l2.set(key, value);
  }

  /**
   * Delete from both levels
   */
  delete(key: string): void {
    this.l1.delete(key);
    this.l2.delete(key);
  }

  /**
   * Clear both levels
   */
  clear(): void {
    this.l1.clear();
    this.l2.clear();
  }
}
