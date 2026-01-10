//! Inbox models
//!
//! Models for user inbox (quick capture notes).

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

// ============================================================================
// DATABASE MODELS
// ============================================================================

/// Inbox item database model
#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct InboxItem {
    pub id: Uuid,
    pub user_id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub tags: Option<Vec<String>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

/// Create inbox item request
#[derive(Debug, Deserialize)]
pub struct CreateInboxRequest {
    pub title: String,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub tags: Option<Vec<String>>,
}

/// Update inbox item request
#[derive(Debug, Deserialize)]
pub struct UpdateInboxRequest {
    pub title: Option<String>,
    pub description: Option<String>,
    pub tags: Option<Vec<String>>,
}

/// Inbox item response
#[derive(Debug, Serialize)]
pub struct InboxResponse {
    pub id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub tags: Option<Vec<String>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl From<InboxItem> for InboxResponse {
    fn from(item: InboxItem) -> Self {
        InboxResponse {
            id: item.id,
            title: item.title,
            description: item.description,
            tags: item.tags,
            created_at: item.created_at,
            updated_at: item.updated_at,
        }
    }
}

/// Inbox list response
#[derive(Debug, Serialize)]
pub struct InboxListResponse {
    pub items: Vec<InboxResponse>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}

/// Delete response
#[derive(Debug, Serialize)]
pub struct DeleteInboxResponse {
    pub success: bool,
    pub id: Uuid,
}
