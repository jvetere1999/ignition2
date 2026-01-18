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

use axum::{body::Body, http::Response, middleware::Next};

/// Middleware to add security headers to all responses
///
/// **Performance**: Minimal - single pass to add HTTP headers
/// **Headers Added**: 6 security headers per response
/// **Standards**: OWASP Top 10, NIST recommendations
pub async fn add_security_headers(request: axum::extract::Request, next: Next) -> Response<Body> {
    let mut response = next.run(request).await;
    let headers = response.headers_mut();

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

    response
}
