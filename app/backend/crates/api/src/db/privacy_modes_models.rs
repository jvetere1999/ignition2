use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

/// Privacy mode for user content
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, sqlx::Type)]
#[sqlx(type_name = "privacy_mode", rename_all = "lowercase")]
pub enum PrivacyMode {
    /// Standard mode: Normal logging, full retention, visible in analytics
    #[serde(rename = "standard")]
    Standard,
    /// Private mode: Minimal logging, shorter retention, excluded from analytics
    #[serde(rename = "private")]
    Private,
}

impl PrivacyMode {
    pub fn as_str(&self) -> &'static str {
        match self {
            PrivacyMode::Standard => "standard",
            PrivacyMode::Private => "private",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "standard" => Some(PrivacyMode::Standard),
            "private" => Some(PrivacyMode::Private),
            _ => None,
        }
    }
}

/// Privacy preferences for user
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct PrivacyPreferences {
    pub id: uuid::Uuid,
    pub user_id: uuid::Uuid,
    /// Default privacy mode for new content
    pub default_mode: String, // "standard" or "private"
    /// Whether to show privacy toggle in UI
    pub show_privacy_toggle: bool,
    /// Whether private content is excluded from search
    pub exclude_private_from_search: bool,
    /// Retention days for private content (0 = no retention)
    pub private_content_retention_days: i32,
    /// Retention days for standard content
    pub standard_content_retention_days: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Request to update privacy preferences
#[derive(Debug, Deserialize)]
pub struct UpdatePrivacyPreferencesRequest {
    pub default_mode: Option<String>,
    pub show_privacy_toggle: Option<bool>,
    pub exclude_private_from_search: Option<bool>,
    pub private_content_retention_days: Option<i32>,
}

/// Response with privacy preferences
#[derive(Debug, Serialize)]
pub struct PrivacyPreferencesResponse {
    pub default_mode: String,
    pub show_privacy_toggle: bool,
    pub exclude_private_from_search: bool,
    pub private_content_retention_days: i32,
    pub standard_content_retention_days: i32,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct PrivacyMetadata {
    pub mode: PrivacyMode,
    pub created_at: DateTime<Utc>,
}
