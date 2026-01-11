//! Authentication service
//!
//! Handles user authentication, session management, and account linking.

use chrono::Utc;
use sqlx::PgPool;
use uuid::Uuid;

use crate::db::{
    models::{AuditLogEntry, CreateSessionInput, CreateUserInput, OAuthUserInfo, Session, User},
    repos::{AccountRepo, AuditLogRepo, RbacRepo, SessionRepo, UserRepo},
};
use crate::error::AppError;

/// Authentication service
pub struct AuthService;

impl AuthService {
    /// Authenticate user via OAuth and create session
    ///
    /// Account linking policy (per auth_inventory.md):
    /// - If account exists: link to existing user
    /// - If email exists but no account: link new provider to existing user
    /// - If neither: create new user and account
    pub async fn authenticate_oauth(
        pool: &PgPool,
        oauth_info: OAuthUserInfo,
        user_agent: Option<String>,
        ip_address: Option<String>,
        session_ttl_days: i64,
    ) -> Result<(User, Session), AppError> {
        let provider = oauth_info.provider.as_str();

        // 1. Check if OAuth account already exists
        if let Some(account) =
            AccountRepo::find_by_provider(pool, provider, &oauth_info.provider_account_id).await?
        {
            // Account exists, get user and create session
            let user = UserRepo::find_by_id(pool, account.user_id)
                .await?
                .ok_or_else(|| {
                    AppError::Database("User not found for existing account".to_string())
                })?;

            let session = SessionRepo::create(
                pool,
                CreateSessionInput {
                    user_id: user.id,
                    user_agent,
                    ip_address: ip_address.clone(),
                },
                session_ttl_days,
            )
            .await?;

            // Log successful login
            AuditLogRepo::log(
                pool,
                AuditLogEntry {
                    user_id: Some(user.id),
                    session_id: Some(session.id),
                    event_type: "login".to_string(),
                    resource_type: Some("session".to_string()),
                    resource_id: Some(session.id),
                    action: "create".to_string(),
                    status: "success".to_string(),
                    details: Some(serde_json::json!({
                        "provider": provider,
                        "account_linked": true
                    })),
                    ip_address,
                    user_agent: None,
                    request_id: None,
                },
            )
            .await?;

            return Ok((user, session));
        }

        // 2. Check if user exists by email (account linking)
        let user =
            if let Some(existing_user) = UserRepo::find_by_email(pool, &oauth_info.email).await? {
                // User exists, link new OAuth provider
                AccountRepo::upsert(
                    pool,
                    existing_user.id,
                    provider,
                    &oauth_info.provider_account_id,
                    None, // access_token
                    None, // refresh_token
                    None, // expires_at
                    None, // id_token
                )
                .await?;

                // Log account link
                AuditLogRepo::log(
                    pool,
                    AuditLogEntry {
                        user_id: Some(existing_user.id),
                        session_id: None,
                        event_type: "account_linked".to_string(),
                        resource_type: Some("account".to_string()),
                        resource_id: None,
                        action: "create".to_string(),
                        status: "success".to_string(),
                        details: Some(serde_json::json!({
                            "provider": provider,
                            "email": oauth_info.email
                        })),
                        ip_address: ip_address.clone(),
                        user_agent: None,
                        request_id: None,
                    },
                )
                .await?;

                existing_user
            } else {
                // 3. Create new user
                let new_user = UserRepo::create(
                    pool,
                    CreateUserInput {
                        email: oauth_info.email.clone(),
                        name: oauth_info.name.unwrap_or_else(|| "User".to_string()),
                        image: oauth_info.image,
                        email_verified: if oauth_info.email_verified {
                            Some(Utc::now())
                        } else {
                            None
                        },
                    },
                )
                .await?;

                // Create OAuth account link
                AccountRepo::upsert(
                    pool,
                    new_user.id,
                    provider,
                    &oauth_info.provider_account_id,
                    None,
                    None,
                    None,
                    None,
                )
                .await?;

                // Assign default 'user' role
                RbacRepo::assign_role(pool, new_user.id, "user", None).await?;

                // Log user creation
                AuditLogRepo::log(
                    pool,
                    AuditLogEntry {
                        user_id: Some(new_user.id),
                        session_id: None,
                        event_type: "user_created".to_string(),
                        resource_type: Some("user".to_string()),
                        resource_id: Some(new_user.id),
                        action: "create".to_string(),
                        status: "success".to_string(),
                        details: Some(serde_json::json!({
                            "provider": provider,
                            "email": oauth_info.email
                        })),
                        ip_address: ip_address.clone(),
                        user_agent: None,
                        request_id: None,
                    },
                )
                .await?;

                new_user
            };

        // Create session for user
        let session = SessionRepo::create(
            pool,
            CreateSessionInput {
                user_id: user.id,
                user_agent,
                ip_address: ip_address.clone(),
            },
            session_ttl_days,
        )
        .await?;

        // Log login
        AuditLogRepo::log(
            pool,
            AuditLogEntry {
                user_id: Some(user.id),
                session_id: Some(session.id),
                event_type: "login".to_string(),
                resource_type: Some("session".to_string()),
                resource_id: Some(session.id),
                action: "create".to_string(),
                status: "success".to_string(),
                details: Some(serde_json::json!({
                    "provider": provider,
                    "new_user": true
                })),
                ip_address,
                user_agent: None,
                request_id: None,
            },
        )
        .await?;

        Ok((user, session))
    }

    /// Logout - delete session
    pub async fn logout(
        pool: &PgPool,
        session_id: Uuid,
        user_id: Uuid,
        ip_address: Option<String>,
    ) -> Result<(), AppError> {
        SessionRepo::delete(pool, session_id).await?;

        // Log logout
        AuditLogRepo::log(
            pool,
            AuditLogEntry {
                user_id: Some(user_id),
                session_id: Some(session_id),
                event_type: "logout".to_string(),
                resource_type: Some("session".to_string()),
                resource_id: Some(session_id),
                action: "delete".to_string(),
                status: "success".to_string(),
                details: None,
                ip_address,
                user_agent: None,
                request_id: None,
            },
        )
        .await?;

        Ok(())
    }

    /// Rotate session token (for session fixation prevention)
    pub async fn rotate_session(
        pool: &PgPool,
        session_id: Uuid,
        user_id: Uuid,
        reason: &str,
    ) -> Result<Session, AppError> {
        let new_session = SessionRepo::rotate(pool, session_id).await?;

        // Log session rotation
        AuditLogRepo::log(
            pool,
            AuditLogEntry {
                user_id: Some(user_id),
                session_id: Some(new_session.id),
                event_type: "session_rotated".to_string(),
                resource_type: Some("session".to_string()),
                resource_id: Some(new_session.id),
                action: "update".to_string(),
                status: "success".to_string(),
                details: Some(serde_json::json!({
                    "reason": reason,
                    "previous_session": session_id
                })),
                ip_address: None,
                user_agent: None,
                request_id: None,
            },
        )
        .await?;

        Ok(new_session)
    }
}

/// Dev bypass authentication (for local development only)
pub struct DevBypassAuth;

impl DevBypassAuth {
    /// Check if dev bypass is allowed
    pub fn is_allowed(environment: &str, host: Option<&str>) -> bool {
        let bypass_enabled = std::env::var("AUTH_DEV_BYPASS")
            .map(|v| v == "true")
            .unwrap_or(false);

        if !bypass_enabled {
            return false;
        }

        // MUST be development environment
        if environment != "development" {
            tracing::warn!(
                "AUTH_DEV_BYPASS set in non-development environment ({}) - rejecting",
                environment
            );
            return false;
        }

        // MUST be localhost
        let is_localhost = host
            .map(|h| h.starts_with("localhost") || h.starts_with("127.0.0.1"))
            .unwrap_or(false);

        if !is_localhost {
            tracing::warn!(
                "AUTH_DEV_BYPASS set for non-localhost host ({:?}) - rejecting",
                host
            );
            return false;
        }

        true
    }

    /// Get dev bypass user info
    pub fn get_dev_user() -> (Uuid, String, String, String) {
        (
            Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap(),
            "dev@localhost".to_string(),
            "Local Dev User".to_string(),
            "admin".to_string(), // Admin for full access during dev
        )
    }
}
