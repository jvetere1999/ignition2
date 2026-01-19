/**
 * Advanced Caching Utilities & Strategies
 *
 * Extends core caching with advanced patterns: cache builders, invalidation
 * strategies, distributed cache management, and batch operations.
 */

use crate::cache::QueryCache;
use serde_json::Value as JsonValue;
use std::time::Duration;

/// Cache configuration with TTL and size limits
#[derive(Clone, Debug)]
pub struct CacheConfig {
    pub ttl_ms: u64,
    pub namespace: String,
    pub max_size: usize,
}

impl CacheConfig {
    /// Create new cache configuration
    pub fn new(namespace: impl Into<String>, ttl_ms: u64) -> Self {
        Self {
            ttl_ms,
            namespace: namespace.into(),
            max_size: 1000,
        }
    }

    /// Set maximum cache size
    pub fn with_max_size(mut self, max_size: usize) -> Self {
        self.max_size = max_size;
        self
    }
}

/// Cache key builder for creating namespaced keys
#[derive(Debug)]
pub struct CacheKeyBuilder {
    namespace: String,
    parts: Vec<String>,
}

impl CacheKeyBuilder {
    /// Create new cache key builder
    pub fn new(namespace: impl Into<String>) -> Self {
        Self {
            namespace: namespace.into(),
            parts: Vec::new(),
        }
    }

    /// Add a key component
    pub fn add(mut self, part: impl Into<String>) -> Self {
        self.parts.push(part.into());
        self
    }

    /// Add multiple components
    pub fn add_many(mut self, parts: impl IntoIterator<Item = impl Into<String>>) -> Self {
        self.parts.extend(parts.into_iter().map(|p| p.into()));
        self
    }

    /// Build the final cache key
    pub fn build(self) -> String {
        let mut key = format!("{}:", self.namespace);
        key.push_str(&self.parts.join(":"));
        key
    }
}

/// Cache entry metadata and statistics
#[derive(Clone, Debug)]
pub struct CacheEntryMetadata {
    pub created_at_ms: u64,
    pub expires_at_ms: u64,
    pub access_count: u64,
    pub last_accessed_at_ms: u64,
}

impl CacheEntryMetadata {
    /// Create new metadata for a cache entry
    pub fn new(ttl_ms: u64) -> Self {
        let now = get_current_time_ms();
        Self {
            created_at_ms: now,
            expires_at_ms: now + ttl_ms,
            access_count: 0,
            last_accessed_at_ms: now,
        }
    }

    /// Check if entry is expired
    pub fn is_expired(&self) -> bool {
        get_current_time_ms() > self.expires_at_ms
    }

    /// Get remaining TTL in milliseconds
    pub fn remaining_ttl_ms(&self) -> u64 {
        let now = get_current_time_ms();
        if self.expires_at_ms > now {
            self.expires_at_ms - now
        } else {
            0
        }
    }

    /// Record an access
    pub fn record_access(&mut self) {
        self.access_count += 1;
        self.last_accessed_at_ms = get_current_time_ms();
    }
}

/// Get current time in milliseconds
fn get_current_time_ms() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

/// Cache invalidation strategies
pub struct CacheInvalidationStrategy;

impl CacheInvalidationStrategy {
    /// Create a wildcard pattern for bulk invalidation
    pub fn wildcard_pattern(namespace: &str, prefix: &str) -> String {
        format!("{}:{}*", namespace, prefix)
    }

    /// Create a version-based cache key
    pub fn versioned_key(base: &str, version: u32) -> String {
        format!("{}:v{}", base, version)
    }

    /// Create a time-bucketed cache key for periodic invalidation
    pub fn time_bucketed_key(base: &str, bucket_size_secs: u64) -> String {
        let bucket = get_current_time_ms() / 1000 / bucket_size_secs;
        format!("{}:bucket_{}", base, bucket)
    }

    /// Create entity-scoped cache key
    pub fn entity_key(entity_type: &str, entity_id: &str, key: &str) -> String {
        format!("{}:{}:{}:{}", entity_type, entity_id, key, get_current_time_ms() / 1000)
    }

    /// Create user-scoped cache key
    pub fn user_key(user_id: &str, key: &str) -> String {
        format!("user:{}:{}", user_id, key)
    }

    /// Create tenant-scoped cache key
    pub fn tenant_key(tenant_id: &str, key: &str) -> String {
        format!("tenant:{}:{}", tenant_id, key)
    }
}

/// Cache statistics and metrics
#[derive(Clone, Debug, Default)]
pub struct CacheMetrics {
    pub hits: u64,
    pub misses: u64,
    pub evictions: u64,
    pub sets: u64,
    pub deletes: u64,
}

impl CacheMetrics {
    /// Create new cache metrics
    pub fn new() -> Self {
        Self::default()
    }

    /// Record a cache hit
    pub fn record_hit(&mut self) {
        self.hits += 1;
    }

    /// Record a cache miss
    pub fn record_miss(&mut self) {
        self.misses += 1;
    }

    /// Record an eviction
    pub fn record_eviction(&mut self) {
        self.evictions += 1;
    }

    /// Record a set operation
    pub fn record_set(&mut self) {
        self.sets += 1;
    }

    /// Record a delete operation
    pub fn record_delete(&mut self) {
        self.deletes += 1;
    }

    /// Calculate hit rate as percentage
    pub fn hit_rate_percent(&self) -> f64 {
        let total = self.hits + self.misses;
        if total == 0 {
            0.0
        } else {
            (self.hits as f64 / total as f64) * 100.0
        }
    }

    /// Calculate operations per second
    pub fn ops_per_second(&self, elapsed_secs: u64) -> f64 {
        if elapsed_secs == 0 {
            return 0.0;
        }
        let total_ops = self.hits + self.misses + self.sets + self.deletes;
        total_ops as f64 / elapsed_secs as f64
    }

    /// Reset all metrics
    pub fn reset(&mut self) {
        self.hits = 0;
        self.misses = 0;
        self.evictions = 0;
        self.sets = 0;
        self.deletes = 0;
    }
}

/// Batch cache operations for efficient updates
#[derive(Debug, Default)]
pub struct BatchCacheBuilder {
    operations: Vec<CacheOp>,
}

#[derive(Debug, Clone)]
enum CacheOp {
    Set(String, JsonValue),
    Delete(String),
    Clear,
}

impl BatchCacheBuilder {
    /// Create new batch cache builder
    pub fn new() -> Self {
        Self::default()
    }

    /// Add a set operation to the batch
    pub fn set(mut self, key: impl Into<String>, value: JsonValue) -> Self {
        self.operations.push(CacheOp::Set(key.into(), value));
        self
    }

    /// Add a delete operation to the batch
    pub fn delete(mut self, key: impl Into<String>) -> Self {
        self.operations.push(CacheOp::Delete(key.into()));
        self
    }

    /// Add a clear operation to the batch
    pub fn clear(mut self) -> Self {
        self.operations.push(CacheOp::Clear);
        self
    }

    /// Execute batch operations on a cache
    pub async fn execute(self, cache: &QueryCache) {
        for op in self.operations {
            match op {
                CacheOp::Set(key, value) => {
                    cache.set(key, value, Duration::from_secs(3600)).await;
                }
                CacheOp::Delete(key) => {
                    cache.invalidate(&key).await;
                }
                CacheOp::Clear => {
                    cache.clear().await;
                }
            }
        }
    }

    /// Get the number of operations in this batch
    pub fn len(&self) -> usize {
        self.operations.len()
    }

    /// Check if batch is empty
    pub fn is_empty(&self) -> bool {
        self.operations.is_empty()
    }
}

/// Cache warmer for preloading common data
pub struct CacheWarmer {
    keys: Vec<(String, JsonValue)>,
}

impl CacheWarmer {
    /// Create new cache warmer
    pub fn new() -> Self {
        Self { keys: Vec::new() }
    }

    /// Add entry to warm
    pub fn add(mut self, key: impl Into<String>, value: JsonValue) -> Self {
        self.keys.push((key.into(), value));
        self
    }

    /// Add multiple entries
    pub fn add_many(mut self, entries: Vec<(String, JsonValue)>) -> Self {
        self.keys.extend(entries);
        self
    }

    /// Warm the cache by loading all entries
    pub async fn warm(&self, cache: &QueryCache) {
        for (key, value) in &self.keys {
            cache.set(key.clone(), value.clone(), Duration::from_secs(3600)).await;
        }
    }

    /// Get number of entries to warm
    pub fn len(&self) -> usize {
        self.keys.len()
    }

    /// Check if empty
    pub fn is_empty(&self) -> bool {
        self.keys.is_empty()
    }
}

impl Default for CacheWarmer {
    fn default() -> Self {
        Self::new()
    }
}

/// Multi-level cache strategy (L1 memory + L2 persistent)
pub struct MultiLevelCacheStrategy {
    l1_ttl_ms: u64,
    l2_ttl_ms: u64,
}

impl MultiLevelCacheStrategy {
    /// Create new multi-level strategy
    pub fn new(l1_ttl_ms: u64, l2_ttl_ms: u64) -> Self {
        Self { l1_ttl_ms, l2_ttl_ms }
    }

    /// Get L1 cache TTL
    pub fn l1_ttl(&self) -> Duration {
        Duration::from_millis(self.l1_ttl_ms)
    }

    /// Get L2 cache TTL
    pub fn l2_ttl(&self) -> Duration {
        Duration::from_millis(self.l2_ttl_ms)
    }

    /// Check if value should be promoted to L1
    pub fn should_promote(&self, access_count: u64) -> bool {
        access_count > 5
    }

    /// Check if value should stay in L2
    pub fn should_persist(&self, access_count: u64) -> bool {
        access_count > 2
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cache_key_builder() {
        let key = CacheKeyBuilder::new("users")
            .add("123")
            .add("profile")
            .build();

        assert_eq!(key, "users:123:profile");
    }

    #[test]
    fn test_cache_entry_metadata() {
        let metadata = CacheEntryMetadata::new(5000);
        assert!(metadata.remaining_ttl_ms() > 0);
        assert!(!metadata.is_expired());
    }

    #[test]
    fn test_cache_metrics_hit_rate() {
        let mut metrics = CacheMetrics::new();
        metrics.hits = 80;
        metrics.misses = 20;

        assert_eq!(metrics.hit_rate_percent(), 80.0);
    }

    #[test]
    fn test_cache_invalidation_patterns() {
        let pattern = CacheInvalidationStrategy::user_key("user123", "profile");
        assert_eq!(pattern, "user:user123:profile");

        let versioned = CacheInvalidationStrategy::versioned_key("data", 2);
        assert!(versioned.contains("v2"));
    }

    #[test]
    fn test_batch_cache_builder() {
        let batch = BatchCacheBuilder::new()
            .set("key1", JsonValue::String("value1".to_string()))
            .delete("key2");

        assert_eq!(batch.len(), 2);
    }
}
