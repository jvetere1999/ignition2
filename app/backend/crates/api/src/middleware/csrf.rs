//! CSRF protection middleware
//!
//! Per DEC-002=A: CSRF protection via strict Origin/Referer verification.
//!
//! Rules:
//! - For POST/PUT/PATCH/DELETE: Origin must exist AND match allowlist
//! - If Origin missing, fall back to Referer (same allowlist)
//! - If neither exists or matches, reject with 403
//! - For GET/HEAD/OPTIONS: No CSRF check required

use axum::{extract::Request, http::Method, middleware::Next, response::Response};

use crate::error::AppError;

/// Production allowed origins
const PRODUCTION_ORIGINS: &[&str] = &[
    "https://ignition.ecent.online",
    "https://admin.ignition.ecent.online",
];

/// Development allowed origins
const DEV_ORIGINS: &[&str] = &[
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
];

/// CSRF verification middleware
///
/// Implements Origin/Referer verification per DEC-002=A.
pub async fn csrf_check(req: Request, next: Next) -> Result<Response, AppError> {
    // Skip CSRF check for safe methods
    if is_safe_method(req.method()) {
        return Ok(next.run(req).await);
    }

    // Determine environment from env var
    let is_production = std::env::var("NODE_ENV")
        .map(|v| v == "production")
        .unwrap_or(false);

    // Build allowed origins list
    let mut all_allowed: Vec<&str> = PRODUCTION_ORIGINS.to_vec();
    if !is_production {
        all_allowed.extend(DEV_ORIGINS);
    }

    // Check Origin header first
    let origin = req.headers().get("Origin").and_then(|h| h.to_str().ok());

    // Check Referer as fallback
    let referer = req.headers().get("Referer").and_then(|h| h.to_str().ok());

    let is_valid = if let Some(origin) = origin {
        // Origin present, check against allowlist
        all_allowed
            .iter()
            .any(|allowed| origin == *allowed || origin.starts_with(&format!("{}/", allowed)))
    } else if let Some(referer) = referer {
        // Fall back to Referer
        all_allowed
            .iter()
            .any(|allowed| referer.starts_with(allowed))
    } else {
        // Neither Origin nor Referer present
        false
    };

    if !is_valid {
        tracing::warn!(
            "CSRF check failed - Origin: {:?}, Referer: {:?}",
            origin,
            referer
        );
        return Err(AppError::CsrfViolation);
    }

    Ok(next.run(req).await)
}

/// Check if method is safe (doesn't modify state)
fn is_safe_method(method: &Method) -> bool {
    matches!(method, &Method::GET | &Method::HEAD | &Method::OPTIONS)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_safe_methods() {
        assert!(is_safe_method(&Method::GET));
        assert!(is_safe_method(&Method::HEAD));
        assert!(is_safe_method(&Method::OPTIONS));
        assert!(!is_safe_method(&Method::POST));
        assert!(!is_safe_method(&Method::PUT));
        assert!(!is_safe_method(&Method::PATCH));
        assert!(!is_safe_method(&Method::DELETE));
    }
}
