//! Standard API Response Wrapper
//!
//! Provides consistent response structure across all API endpoints.
//! Ensures predictable response format for client applications.

use serde::{Deserialize, Serialize};

/// Standard API response wrapper for all successful responses
///
/// Ensures consistent response structure across all endpoints.
/// Clients can always expect this structure and parse it reliably.
///
/// # Example Success Response
/// ```json
/// {
///   "success": true,
///   "data": { "id": "123", "name": "Example" },
///   "meta": {
///     "timestamp": "2026-01-18T16:00:00Z",
///     "version": "1.0"
///   }
/// }
/// ```
///
/// # Example Paginated Response
/// ```json
/// {
///   "success": true,
///   "data": [
///     { "id": "1", "name": "Item 1" },
///     { "id": "2", "name": "Item 2" }
///   ],
///   "meta": {
///     "timestamp": "2026-01-18T16:00:00Z",
///     "version": "1.0",
///     "pagination": {
///       "page": 1,
///       "limit": 20,
///       "total": 42,
///       "has_more": true
///     }
///   }
/// }
/// ```
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ApiResponse<T: Serialize> {
    /// Indicates if the request was successful
    pub success: bool,

    /// The actual response data
    pub data: T,

    /// Metadata about the response
    pub meta: ResponseMeta,
}

/// Metadata included in all responses
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ResponseMeta {
    /// ISO 8601 timestamp when response was generated
    pub timestamp: String,

    /// API version
    #[serde(skip_serializing_if = "Option::is_none")]
    pub version: Option<String>,

    /// Pagination info (only for list endpoints)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub pagination: Option<PaginationMeta>,

    /// Request correlation ID for tracing
    #[serde(skip_serializing_if = "Option::is_none")]
    pub request_id: Option<String>,
}

/// Pagination metadata for list responses
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PaginationMeta {
    /// Current page number (1-indexed)
    pub page: u32,

    /// Items per page
    pub limit: u32,

    /// Total number of items available
    pub total: u64,

    /// Whether more items are available
    pub has_more: bool,
}

impl<T: Serialize> ApiResponse<T> {
    /// Create a new successful response with data
    pub fn ok(data: T) -> Self {
        Self {
            success: true,
            data,
            meta: ResponseMeta {
                timestamp: chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Secs, true),
                version: Some("1.0".to_string()),
                pagination: None,
                request_id: None,
            },
        }
    }

    /// Create a response with pagination metadata
    pub fn paginated(
        data: T,
        page: u32,
        limit: u32,
        total: u64,
    ) -> Self {
        let has_more = (page as u64) * (limit as u64) < total;
        Self {
            success: true,
            data,
            meta: ResponseMeta {
                timestamp: chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Secs, true),
                version: Some("1.0".to_string()),
                pagination: Some(PaginationMeta {
                    page,
                    limit,
                    total,
                    has_more,
                }),
                request_id: None,
            },
        }
    }

    /// Add request correlation ID for tracing
    pub fn with_request_id(mut self, request_id: String) -> Self {
        self.meta.request_id = Some(request_id);
        self
    }

    /// Add pagination to response
    pub fn with_pagination(
        mut self,
        page: u32,
        limit: u32,
        total: u64,
    ) -> Self {
        let has_more = (page as u64) * (limit as u64) < total;
        self.meta.pagination = Some(PaginationMeta {
            page,
            limit,
            total,
            has_more,
        });
        self
    }
}

/// Standard error response for failed requests
///
/// # Example Error Response
/// ```json
/// {
///   "success": false,
///   "error": {
///     "code": "VALIDATION_ERROR",
///     "message": "Invalid input: email format required",
///     "details": [
///       {
///         "field": "email",
///         "message": "Invalid email format"
///       }
///     ]
///   },
///   "meta": {
///     "timestamp": "2026-01-18T16:00:00Z",
///     "version": "1.0"
///   }
/// }
/// ```
#[derive(Debug, Serialize, Deserialize)]
pub struct ErrorResponse {
    /// Always false for errors
    pub success: bool,

    /// Error details
    pub error: ErrorDetails,

    /// Metadata about the response
    pub meta: ResponseMeta,
}

/// Error details in error responses
#[derive(Debug, Serialize, Deserialize)]
pub struct ErrorDetails {
    /// Error code for programmatic handling
    pub code: String,

    /// Human-readable error message
    pub message: String,

    /// Additional error context/details
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<Vec<ErrorDetail>>,
}

/// Individual error detail (e.g., field validation error)
#[derive(Debug, Serialize, Deserialize)]
pub struct ErrorDetail {
    /// Field name (for validation errors)
    pub field: String,

    /// Error message for this field
    pub message: String,
}

impl ErrorResponse {
    /// Create a validation error response
    pub fn validation_error(message: impl Into<String>, details: Vec<ErrorDetail>) -> Self {
        Self {
            success: false,
            error: ErrorDetails {
                code: "VALIDATION_ERROR".to_string(),
                message: message.into(),
                details: Some(details),
            },
            meta: ResponseMeta {
                timestamp: chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Secs, true),
                version: Some("1.0".to_string()),
                pagination: None,
                request_id: None,
            },
        }
    }

    /// Create a generic error response
    pub fn error(code: impl Into<String>, message: impl Into<String>) -> Self {
        Self {
            success: false,
            error: ErrorDetails {
                code: code.into(),
                message: message.into(),
                details: None,
            },
            meta: ResponseMeta {
                timestamp: chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Secs, true),
                version: Some("1.0".to_string()),
                pagination: None,
                request_id: None,
            },
        }
    }

    /// Add request correlation ID
    pub fn with_request_id(mut self, request_id: String) -> Self {
        self.meta.request_id = Some(request_id);
        self
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_api_response_creation() {
        let response = ApiResponse::ok(vec!["a", "b", "c"]);
        assert!(response.success);
        assert_eq!(response.data.len(), 3);
    }

    #[test]
    fn test_paginated_response() {
        let response = ApiResponse::paginated(vec![1, 2, 3], 1, 10, 25);
        assert!(response.success);
        assert!(response.meta.pagination.is_some());

        let pagination = response.meta.pagination.unwrap();
        assert_eq!(pagination.page, 1);
        assert_eq!(pagination.limit, 10);
        assert_eq!(pagination.total, 25);
        assert!(pagination.has_more);
    }

    #[test]
    fn test_error_response() {
        let error = ErrorResponse::error("TEST_ERROR", "Something went wrong");
        assert!(!error.success);
        assert_eq!(error.error.code, "TEST_ERROR");
    }

    #[test]
    fn test_validation_error() {
        let details = vec![
            ErrorDetail {
                field: "email".to_string(),
                message: "Invalid email format".to_string(),
            },
        ];
        let error = ErrorResponse::validation_error("Validation failed", details);
        assert!(!error.success);
        assert_eq!(error.error.code, "VALIDATION_ERROR");
        assert!(error.error.details.is_some());
    }
}
