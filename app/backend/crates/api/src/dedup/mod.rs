/**
 * Request Deduplication Cache
 *
 * Prevents duplicate request processing by caching request signatures
 * and returning cached responses for identical requests within TTL window.
 */

use std::collections::HashMap;
use serde_json::Value as JsonValue;

/// Deduplication request entry
#[derive(Clone, Debug)]
struct DedupEntry {
    response: JsonValue,
    expires_at: u64,
    request_count: u32,
}

impl DedupEntry {
    fn is_expired(&self) -> bool {
        get_current_time_ms() > self.expires_at
    }
}

/// Request deduplication cache
pub struct DeduplicationCache {
    cache: HashMap<String, DedupEntry>,
    ttl_ms: u64,
    max_entries: usize,
}

impl DeduplicationCache {
    /// Create new deduplication cache
    pub fn new(ttl_ms: u64, max_entries: usize) -> Self {
        Self {
            cache: HashMap::new(),
            ttl_ms,
            max_entries,
        }
    }

    /// Generate request signature from method, path, and body
    pub fn generate_signature(method: &str, path: &str, body: &str) -> String {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};
        
        let mut hasher = DefaultHasher::new();
        format!("{}:{}:{}", method, path, body).hash(&mut hasher);
        format!("{:x}", hasher.finish())
    }

    /// Check if request is duplicate
    pub fn is_duplicate(&self, signature: &str) -> bool {
        if let Some(entry) = self.cache.get(signature) {
            !entry.is_expired()
        } else {
            false
        }
    }

    /// Get cached response
    pub fn get_cached_response(&mut self, signature: &str) -> Option<JsonValue> {
        if let Some(entry) = self.cache.get_mut(signature) {
            if !entry.is_expired() {
                entry.request_count += 1;
                return Some(entry.response.clone());
            } else {
                self.cache.remove(signature);
            }
        }
        None
    }

    /// Store response for signature
    pub fn store_response(&mut self, signature: String, response: JsonValue) {
        // Evict if cache is full
        if self.cache.len() >= self.max_entries {
            self.evict_oldest();
        }

        let entry = DedupEntry {
            response,
            expires_at: get_current_time_ms() + self.ttl_ms,
            request_count: 0,
        };

        self.cache.insert(signature, entry);
    }

    /// Evict least recently used entry
    fn evict_oldest(&mut self) {
        let oldest_key = self.cache
            .iter()
            .min_by_key(|(_, entry)| entry.request_count)
            .map(|(k, _)| k.clone());

        if let Some(key) = oldest_key {
            self.cache.remove(&key);
        }
    }

    /// Get stats
    pub fn get_stats(&self) -> DeduplicationStats {
        let total_entries = self.cache.len();
        let expired_entries = self.cache
            .values()
            .filter(|e| e.is_expired())
            .count();

        DeduplicationStats {
            total_entries,
            active_entries: total_entries - expired_entries,
            expired_entries,
            utilization_percent: (total_entries * 100) / self.max_entries.max(1),
        }
    }

    /// Clear cache
    pub fn clear(&mut self) {
        self.cache.clear();
    }
}

/// Deduplication statistics
#[derive(Debug, Clone)]
pub struct DeduplicationStats {
    pub total_entries: usize,
    pub active_entries: usize,
    pub expired_entries: usize,
    pub utilization_percent: usize,
}

/// Get current time in milliseconds
fn get_current_time_ms() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_signature_generation() {
        let sig1 = DeduplicationCache::generate_signature("POST", "/api/users", "{}");
        let sig2 = DeduplicationCache::generate_signature("POST", "/api/users", "{}");
        
        assert_eq!(sig1, sig2);
    }

    #[test]
    fn test_cache_storage() {
        let mut cache = DeduplicationCache::new(5000, 100);
        let sig = "test_signature";
        let response = JsonValue::String("response".to_string());
        
        cache.store_response(sig.to_string(), response.clone());
        
        let cached = cache.get_cached_response(sig);
        assert!(cached.is_some());
        assert_eq!(cached.unwrap(), response);
    }

    #[test]
    fn test_duplicate_detection() {
        let mut cache = DeduplicationCache::new(5000, 100);
        let sig = "test_sig";
        
        let response = JsonValue::String("test".to_string());
        cache.store_response(sig.to_string(), response);
        
        assert!(cache.is_duplicate(sig));
    }

    #[test]
    fn test_stats() {
        let mut cache = DeduplicationCache::new(5000, 100);
        
        for i in 0..10 {
            cache.store_response(
                format!("sig{}", i),
                JsonValue::String(format!("response{}", i)),
            );
        }
        
        let stats = cache.get_stats();
        assert_eq!(stats.active_entries, 10);
    }
}
