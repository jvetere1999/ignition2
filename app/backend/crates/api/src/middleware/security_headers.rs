//! Security headers middleware
//!
//! Adds security headers to all HTTP responses to protect against common web vulnerabilities.
//! Includes:
//! - Content-Security-Policy: CSP headers to prevent XSS and injection attacks
//! - X-Content-Type-Options: nosniff (prevents MIME sniffing attacks)
//! - X-Frame-Options: DENY (prevents clickjacking attacks)
//! - Strict-Transport-Security: max-age=31536000 (HTTPS enforcement)
//! - X-XSS-Protection: 1; mode=block (XSS filter, deprecated but supported by older browsers)
//! - Referrer-Policy: strict-origin-when-cross-origin (control referrer leakage)
//! - Cache-Control: Intelligent caching based on endpoint type (PERF-001)
//! - X-Cache-Version: API version header for cache invalidation

use axum::{body::Body, http::{Response, Method}, middleware::Next};
use std::time::{SystemTime, UNIX_EPOCH};

/// Middleware to add security headers and cache headers to all responses
///
/// **Performance**: Minimal - single pass to add HTTP headers
/// **Headers Added**: 7+ security headers + cache headers per response
/// **Standards**: OWASP Top 10, NIST recommendations, HTTP Caching (RFC 7234)
pub async fn add_security_headers(request: axum::extract::Request, next: Next) -> Response<Body> {
    let path = request.uri().path().to_string();
    let method = request.method().clone();
    
    let mut response = next.run(request).await;
    let headers = response.headers_mut();

    // ========================================================================
    // SECURITY HEADERS
    // ========================================================================

    // Content-Security-Policy: Prevent XSS, injection attacks, and unauthorized resource loading
    // TODO [SEC-005]: Allow dynamic CSP based on environment and feature flags
    // Reference: backend_security_patterns.md#csp-2-missing-security-headers
    // Roadmap: Step 2 of 2 - Generate CSP dynamically for different environments
    //
    // Inline policy explanation:
    // - default-src 'self' - All resources from same origin only
    // - script-src 'self' - Scripts only from same origin (no inline scripts)
    // - style-src 'self' 'unsafe-inline' - Styles from same origin, allow inline (for styled-components/CSS-in-JS)
    // - img-src 'self' data: https: - Images from same origin, data URLs, HTTPS
    // - font-src 'self' - Fonts from same origin only
    // - connect-src 'self' - AJAX/WebSocket to same origin only
    // - frame-ancestors 'none' - Duplicate of X-Frame-Options, extra protection
    // - base-uri 'self' - Base URL must be same origin
    // - form-action 'self' - Forms can only submit to same origin
    let csp = "default-src 'self'; \
               script-src 'self'; \
               style-src 'self' 'unsafe-inline'; \
               img-src 'self' data: https:; \
               font-src 'self'; \
               connect-src 'self'; \
               frame-ancestors 'none'; \
               base-uri 'self'; \
               form-action 'self'";

    headers.insert("Content-Security-Policy", csp.parse().unwrap());

    // Prevent MIME sniffing: tell browsers not to guess the content type
    headers.insert("X-Content-Type-Options", "nosniff".parse().unwrap());

    // Prevent clickjacking: deny iframe embedding
    headers.insert("X-Frame-Options", "DENY".parse().unwrap());

    // HSTS: enforce HTTPS for all connections (max-age = 1 year)
    headers.insert(
        "Strict-Transport-Security",
        "max-age=31536000; includeSubDomains".parse().unwrap(),
    );

    // XSS Filter: older browsers use built-in XSS filters
    // (Modern browsers ignore this, but it's a defense-in-depth measure)
    headers.insert("X-XSS-Protection", "1; mode=block".parse().unwrap());

    // Referrer-Policy: Control what referrer information is shared
    // strict-origin-when-cross-origin: Only send origin on same-site, nothing on cross-site
    headers.insert(
        "Referrer-Policy",
        "strict-origin-when-cross-origin".parse().unwrap(),
    );

    // ========================================================================
    // CACHE HEADERS - PERF-001: Browser Caching
    // ========================================================================
    // TODO [PERF-001]: Browser Caching Implementation
    // Reference: MEDIUM_TASKS_EXECUTION_PLAN.md#perf-001-browser-caching
    // Roadmap: Step 1 of 4 - Configure Cache-Control headers by endpoint type
    // Status: IN_PROGRESS

    // Determine cache strategy based on endpoint path and method
    let cache_control = match (method.clone(), path.as_str()) {
        // ====================================================================
        // STATIC/LONG-LIVED DATA - Cache for 1 hour
        // ====================================================================
        // Rarely changes: onboarding, frameworks, metadata
        (Method::GET, p) if p.contains("/onboarding/")
            || p.contains("/learn/metadata")
            || p.contains("/learn/frameworks") =>
        {
            "public, max-age=3600, s-maxage=3600" // 1 hour
        }

        // ====================================================================
        // SEMI-STABLE DATA - Cache for 5 minutes
        // ====================================================================
        // Changes occasionally: habits, goals, exercises, reference content
        (Method::GET, p) if p.contains("/habits/")
            || p.contains("/goals/")
            || p.contains("/exercise/")
            || p.contains("/reference/")
            || p.contains("/references/")
            || p.contains("/quests/") =>
        {
            "private, max-age=300, s-maxage=300" // 5 minutes
        }

        // ====================================================================
        // USER-SPECIFIC DATA - Cache for 1 minute
        // ====================================================================
        // Changes frequently but user-specific: user profile, progress, stats
        (Method::GET, p) if p.contains("/user/")
            || p.contains("/admin/stats")
            || p.contains("/calendar/")
            || p.contains("/daily-plan/")
            || p.contains("/progress/") =>
        {
            "private, max-age=60" // 1 minute
        }

        // ====================================================================
        // REAL-TIME DATA - No caching
        // ====================================================================
        // Changes very frequently: focus sessions, inbox, streaming data
        (Method::GET, p) if p.contains("/focus/")
            || p.contains("/inbox/")
            || p.contains("/notifications/") =>
        {
            "no-cache, no-store, must-revalidate" // No caching
        }

        // ====================================================================
        // POST/PUT/DELETE - Never cache mutations
        // ====================================================================
        (Method::POST, _) | (Method::PUT, _) | (Method::DELETE, _) | (Method::PATCH, _) => {
            "no-cache, no-store, must-revalidate"
        }

        // ====================================================================
        // DEFAULT - Conservative caching
        // ====================================================================
        _ => "private, max-age=60", // 1 minute for unknown endpoints
    };

    headers.insert("Cache-Control", cache_control.parse().unwrap());

    // ========================================================================
    // CACHE INVALIDATION - X-Cache-Version header
    // ========================================================================
    // TODO [PERF-001]: Cache Invalidation Strategy
    // Reference: MEDIUM_TASKS_EXECUTION_PLAN.md#phase-3-add-cache-invalidation
    // Roadmap: Step 3 of 4 - Add version headers for client cache invalidation
    // Status: PENDING (depends on Phase 2: Service Worker setup)
    
    // Version header for cache invalidation strategy
    // Increment this when API response format changes to force cache refresh
    // Client will check this version on startup and clear cache if mismatch
    let cache_version = "1";
    headers.insert("X-Cache-Version", cache_version.parse().unwrap());

    // Add timestamp for debugging cache behavior
    if let Ok(duration) = SystemTime::now().duration_since(UNIX_EPOCH) {
        let timestamp = duration.as_secs();
        headers.insert(
            "X-Response-Time",
            timestamp.to_string().parse().unwrap_or_else(|_| "unknown".parse().unwrap()),
        );
    }

    response
}
