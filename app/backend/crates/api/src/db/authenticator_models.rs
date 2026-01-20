//! WebAuthn Authenticator Models
//!
//! Database models for storing WebAuthn credentials (passkeys).

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

/// WebAuthn authenticator stored in database
#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct AuthenticatorRow {
    pub id: Uuid,
    pub user_id: Uuid,
    pub credential_id: String,
    pub provider_account_id: String,
    pub credential_public_key: Vec<u8>,
    pub counter: i64,
    pub credential_device_type: String,
    pub credential_backed_up: bool,
    pub transports: Option<String>, // JSON array
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateAuthenticatorInput {
    pub user_id: Uuid,
    pub credential_id: String,
    pub provider_account_id: String,
    pub credential_public_key: Vec<u8>,
    pub credential_device_type: String,
    pub credential_backed_up: bool,
    pub transports: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthenticatorInfo {
    pub id: Uuid,
    pub credential_id: String,
    pub device_type: String,
    pub backed_up: bool,
    pub created_at: DateTime<Utc>,
}

impl From<AuthenticatorRow> for AuthenticatorInfo {
    fn from(row: AuthenticatorRow) -> Self {
        Self {
            id: row.id,
            credential_id: row.credential_id,
            device_type: row.credential_device_type,
            backed_up: row.credential_backed_up,
            created_at: row.created_at,
        }
    }
}
