/**
 * Rate Limiting Utilities
 *
 * Provides token bucket, sliding window, and fixed window rate limiting
 * algorithms for API protection and quota management.
 */

use std::time::{SystemTime, UNIX_EPOCH};
use std::collections::HashMap;

/// Rate limit configuration
#[derive(Clone, Debug)]
pub struct RateLimitConfig {
    pub requests_per_second: u32,
    pub burst_size: u32,
    pub window_size_secs: u64,
}

impl RateLimitConfig {
    /// Create new config
    pub fn new(requests_per_second: u32) -> Self {
        Self {
            requests_per_second,
            burst_size: requests_per_second * 2,
            window_size_secs: 60,
        }
    }

    /// Set burst size
    pub fn with_burst(mut self, burst_size: u32) -> Self {
        self.burst_size = burst_size;
        self
    }
}

/// Token bucket rate limiter
pub struct TokenBucket {
    config: RateLimitConfig,
    tokens: f64,
    last_refill: u64,
}

impl TokenBucket {
    /// Create new token bucket
    pub fn new(config: RateLimitConfig) -> Self {
        Self {
            tokens: config.burst_size as f64,
            config,
            last_refill: current_timestamp(),
        }
    }

    /// Check if request is allowed
    pub fn is_allowed(&mut self) -> bool {
        self.refill();
        
        if self.tokens >= 1.0 {
            self.tokens -= 1.0;
            true
        } else {
            false
        }
    }

    /// Try to consume N tokens
    pub fn try_consume(&mut self, tokens: u32) -> bool {
        self.refill();
        
        let needed = tokens as f64;
        if self.tokens >= needed {
            self.tokens -= needed;
            true
        } else {
            false
        }
    }

    /// Refill tokens based on elapsed time
    fn refill(&mut self) {
        let now = current_timestamp();
        let elapsed = now - self.last_refill;
        let refill_rate = self.config.requests_per_second as f64 / 1000.0;
        let tokens_to_add = (elapsed as f64) * refill_rate;
        
        self.tokens = (self.tokens + tokens_to_add).min(self.config.burst_size as f64);
        self.last_refill = now;
    }
}

/// Sliding window rate limiter
pub struct SlidingWindow {
    config: RateLimitConfig,
    requests: Vec<u64>,
}

impl SlidingWindow {
    /// Create new sliding window
    pub fn new(config: RateLimitConfig) -> Self {
        Self {
            config,
            requests: Vec::new(),
        }
    }

    /// Check if request is allowed
    pub fn is_allowed(&mut self) -> bool {
        let now = current_timestamp();
        let window_start = now - self.config.window_size_secs;
        
        // Remove old requests outside window
        self.requests.retain(|&t| t > window_start);
        
        if self.requests.len() < self.config.requests_per_second as usize {
            self.requests.push(now);
            true
        } else {
            false
        }
    }
}

/// Fixed window rate limiter
pub struct FixedWindow {
    config: RateLimitConfig,
    request_count: u32,
    window_start: u64,
}

impl FixedWindow {
    /// Create new fixed window
    pub fn new(config: RateLimitConfig) -> Self {
        Self {
            config,
            request_count: 0,
            window_start: current_timestamp(),
        }
    }

    /// Check if request is allowed
    pub fn is_allowed(&mut self) -> bool {
        let now = current_timestamp();
        let window_end = self.window_start + self.config.window_size_secs;
        
        // Start new window if expired
        if now > window_end {
            self.window_start = now;
            self.request_count = 0;
        }
        
        let max_requests = self.config.requests_per_second * self.config.window_size_secs as u32;
        if self.request_count < max_requests {
            self.request_count += 1;
            true
        } else {
            false
        }
    }
}

/// Multi-user rate limiter
pub struct MultiUserRateLimiter {
    limiters: HashMap<String, TokenBucket>,
    config: RateLimitConfig,
}

impl MultiUserRateLimiter {
    /// Create new multi-user limiter
    pub fn new(config: RateLimitConfig) -> Self {
        Self {
            limiters: HashMap::new(),
            config,
        }
    }

    /// Check if request is allowed for user
    pub fn is_allowed_for_user(&mut self, user_id: &str) -> bool {
        let limiter = self.limiters
            .entry(user_id.to_string())
            .or_insert_with(|| TokenBucket::new(self.config.clone()));
        
        limiter.is_allowed()
    }

    /// Get remaining quota for user
    pub fn get_remaining(&self, user_id: &str) -> Option<u32> {
        self.limiters
            .get(user_id)
            .map(|limiter| limiter.tokens.ceil() as u32)
    }
}

/// Get current timestamp in milliseconds
fn current_timestamp() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_token_bucket_basic() {
        let config = RateLimitConfig::new(10);
        let mut bucket = TokenBucket::new(config);
        
        // Should allow up to burst size
        for _ in 0..20 {
            if !bucket.is_allowed() {
                break;
            }
        }
    }

    #[test]
    fn test_sliding_window() {
        let config = RateLimitConfig::new(5);
        let mut window = SlidingWindow::new(config);
        
        for _ in 0..5 {
            assert!(window.is_allowed());
        }
        
        assert!(!window.is_allowed());
    }

    #[test]
    fn test_multi_user_limiter() {
        let config = RateLimitConfig::new(10);
        let mut limiter = MultiUserRateLimiter::new(config);
        
        assert!(limiter.is_allowed_for_user("user1"));
        assert!(limiter.is_allowed_for_user("user2"));
    }
}
