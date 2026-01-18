//! Storage types and constants
//!
//! Types for R2/S3 blob storage operations.

use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Blob categories for organization
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum BlobCategory {
    Audio,
    Images,
    Exports,
    Other,
}

impl BlobCategory {
    pub fn as_str(&self) -> &'static str {
        match self {
            BlobCategory::Audio => "audio",
            BlobCategory::Images => "images",
            BlobCategory::Exports => "exports",
            BlobCategory::Other => "other",
        }
    }

    pub fn from_mime_type(mime: &str) -> Self {
        if mime.starts_with("audio/") {
            BlobCategory::Audio
        } else if mime.starts_with("image/") {
            BlobCategory::Images
        } else if mime == "application/zip" || mime == "application/x-zip-compressed" {
            BlobCategory::Exports
        } else {
            BlobCategory::Other
        }
    }
}

impl std::fmt::Display for BlobCategory {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.as_str())
    }
}

impl std::str::FromStr for BlobCategory {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "audio" => Ok(BlobCategory::Audio),
            "images" => Ok(BlobCategory::Images),
            "exports" => Ok(BlobCategory::Exports),
            "other" => Ok(BlobCategory::Other),
            _ => Err(format!("Unknown category: {}", s)),
        }
    }
}

/// Allowed MIME types for uploads
pub const ALLOWED_MIME_TYPES: &[&str] = &[
    // Audio
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/wave",
    "audio/x-wav",
    "audio/ogg",
    "audio/flac",
    "audio/aac",
    "audio/m4a",
    "audio/x-m4a",
    // Images
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",
    // Documents
    "application/pdf",
    "application/json",
    "text/plain",
    // Archives
    "application/zip",
    "application/x-zip-compressed",
];

/// File size limits in bytes
pub const MAX_FILE_SIZE: u64 = 100 * 1024 * 1024; // 100 MB
pub const MAX_AUDIO_SIZE: u64 = 50 * 1024 * 1024; // 50 MB
pub const MAX_IMAGE_SIZE: u64 = 10 * 1024 * 1024; // 10 MB

/// Signed URL expiration in seconds
pub const SIGNED_URL_EXPIRY_SECONDS: u64 = 3600; // 1 hour for downloads
pub const SIGNED_UPLOAD_URL_EXPIRY_SECONDS: u64 = 300; // 5 minutes for uploads

/// Check if MIME type is allowed
pub fn is_allowed_mime_type(mime: &str) -> bool {
    ALLOWED_MIME_TYPES.contains(&mime)
}

/// Get max file size for a MIME type
pub fn get_max_size_for_mime(mime: &str) -> u64 {
    if mime.starts_with("audio/") {
        MAX_AUDIO_SIZE
    } else if mime.starts_with("image/") {
        MAX_IMAGE_SIZE
    } else {
        MAX_FILE_SIZE
    }
}

/// Validate file size for a given MIME type
pub fn validate_file_size(size: u64, mime: &str) -> Result<(), String> {
    let max_size = get_max_size_for_mime(mime);
    if size > max_size {
        Err(format!(
            "File size {} exceeds maximum {} for type {}",
            size, max_size, mime
        ))
    } else {
        Ok(())
    }
}

/// Blob metadata stored in R2 custom metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlobMetadata {
    pub user_id: Uuid,
    pub filename: String,
    pub uploaded_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub custom: Option<serde_json::Value>,
}

/// Upload request
#[derive(Debug, Clone)]
pub struct UploadRequest {
    pub user_id: Uuid,
    pub filename: String,
    pub mime_type: String,
    pub data: Vec<u8>,
    pub metadata: Option<serde_json::Value>,
}

/// Upload response
#[derive(Debug, Clone, Serialize)]
pub struct UploadResponse {
    pub id: Uuid,
    pub key: String,
    pub size_bytes: u64,
    pub mime_type: String,
    pub category: BlobCategory,
}

/// Blob info (without content)
#[derive(Debug, Clone, Serialize)]
pub struct BlobInfo {
    pub id: Uuid,
    pub key: String,
    pub size_bytes: u64,
    pub mime_type: String,
    pub category: BlobCategory,
    pub filename: String,
    pub uploaded_at: String,
    pub etag: Option<String>,
}

/// Signed URL response
#[derive(Debug, Clone, Serialize)]
pub struct SignedUrlResponse {
    pub url: String,
    pub expires_at: String,
    pub method: String,
    /// The R2/S3 key (for upload URLs, this is the key to store in DB)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub key: Option<String>,
}

/// Parsed blob key components
#[derive(Debug, Clone)]
#[allow(dead_code)]
pub struct ParsedBlobKey {
    pub user_id: String,
    pub category: BlobCategory,
    pub blob_id: Uuid,
    pub extension: String,
}

/// Generate a blob key from components
pub fn generate_blob_key(
    user_id: &Uuid,
    category: BlobCategory,
    extension: &str,
) -> (Uuid, String) {
    let blob_id = Uuid::new_v4();
    let key = format!(
        "{}/{}/{}.{}",
        user_id,
        category.as_str(),
        blob_id,
        extension
    );
    (blob_id, key)
}

/// Parse a blob key into components
pub fn parse_blob_key(key: &str) -> Option<ParsedBlobKey> {
    let parts: Vec<&str> = key.split('/').collect();
    if parts.len() != 3 {
        return None;
    }

    let user_id = parts[0].to_string();
    let category: BlobCategory = parts[1].parse().ok()?;

    // Parse "uuid.ext" from last part
    let file_part = parts[2];
    let dot_pos = file_part.rfind('.')?;
    let blob_id: Uuid = file_part[..dot_pos].parse().ok()?;
    let extension = file_part[dot_pos + 1..].to_string();

    Some(ParsedBlobKey {
        user_id,
        category,
        blob_id,
        extension,
    })
}

/// Get file extension from MIME type
pub fn get_extension_from_mime(mime: &str) -> &'static str {
    match mime {
        // Audio
        "audio/mpeg" | "audio/mp3" => "mp3",
        "audio/wav" | "audio/wave" | "audio/x-wav" => "wav",
        "audio/ogg" => "ogg",
        "audio/flac" => "flac",
        "audio/aac" => "aac",
        "audio/m4a" | "audio/x-m4a" => "m4a",
        // Images
        "image/jpeg" => "jpg",
        "image/png" => "png",
        "image/gif" => "gif",
        "image/webp" => "webp",
        "image/svg+xml" => "svg",
        // Documents
        "application/pdf" => "pdf",
        "application/json" => "json",
        "text/plain" => "txt",
        // Archives
        "application/zip" | "application/x-zip-compressed" => "zip",
        // Default
        _ => "bin",
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_category_from_mime() {
        assert_eq!(
            BlobCategory::from_mime_type("audio/mpeg"),
            BlobCategory::Audio
        );
        assert_eq!(
            BlobCategory::from_mime_type("image/png"),
            BlobCategory::Images
        );
        assert_eq!(
            BlobCategory::from_mime_type("application/zip"),
            BlobCategory::Exports
        );
        assert_eq!(
            BlobCategory::from_mime_type("text/plain"),
            BlobCategory::Other
        );
    }

    #[test]
    fn test_allowed_mime_types() {
        assert!(is_allowed_mime_type("audio/mpeg"));
        assert!(is_allowed_mime_type("image/png"));
        assert!(!is_allowed_mime_type("application/x-executable"));
    }

    #[test]
    fn test_validate_file_size() {
        assert!(validate_file_size(1024, "image/png").is_ok());
        assert!(validate_file_size(MAX_IMAGE_SIZE + 1, "image/png").is_err());
        assert!(validate_file_size(MAX_AUDIO_SIZE, "audio/mpeg").is_ok());
    }

    #[test]
    fn test_generate_and_parse_key() {
        let user_id = Uuid::new_v4();
        let (blob_id, key) = generate_blob_key(&user_id, BlobCategory::Audio, "mp3");

        let parsed = parse_blob_key(&key)
            .expect("Blob key format is generated by this function, should always parse");
        assert_eq!(parsed.user_id, user_id.to_string());
        assert_eq!(parsed.category, BlobCategory::Audio);
        assert_eq!(parsed.blob_id, blob_id);
        assert_eq!(parsed.extension, "mp3");
    }

    #[test]
    fn test_extension_from_mime() {
        assert_eq!(get_extension_from_mime("audio/mpeg"), "mp3");
        assert_eq!(get_extension_from_mime("image/jpeg"), "jpg");
        assert_eq!(get_extension_from_mime("unknown/type"), "bin");
    }
}
