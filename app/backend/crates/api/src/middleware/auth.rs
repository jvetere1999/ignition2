//! Authentication middleware
//!
//! Extracts and validates session from cookies.
//! Per DEC-001=A: Force re-auth at cutover, no session migration.
//! Per DEC-004=B: DB-backed roles for admin authorization.

use std::sync::Arc;

use axum::{
    extract::{Request, State},
    http::header,
    middleware::Next,
    response::Response,
};
use uuid::Uuid;

use crate::db::repos::{RbacRepo, SessionRepo, UserRepo};
use crate::error::AppError;
use crate::services::DevBypassAuth;
use crate::state::AppState;

/// Extracted authentication context
#[derive(Debug, Clone)]
#[allow(dead_code)]
pub struct AuthContext {
    /// User ID
    pub user_id: Uuid,
    /// User email
    pub email: String,
    /// User name
    pub name: String,
    /// User role (legacy column, per DEC-004=B)
    pub role: String,
    /// Session ID
    pub session_id: Uuid,
    /// User entitlements (from RBAC)
    pub entitlements: Vec<String>,
    /// Whether this is a dev bypass session
    pub is_dev_bypass: bool,
}

impl AuthContext {
    /// Check if user has admin role
    pub fn is_admin(&self) -> bool {
        self.role == "admin" || self.entitlements.contains(&"admin:access".to_string())
    }

    /// Check if user has a specific entitlement
    #[allow(dead_code)]
    pub fn has_entitlement(&self, entitlement: &str) -> bool {
        self.entitlements.contains(&entitlement.to_string())
    }
}

/// Session cookie name
pub const SESSION_COOKIE_NAME: &str = "session";

/// Extract session from request and validate
pub async fn extract_session(
    State(state): State<Arc<AppState>>,
    mut req: Request,
    next: Next,
) -> Result<Response, AppError> {
    let host = req
        .headers()
        .get(header::HOST)
        .and_then(|h| h.to_str().ok())
        .map(|s| s.to_string());

    // Check for dev bypass first
    if DevBypassAuth::is_allowed(&state.config.server.environment, host.as_deref()) {
        let (user_id, email, name, role) = DevBypassAuth::get_dev_user();
        let auth_context = AuthContext {
            user_id,
            email,
            name,
            role,
            session_id: Uuid::nil(),
            entitlements: vec![
                "admin:access".to_string(),
                "admin:users".to_string(),
                "admin:content".to_string(),
                "admin:backup".to_string(),
            ],
            is_dev_bypass: true,
        };
        req.extensions_mut().insert(auth_context);
        return Ok(next.run(req).await);
    }

    // Extract session token from cookies
    let session_token = extract_session_token(&req);

    if let Some(token) = session_token {
        // Look up session in database
        if let Some(session) = SessionRepo::find_by_token(&state.db, &token).await? {
            // Get user
            if let Some(user) = UserRepo::find_by_id(&state.db, session.user_id).await? {
                // Get entitlements from RBAC
                let entitlements = RbacRepo::get_entitlements(&state.db, user.id).await?;

                let auth_context = AuthContext {
                    user_id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    session_id: session.id,
                    entitlements,
                    is_dev_bypass: false,
                };

                // Update last activity (fire and forget)
                let db = state.db.clone();
                let sid = session.id;
                let uid = user.id;
                tokio::spawn(async move {
                    let _ = SessionRepo::touch(&db, sid).await;
                    let _ = UserRepo::update_last_activity(&db, uid).await;
                });

                req.extensions_mut().insert(auth_context);
            }
        }
    }

    Ok(next.run(req).await)
}

/// Require authenticated user
#[allow(dead_code)]
pub async fn require_auth(req: Request, next: Next) -> Result<Response, AppError> {
    // Check if AuthContext is present in extensions
    if req.extensions().get::<AuthContext>().is_none() {
        return Err(AppError::Unauthorized);
    }

    Ok(next.run(req).await)
}

/// Require admin role (per DEC-004=B: DB-backed roles)
pub async fn require_admin(req: Request, next: Next) -> Result<Response, AppError> {
    // Check if AuthContext is present and has admin role
    match req.extensions().get::<AuthContext>() {
        Some(auth) if auth.is_admin() => Ok(next.run(req).await),
        Some(_) => Err(AppError::Forbidden),
        None => Err(AppError::Unauthorized),
    }
}

/// Require specific entitlement
#[allow(dead_code)]
pub fn require_entitlement(
    entitlement: &'static str,
) -> impl Fn(
    Request,
    Next,
)
    -> std::pin::Pin<Box<dyn std::future::Future<Output = Result<Response, AppError>> + Send>>
       + Clone
       + Send
       + 'static {
    move |req: Request, next: Next| {
        Box::pin(async move {
            match req.extensions().get::<AuthContext>() {
                Some(auth) if auth.has_entitlement(entitlement) => Ok(next.run(req).await),
                Some(_) => Err(AppError::Forbidden),
                None => Err(AppError::Unauthorized),
            }
        })
    }
}

/// Extract session token from cookie header
fn extract_session_token(req: &Request) -> Option<String> {
    req.headers()
        .get(header::COOKIE)?
        .to_str()
        .ok()?
        .split(';')
        .find_map(|cookie| {
            let cookie = cookie.trim();
            if cookie.starts_with(SESSION_COOKIE_NAME) {
                cookie
                    .strip_prefix(&format!("{}=", SESSION_COOKIE_NAME))
                    .map(|s| s.to_string())
            } else {
                None
            }
        })
}

/// Create session cookie header value
/// Per copilot-instructions: Domain=ecent.online; SameSite=None; Secure; HttpOnly
pub fn create_session_cookie(token: &str, domain: &str, ttl_seconds: u64) -> String {
    format!(
        "{}={}; Domain={}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age={}",
        SESSION_COOKIE_NAME, token, domain, ttl_seconds
    )
}

/// Create logout cookie (expires immediately)
pub fn create_logout_cookie(domain: &str) -> String {
    format!(
        "{}=; Domain={}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=0",
        SESSION_COOKIE_NAME, domain
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_create_session_cookie() {
        let cookie = create_session_cookie("test_token", "ecent.online", 2592000);
        assert!(cookie.contains("session=test_token"));
        assert!(cookie.contains("Domain=ecent.online"));
        assert!(cookie.contains("HttpOnly"));
        assert!(cookie.contains("Secure"));
        assert!(cookie.contains("SameSite=None"));
        assert!(cookie.contains("Max-Age=2592000"));
    }

    #[test]
    fn test_create_logout_cookie() {
        let cookie = create_logout_cookie("ecent.online");
        assert!(cookie.contains("session="));
        assert!(cookie.contains("Max-Age=0"));
    }

    #[test]
    fn test_dev_bypass_rejected_in_production() {
        std::env::set_var("AUTH_DEV_BYPASS", "true");
        assert!(!DevBypassAuth::is_allowed(
            "production",
            Some("localhost:3000")
        ));
        std::env::remove_var("AUTH_DEV_BYPASS");
    }

    #[test]
    fn test_dev_bypass_rejected_for_non_localhost() {
        std::env::set_var("AUTH_DEV_BYPASS", "true");
        assert!(!DevBypassAuth::is_allowed(
            "development",
            Some("example.com")
        ));
        std::env::remove_var("AUTH_DEV_BYPASS");
    }

    #[test]
    fn test_dev_bypass_allowed_in_dev_localhost() {
        std::env::set_var("AUTH_DEV_BYPASS", "true");
        assert!(DevBypassAuth::is_allowed(
            "development",
            Some("localhost:3000")
        ));
        std::env::remove_var("AUTH_DEV_BYPASS");
    }

    #[test]
    fn test_auth_context_is_admin() {
        let ctx = AuthContext {
            user_id: Uuid::new_v4(),
            email: "test@example.com".to_string(),
            name: "Test".to_string(),
            role: "admin".to_string(),
            session_id: Uuid::new_v4(),
            entitlements: vec![],
            is_dev_bypass: false,
        };
        assert!(ctx.is_admin());

        let ctx2 = AuthContext {
            user_id: Uuid::new_v4(),
            email: "test@example.com".to_string(),
            name: "Test".to_string(),
            role: "user".to_string(),
            session_id: Uuid::new_v4(),
            entitlements: vec!["admin:access".to_string()],
            is_dev_bypass: false,
        };
        assert!(ctx2.is_admin());

        let ctx3 = AuthContext {
            user_id: Uuid::new_v4(),
            email: "test@example.com".to_string(),
            name: "Test".to_string(),
            role: "user".to_string(),
            session_id: Uuid::new_v4(),
            entitlements: vec![],
            is_dev_bypass: false,
        };
        assert!(!ctx3.is_admin());
    }
}
