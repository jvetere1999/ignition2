//! User references library models
//!
//! Models for user reference library organization.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

// ============================================================================
// DATABASE MODELS
// ============================================================================

/// Reference item database model
#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct UserReference {
    pub id: Uuid,
    pub user_id: Uuid,
    pub title: String,
    pub content: Option<String>,
    pub url: Option<String>,
    pub category: Option<String>,
    pub tags: Option<Vec<String>>,
    pub is_pinned: bool,
    pub is_archived: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

/// Create reference request
#[derive(Debug, Deserialize)]
pub struct CreateReferenceRequest {
    pub title: String,
    #[serde(default)]
    pub content: Option<String>,
    #[serde(default)]
    pub url: Option<String>,
    #[serde(default)]
    pub category: Option<String>,
    #[serde(default)]
    pub tags: Option<Vec<String>>,
}

/// Update reference request
#[derive(Debug, Deserialize)]
pub struct UpdateReferenceRequest {
    pub title: Option<String>,
    pub content: Option<String>,
    pub url: Option<String>,
    pub category: Option<String>,
    pub tags: Option<Vec<String>>,
    pub is_pinned: Option<bool>,
    pub is_archived: Option<bool>,
}

/// Reference response
#[derive(Debug, Serialize)]
pub struct ReferenceResponse {
    pub id: Uuid,
    pub title: String,
    pub content: Option<String>,
    pub url: Option<String>,
    pub category: Option<String>,
    pub tags: Option<Vec<String>>,
    pub is_pinned: bool,
    pub is_archived: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl From<UserReference> for ReferenceResponse {
    fn from(r: UserReference) -> Self {
        ReferenceResponse {
            id: r.id,
            title: r.title,
            content: r.content,
            url: r.url,
            category: r.category,
            tags: r.tags,
            is_pinned: r.is_pinned,
            is_archived: r.is_archived,
            created_at: r.created_at,
            updated_at: r.updated_at,
        }
    }
}

/// References list response
#[derive(Debug, Serialize)]
pub struct ReferencesListResponse {
    pub items: Vec<ReferenceResponse>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}

/// Delete response
#[derive(Debug, Serialize)]
pub struct DeleteReferenceResponse {
    pub success: bool,
    pub id: Uuid,
}
