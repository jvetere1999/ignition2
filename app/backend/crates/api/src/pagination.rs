//! Pagination utilities
//!
//! Provides standardized pagination logic for list endpoints.

use serde::{Deserialize, Serialize};

/// Pagination parameters from query string
#[derive(Debug, Clone, Deserialize)]
pub struct PaginationParams {
    /// Page number (1-indexed, default: 1)
    #[serde(default = "default_page")]
    pub page: u32,

    /// Items per page (default: 20, max: 100)
    #[serde(default = "default_limit")]
    pub limit: u32,
}

fn default_page() -> u32 {
    1
}

fn default_limit() -> u32 {
    20
}

impl PaginationParams {
    /// Maximum allowed limit
    const MAX_LIMIT: u32 = 100;
    /// Minimum limit
    const MIN_LIMIT: u32 = 1;

    /// Normalize pagination parameters
    /// - Clamps page to minimum 1
    /// - Clamps limit to valid range
    pub fn normalize(mut self) -> Self {
        if self.page < 1 {
            self.page = 1;
        }

        self.limit = self.limit.max(Self::MIN_LIMIT).min(Self::MAX_LIMIT);

        self
    }

    /// Calculate offset for database query
    /// Formula: (page - 1) * limit
    pub fn offset(&self) -> u32 {
        (self.page - 1) * self.limit
    }

    /// Validate pagination parameters
    pub fn validate(&self) -> Result<(), String> {
        if self.page < 1 {
            return Err("Page must be >= 1".to_string());
        }

        if self.limit < Self::MIN_LIMIT {
            return Err(format!("Limit must be >= {}", Self::MIN_LIMIT));
        }

        if self.limit > Self::MAX_LIMIT {
            return Err(format!("Limit must be <= {}", Self::MAX_LIMIT));
        }

        Ok(())
    }
}

impl Default for PaginationParams {
    fn default() -> Self {
        Self {
            page: default_page(),
            limit: default_limit(),
        }
    }
}

/// Pagination metadata for responses
#[derive(Debug, Clone, Serialize)]
pub struct PaginationMeta {
    /// Current page (1-indexed)
    pub page: u32,

    /// Items per page
    pub limit: u32,

    /// Total number of items
    pub total: u64,

    /// Whether more items are available
    pub has_more: bool,

    /// Total number of pages
    pub total_pages: u32,
}

impl PaginationMeta {
    /// Create new pagination metadata
    pub fn new(page: u32, limit: u32, total: u64) -> Self {
        let limit = limit.max(1);
        let total_pages = ((total + (limit as u64) - 1) / (limit as u64)) as u32;
        let has_more = (page as u64) < (total_pages as u64);

        Self {
            page,
            limit,
            total,
            has_more,
            total_pages,
        }
    }

    /// Get the first item number on this page (1-indexed)
    pub fn first_item(&self) -> u64 {
        if self.total == 0 {
            0
        } else {
            ((self.page as u64) - 1) * (self.limit as u64) + 1
        }
    }

    /// Get the last item number on this page (1-indexed)
    pub fn last_item(&self) -> u64 {
        if self.total == 0 {
            0
        } else {
            ((self.page as u64) * (self.limit as u64)).min(self.total)
        }
    }
}

/// Paginated response wrapper
#[derive(Debug, Serialize)]
pub struct PaginatedResponse<T: Serialize> {
    pub items: Vec<T>,
    pub pagination: PaginationMeta,
}

impl<T: Serialize> PaginatedResponse<T> {
    /// Create a paginated response
    pub fn new(items: Vec<T>, page: u32, limit: u32, total: u64) -> Self {
        Self {
            items,
            pagination: PaginationMeta::new(page, limit, total),
        }
    }

    /// Map items to a different type
    pub fn map<U: Serialize, F: Fn(T) -> U>(self, f: F) -> PaginatedResponse<U> {
        PaginatedResponse {
            items: self.items.into_iter().map(f).collect(),
            pagination: self.pagination,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pagination_default() {
        let params = PaginationParams::default();
        assert_eq!(params.page, 1);
        assert_eq!(params.limit, 20);
    }

    #[test]
    fn test_pagination_offset() {
        let params = PaginationParams { page: 1, limit: 10 };
        assert_eq!(params.offset(), 0);

        let params = PaginationParams { page: 2, limit: 10 };
        assert_eq!(params.offset(), 10);

        let params = PaginationParams { page: 3, limit: 20 };
        assert_eq!(params.offset(), 40);
    }

    #[test]
    fn test_pagination_normalize() {
        let mut params = PaginationParams { page: 0, limit: 50 };
        params = params.normalize();
        assert_eq!(params.page, 1);
        assert_eq!(params.limit, 50); // 50 is within range

        let mut params = PaginationParams { page: 5, limit: 200 };
        params = params.normalize();
        assert_eq!(params.page, 5);
        assert_eq!(params.limit, 100); // Clamped to max

        let mut params = PaginationParams { page: 5, limit: 0 };
        params = params.normalize();
        assert_eq!(params.limit, 1); // Clamped to min
    }

    #[test]
    fn test_pagination_metadata() {
        let meta = PaginationMeta::new(1, 10, 25);
        assert_eq!(meta.page, 1);
        assert_eq!(meta.total, 25);
        assert_eq!(meta.total_pages, 3);
        assert!(meta.has_more);
        assert_eq!(meta.first_item(), 1);
        assert_eq!(meta.last_item(), 10);

        let meta = PaginationMeta::new(3, 10, 25);
        assert!(!meta.has_more);
        assert_eq!(meta.first_item(), 21);
        assert_eq!(meta.last_item(), 25);

        let meta = PaginationMeta::new(1, 10, 0);
        assert_eq!(meta.first_item(), 0);
        assert_eq!(meta.last_item(), 0);
    }

    #[test]
    fn test_paginated_response() {
        let items = vec![1, 2, 3];
        let response = PaginatedResponse::new(items, 1, 10, 3);
        assert_eq!(response.items.len(), 3);
        assert_eq!(response.pagination.page, 1);
        assert!(!response.pagination.has_more);
    }
}
