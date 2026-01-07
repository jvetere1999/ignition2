//! Database models for auth/user/session

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

/// User database model
#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct User {
    pub id: Uuid,
    pub name: String,
    pub email: String,
    pub email_verified: Option<DateTime<Utc>>,
    pub image: Option<String>,
    pub role: String,
    pub approved: bool,
    pub age_verified: bool,
    pub tos_accepted: bool,
    pub tos_accepted_at: Option<DateTime<Utc>>,
    pub tos_version: Option<String>,
    pub last_activity_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// User role enum
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
#[allow(dead_code)]
pub enum UserRole {
    User,
    Moderator,
    Admin,
}

#[allow(dead_code)]
impl UserRole {
    pub fn as_str(&self) -> &'static str {
        match self {
            UserRole::User => "user",
            UserRole::Moderator => "moderator",
            UserRole::Admin => "admin",
        }
    }
}

impl std::str::FromStr for UserRole {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "user" => Ok(UserRole::User),
            "moderator" => Ok(UserRole::Moderator),
            "admin" => Ok(UserRole::Admin),
            _ => Err(format!("Unknown role: {}", s)),
        }
    }
}

impl std::fmt::Display for UserRole {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.as_str())
    }
}

/// OAuth account database model
#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct Account {
    pub id: Uuid,
    pub user_id: Uuid,
    #[sqlx(rename = "type")]
    pub account_type: String,
    pub provider: String,
    pub provider_account_id: String,
    pub refresh_token: Option<String>,
    pub access_token: Option<String>,
    pub expires_at: Option<i64>,
    pub token_type: Option<String>,
    pub scope: Option<String>,
    pub id_token: Option<String>,
    pub session_state: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Session database model
#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct Session {
    pub id: Uuid,
    pub user_id: Uuid,
    pub token: String,
    pub expires_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
    pub last_activity_at: DateTime<Utc>,
    pub user_agent: Option<String>,
    pub ip_address: Option<String>,
    pub rotated_from: Option<Uuid>,
}

/// User with roles (from view)
#[derive(Debug, Clone, FromRow, Serialize)]
#[allow(dead_code)]
pub struct UserWithRoles {
    pub id: Uuid,
    pub email: String,
    pub name: String,
    pub legacy_role: String,
    pub approved: bool,
    pub age_verified: bool,
    pub tos_accepted: bool,
    pub roles: Option<Vec<String>>,
    pub entitlements: Option<Vec<String>>,
}

/// Entitlement check result
#[derive(Debug, Clone)]
#[allow(dead_code)]
pub struct EntitlementCheck {
    pub user_id: Uuid,
    pub entitlement: String,
    pub granted: bool,
}

/// OAuth provider types
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum OAuthProvider {
    Google,
    Azure,
}

impl OAuthProvider {
    pub fn as_str(&self) -> &'static str {
        match self {
            OAuthProvider::Google => "google",
            OAuthProvider::Azure => "azure-ad",
        }
    }
}

impl std::str::FromStr for OAuthProvider {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "google" => Ok(OAuthProvider::Google),
            "azure" | "azure-ad" | "microsoft" => Ok(OAuthProvider::Azure),
            _ => Err(format!("Unknown OAuth provider: {}", s)),
        }
    }
}

/// OAuth user info from provider
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OAuthUserInfo {
    pub provider: OAuthProvider,
    pub provider_account_id: String,
    pub email: String,
    pub name: Option<String>,
    pub image: Option<String>,
    pub email_verified: bool,
}

/// Create user input
#[derive(Debug, Clone)]
pub struct CreateUserInput {
    pub email: String,
    pub name: String,
    pub image: Option<String>,
    pub email_verified: Option<DateTime<Utc>>,
}

/// Create session input
#[derive(Debug, Clone)]
pub struct CreateSessionInput {
    pub user_id: Uuid,
    pub user_agent: Option<String>,
    pub ip_address: Option<String>,
}

/// Audit log entry for security events
#[derive(Debug, Clone, Serialize)]
pub struct AuditLogEntry {
    pub user_id: Option<Uuid>,
    pub session_id: Option<Uuid>,
    pub event_type: String,
    pub resource_type: Option<String>,
    pub resource_id: Option<String>,
    pub action: String,
    pub status: String,
    pub details: Option<serde_json::Value>,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
    pub request_id: Option<String>,
}
