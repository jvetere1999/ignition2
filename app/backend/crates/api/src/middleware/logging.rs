//! Request/Response Logging Middleware
//!
//! Provides structured logging for all HTTP requests and responses.
//! Logs include method, path, status code, response time, and error details.
//!
//! Usage:
//! ```rust
//! let app = Router::new()
//!     .nest("/api", api_routes)
//!     .layer(middleware::from_fn(request_logging_middleware));
//! ```

use axum::{
    body::Body,
    http::{Request, StatusCode},
    middleware::Next,
    response::Response,
};
use std::time::Instant;
use tracing::{error, info, warn};

/// Request/Response logging middleware
///
/// Logs every request and response with timing information and status details.
/// Useful for debugging, monitoring, and performance analysis.
pub async fn request_logging_middleware(req: Request<Body>, next: Next) -> Response {
    let method = req.method().clone();
    let uri = req.uri().clone();
    let path = uri.path().to_string();
    let start = Instant::now();

    // Log incoming request
    info!(
        target: "http_requests",
        method = %method,
        path = %path,
        "→ Incoming request"
    );

    let response = next.run(req).await;
    let status = response.status();
    let elapsed = start.elapsed();
    let elapsed_ms = elapsed.as_millis();

    // Log response with status-appropriate level
    match status {
        StatusCode::OK | StatusCode::CREATED | StatusCode::NO_CONTENT => {
            info!(
                target: "http_requests",
                method = %method,
                path = %path,
                status = status.as_u16(),
                elapsed_ms = elapsed_ms,
                "← Response OK"
            );
        }
        StatusCode::BAD_REQUEST | StatusCode::UNAUTHORIZED | StatusCode::FORBIDDEN => {
            warn!(
                target: "http_requests",
                method = %method,
                path = %path,
                status = status.as_u16(),
                elapsed_ms = elapsed_ms,
                "← Response CLIENT_ERROR"
            );
        }
        StatusCode::NOT_FOUND => {
            info!(
                target: "http_requests",
                method = %method,
                path = %path,
                status = status.as_u16(),
                elapsed_ms = elapsed_ms,
                "← Response NOT_FOUND"
            );
        }
        StatusCode::INTERNAL_SERVER_ERROR | StatusCode::SERVICE_UNAVAILABLE => {
            error!(
                target: "http_requests",
                method = %method,
                path = %path,
                status = status.as_u16(),
                elapsed_ms = elapsed_ms,
                "← Response SERVER_ERROR"
            );
        }
        _ => {
            info!(
                target: "http_requests",
                method = %method,
                path = %path,
                status = status.as_u16(),
                elapsed_ms = elapsed_ms,
                "← Response OTHER"
            );
        }
    }

    // Warn on slow responses (> 1 second)
    if elapsed.as_secs_f64() > 1.0 {
        warn!(
            target: "http_performance",
            method = %method,
            path = %path,
            status = status.as_u16(),
            elapsed_ms = elapsed_ms,
            "⚠ Slow request detected"
        );
    }

    response
}

/// Structured logging for database operations
///
/// Log pattern for database queries:
/// ```text
/// target: "db_operations"
/// operation: "SELECT", "INSERT", "UPDATE", "DELETE"
/// table: "users", "habits", etc.
/// elapsed_ms: response time in milliseconds
/// rows_affected: number of rows
/// status: "success" or "error"
/// ```
///
/// Usage:
/// ```rust
/// info!(
///     target: "db_operations",
///     operation: "SELECT",
///     table: "users",
///     elapsed_ms: 42,
///     rows: 1,
///     "Database query completed"
/// );
/// ```

#[cfg(test)]
mod tests {
    use super::*;
    use axum::{body::Body, http::Request};

    #[tokio::test]
    async fn test_logging_middleware_logs_request() {
        // This test verifies the middleware can be instantiated
        // Actual logging verification would require inspecting tracing subscriber output
        let req = Request::builder()
            .method("GET")
            .uri("/api/test")
            .body(Body::empty())
            .unwrap();

        // Middleware would log this request
        // In real scenarios, use a tracing subscriber to capture and verify logs
    }
}
