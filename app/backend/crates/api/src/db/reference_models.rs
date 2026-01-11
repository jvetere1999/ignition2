//! Reference tracks database models
//!
//! Models for the Critical Listening domain: tracks, analyses, annotations, regions.

#![allow(dead_code)]

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

/// Reference track status
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[serde(rename_all = "lowercase")]
#[sqlx(type_name = "text", rename_all = "lowercase")]
pub enum TrackStatus {
    Uploading,
    Processing,
    Ready,
    Error,
}

impl Default for TrackStatus {
    fn default() -> Self {
        Self::Ready
    }
}

impl std::fmt::Display for TrackStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            TrackStatus::Uploading => write!(f, "uploading"),
            TrackStatus::Processing => write!(f, "processing"),
            TrackStatus::Ready => write!(f, "ready"),
            TrackStatus::Error => write!(f, "error"),
        }
    }
}

/// Analysis status
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[serde(rename_all = "lowercase")]
#[sqlx(type_name = "text", rename_all = "lowercase")]
pub enum AnalysisStatus {
    Pending,
    Running,
    Completed,
    Failed,
}

impl Default for AnalysisStatus {
    fn default() -> Self {
        Self::Pending
    }
}

/// Analysis type
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[serde(rename_all = "lowercase")]
#[sqlx(type_name = "text", rename_all = "lowercase")]
#[allow(dead_code)]
pub enum AnalysisType {
    Full,
    Quick,
    Spectral,
    Loudness,
}

impl Default for AnalysisType {
    fn default() -> Self {
        Self::Full
    }
}

/// Annotation category
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[serde(rename_all = "lowercase")]
#[sqlx(type_name = "text", rename_all = "lowercase")]
pub enum AnnotationCategory {
    General,
    Technique,
    Mix,
    Mastering,
    Arrangement,
    Production,
}

impl Default for AnnotationCategory {
    fn default() -> Self {
        Self::General
    }
}

/// Section type for regions
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[serde(rename_all = "lowercase")]
#[sqlx(type_name = "text", rename_all = "lowercase")]
pub enum SectionType {
    Intro,
    Verse,
    Chorus,
    Bridge,
    Breakdown,
    Buildup,
    Drop,
    Outro,
    Custom,
}

impl Default for SectionType {
    fn default() -> Self {
        Self::Custom
    }
}

/// Reference track database model
/// Schema from migration 0012_reference.sql
#[derive(Debug, Clone, FromRow, Serialize)]
pub struct ReferenceTrack {
    pub id: Uuid,
    pub user_id: Uuid,
    pub title: String,
    pub artist: Option<String>,
    pub album: Option<String>,
    pub genre: Option<String>,
    pub bpm: Option<f32>,
    pub key: Option<String>,
    pub duration_seconds: Option<f32>,
    pub r2_key: String,
    pub waveform_r2_key: Option<String>,
    pub thumbnail_r2_key: Option<String>,
    pub file_format: Option<String>,
    pub sample_rate: Option<i32>,
    pub bit_depth: Option<i32>,
    pub channels: Option<i32>,
    pub is_reference: bool,
    pub is_user_upload: bool,
    pub source: Option<String>,
    pub source_url: Option<String>,
    pub metadata: Option<serde_json::Value>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Track analysis database model
/// Schema from migration 0012_reference.sql
#[derive(Debug, Clone, FromRow, Serialize)]
pub struct TrackAnalysis {
    pub id: Uuid,
    pub track_id: Uuid,
    pub analysis_type: String,
    pub status: String,
    pub parameters: Option<serde_json::Value>,
    pub results: Option<serde_json::Value>,
    pub error_message: Option<String>,
    pub started_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

/// Track annotation database model
/// Schema from migration 0012_reference.sql
#[derive(Debug, Clone, FromRow, Serialize)]
pub struct TrackAnnotation {
    pub id: Uuid,
    pub track_id: Uuid,
    pub user_id: Uuid,
    pub start_time_seconds: f32,
    pub end_time_seconds: Option<f32>,
    pub annotation_type: String,
    pub title: Option<String>,
    pub content: Option<String>,
    pub color: Option<String>,
    pub tags: Option<Vec<String>>,
    pub is_private: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Track region database model
/// Schema from migration 0012_reference.sql
#[derive(Debug, Clone, FromRow, Serialize)]
pub struct TrackRegion {
    pub id: Uuid,
    pub track_id: Uuid,
    pub user_id: Uuid,
    pub name: String,
    pub start_time_seconds: f32,
    pub end_time_seconds: f32,
    pub color: Option<String>,
    pub region_type: Option<String>,
    pub notes: Option<String>,
    pub loop_count: i32,
    pub is_favorite: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

// =============================================================================
// Input types for creating/updating
// =============================================================================

/// Input for creating a reference track
/// Aligned with migration 0012_reference.sql
#[derive(Debug, Clone, Deserialize)]
pub struct CreateTrackInput {
    pub title: String,
    pub r2_key: String,
    pub artist: Option<String>,
    pub album: Option<String>,
    pub genre: Option<String>,
    pub bpm: Option<f32>,
    pub key: Option<String>,
    pub duration_seconds: Option<f32>,
    pub waveform_r2_key: Option<String>,
    pub thumbnail_r2_key: Option<String>,
    pub file_format: Option<String>,
    pub sample_rate: Option<i32>,
    pub bit_depth: Option<i32>,
    pub channels: Option<i32>,
    pub is_reference: Option<bool>,
    pub is_user_upload: Option<bool>,
    pub source: Option<String>,
    pub source_url: Option<String>,
    pub metadata: Option<serde_json::Value>,
}

/// Input for updating a reference track
/// Aligned with migration 0012_reference.sql
#[derive(Debug, Clone, Deserialize)]
pub struct UpdateTrackInput {
    pub title: Option<String>,
    pub artist: Option<String>,
    pub album: Option<String>,
    pub genre: Option<String>,
    pub bpm: Option<f32>,
    pub key: Option<String>,
    pub duration_seconds: Option<f32>,
    pub waveform_r2_key: Option<String>,
    pub thumbnail_r2_key: Option<String>,
    pub file_format: Option<String>,
    pub sample_rate: Option<i32>,
    pub bit_depth: Option<i32>,
    pub channels: Option<i32>,
    pub is_reference: Option<bool>,
    pub source: Option<String>,
    pub source_url: Option<String>,
    pub metadata: Option<serde_json::Value>,
}

/// Input for creating an annotation
/// Aligned with migration 0012_reference.sql - uses seconds not milliseconds
#[derive(Debug, Clone, Deserialize)]
pub struct CreateAnnotationInput {
    pub start_time_seconds: f32,
    pub end_time_seconds: Option<f32>,
    pub annotation_type: String,
    pub title: Option<String>,
    pub content: Option<String>,
    pub color: Option<String>,
    pub tags: Option<Vec<String>>,
    pub is_private: Option<bool>,
}

/// Input for updating an annotation
/// Aligned with migration 0012_reference.sql
#[derive(Debug, Clone, Deserialize)]
pub struct UpdateAnnotationInput {
    pub start_time_seconds: Option<f32>,
    pub end_time_seconds: Option<f32>,
    pub annotation_type: Option<String>,
    pub title: Option<String>,
    pub content: Option<String>,
    pub color: Option<String>,
    pub tags: Option<Vec<String>>,
    pub is_private: Option<bool>,
}

/// Input for creating a region
/// Aligned with migration 0012_reference.sql - uses seconds not milliseconds
#[derive(Debug, Clone, Deserialize)]
pub struct CreateRegionInput {
    pub name: String,
    pub start_time_seconds: f32,
    pub end_time_seconds: f32,
    pub color: Option<String>,
    pub region_type: Option<String>,
    pub notes: Option<String>,
    pub is_favorite: Option<bool>,
}

/// Input for updating a region
/// Aligned with migration 0012_reference.sql
#[derive(Debug, Clone, Deserialize)]
pub struct UpdateRegionInput {
    pub name: Option<String>,
    pub start_time_seconds: Option<f32>,
    pub end_time_seconds: Option<f32>,
    pub color: Option<String>,
    pub region_type: Option<String>,
    pub notes: Option<String>,
    pub loop_count: Option<i32>,
    pub is_favorite: Option<bool>,
}

/// Input for starting an analysis
#[derive(Debug, Clone, Deserialize)]
#[allow(dead_code)]
pub struct StartAnalysisInput {
    pub analysis_type: Option<String>,
}

// =============================================================================
// Response types
// =============================================================================

/// Track with summary information
#[derive(Debug, Clone, Serialize)]
#[allow(dead_code)]
pub struct TrackWithSummary {
    #[serde(flatten)]
    pub track: ReferenceTrack,
    pub annotation_count: i64,
    pub region_count: i64,
    pub has_analysis: bool,
    pub latest_analysis: Option<AnalysisSummary>,
}

/// Analysis summary (without full results)
/// Aligned with migration 0012_reference.sql
#[derive(Debug, Clone, Serialize)]
pub struct AnalysisSummary {
    pub id: Uuid,
    pub analysis_type: String,
    pub status: String,
    pub parameters: Option<serde_json::Value>,
    pub completed_at: Option<DateTime<Utc>>,
}

/// Paginated list response
#[derive(Debug, Clone, Serialize)]
pub struct PaginatedResponse<T> {
    pub data: Vec<T>,
    pub total: i64,
    pub page: i32,
    pub page_size: i32,
    pub has_next: bool,
    pub has_prev: bool,
}

impl<T> PaginatedResponse<T> {
    pub fn new(data: Vec<T>, total: i64, page: i32, page_size: i32) -> Self {
        let total_pages = ((total as f64) / (page_size as f64)).ceil() as i32;
        Self {
            data,
            total,
            page,
            page_size,
            has_next: page < total_pages,
            has_prev: page > 1,
        }
    }
}
