use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// DAW project file record
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct DawProjectFile {
    pub id: Uuid,
    pub user_id: Uuid,
    pub project_name: String,
    pub file_path: String,
    pub file_size: i64,
    pub file_hash: String,    // SHA256 of encrypted content
    pub content_type: String, // .als, .flp, .logicx, .serum, etc
    pub storage_key: String,  // R2 key path
    pub encrypted: bool,
    pub current_version_id: Uuid,
    pub version_count: i32,
    pub last_modified_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Version history of a DAW project file
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct DawProjectVersion {
    pub id: Uuid,
    pub project_id: Uuid,
    pub user_id: Uuid,
    pub version_number: i32,
    pub file_size: i64,
    pub file_hash: String,
    pub storage_key: String,
    pub change_description: Option<String>,
    pub created_at: DateTime<Utc>,
}

/// Upload session for chunked uploads
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct UploadSession {
    pub id: Uuid,
    pub user_id: Uuid,
    pub project_name: String,
    pub content_type: String,
    pub total_size: i64,
    pub chunks_received: i32,
    pub total_chunks: i32,
    pub status: String, // pending, uploading, complete, failed
    pub storage_key: String,
    pub expires_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
}

/// Request to initiate chunked upload
#[derive(Debug, Deserialize)]
pub struct InitiateUploadRequest {
    pub project_name: String,
    pub content_type: String, // .als, .flp, .logicx, .serum, .wavetable
    pub total_size: i64,      // Total file size in bytes
    pub file_hash: String,    // SHA256 hash for resumability verification
}

/// Response after initiating upload
#[derive(Debug, Serialize)]
pub struct InitiateUploadResponse {
    pub session_id: Uuid,
    pub chunk_size: i64, // 5MB default
    pub total_chunks: i32,
    pub expires_at: DateTime<Utc>,
}

/// Request to upload a single chunk
#[derive(Debug)]
pub struct UploadChunkRequest {
    pub chunk_number: i32,
    pub chunk_data: Vec<u8>,
    pub chunk_hash: String, // SHA256 of chunk for integrity
}

/// Response after uploading chunk
#[derive(Debug, Serialize)]
pub struct UploadChunkResponse {
    pub chunk_number: i32,
    pub received_at: DateTime<Utc>,
    pub chunks_remaining: i32,
}

/// Request to complete upload
#[derive(Debug, Deserialize)]
pub struct CompleteUploadRequest {
    pub file_hash: String, // Final file hash verification
    pub change_description: Option<String>,
}

/// Response after completing upload
#[derive(Debug, Serialize)]
pub struct CompleteUploadResponse {
    pub project_id: Uuid,
    pub version_number: i32,
    pub file_size: i64,
    pub created_at: DateTime<Utc>,
}

/// Request to restore a previous version
#[derive(Debug, Deserialize)]
pub struct RestoreVersionRequest {
    pub version_id: Uuid,
    pub change_description: String,
}

/// Response when restoring version
#[derive(Debug, Serialize)]
pub struct RestoreVersionResponse {
    pub project_id: Uuid,
    pub current_version_number: i32,
    pub restored_at: DateTime<Utc>,
}

/// Response listing all projects
#[derive(Debug, Serialize)]
pub struct ListProjectsResponse {
    pub projects: Vec<DawProjectSummary>,
    pub total_count: i64,
    pub total_storage_bytes: i64,
}

/// Summary for project listing
#[derive(Debug, Serialize)]
pub struct DawProjectSummary {
    pub id: Uuid,
    pub project_name: String,
    pub content_type: String,
    pub current_version: i32,
    pub total_versions: i32,
    pub file_size: i64,
    pub last_modified_at: DateTime<Utc>,
}

/// Response listing project versions
#[derive(Debug, Serialize)]
pub struct ListVersionsResponse {
    pub project_id: Uuid,
    pub project_name: String,
    pub versions: Vec<VersionSummary>,
    pub total_count: i32,
}

/// Summary for version listing
#[derive(Debug, Serialize)]
pub struct VersionSummary {
    pub version_id: Uuid,
    pub version_number: i32,
    pub file_size: i64,
    pub change_description: Option<String>,
    pub is_current: bool,
    pub created_at: DateTime<Utc>,
}

/// Response for download metadata
#[derive(Debug, Serialize)]
pub struct DownloadMetadata {
    pub project_id: Uuid,
    pub project_name: String,
    pub content_type: String,
    pub file_size: i64,
    pub version_number: i32,
    pub download_url: String, // Presigned R2 URL (expires in 15 mins)
    pub expires_at: DateTime<Utc>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_daw_project_serialization() {
        let project = DawProjectFile {
            id: Uuid::new_v4(),
            user_id: Uuid::new_v4(),
            project_name: "My Song".to_string(),
            file_path: "/projects/my-song.als".to_string(),
            file_size: 5_000_000,
            file_hash: "abc123".to_string(),
            content_type: ".als".to_string(),
            storage_key: "user/projects/abc123".to_string(),
            encrypted: true,
            current_version_id: Uuid::new_v4(),
            version_count: 1,
            last_modified_at: Utc::now(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };

        let json = serde_json::to_string(&project).expect("serialization failed");
        assert!(json.contains("My Song"));
    }
}
