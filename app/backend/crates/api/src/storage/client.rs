//! R2/S3 Storage Client
//!
//! Backend-only storage client for Cloudflare R2 (S3-compatible).
//! Frontend never receives credentials - all access is through backend APIs.

use aws_config::BehaviorVersion;
use aws_sdk_s3::{
    config::{Credentials, Region},
    presigning::PresigningConfig,
    primitives::ByteStream,
    Client as S3Client,
};
use chrono::Utc;
use std::time::Duration;
use uuid::Uuid;

use super::types::*;
use crate::config::StorageConfig;
use crate::error::AppError;

/// R2 Storage Client
///
/// Provides secure, backend-only access to R2/S3 storage.
/// Implements prefix-based user isolation to prevent IDOR.
#[derive(Clone)]
pub struct StorageClient {
    client: S3Client,
    bucket: String,
}

impl StorageClient {
    /// Create a new storage client from config
    pub async fn new(config: &StorageConfig) -> Result<Self, AppError> {
        let endpoint = config
            .endpoint
            .as_ref()
            .ok_or_else(|| AppError::Config("STORAGE_ENDPOINT required".to_string()))?;

        let bucket = config
            .bucket
            .as_ref()
            .ok_or_else(|| AppError::Config("STORAGE_BUCKET required".to_string()))?
            .clone();

        let access_key = config
            .access_key_id
            .as_ref()
            .ok_or_else(|| AppError::Config("STORAGE_ACCESS_KEY_ID required".to_string()))?;

        let secret_key = config
            .secret_access_key
            .as_ref()
            .ok_or_else(|| AppError::Config("STORAGE_SECRET_ACCESS_KEY required".to_string()))?;

        let credentials = Credentials::new(access_key, secret_key, None, None, "static");

        let s3_config = aws_sdk_s3::Config::builder()
            .behavior_version(BehaviorVersion::latest())
            .endpoint_url(endpoint)
            .region(Region::new(config.region.clone()))
            .credentials_provider(credentials)
            .force_path_style(true) // Required for MinIO/R2 compatibility
            .build();

        let client = S3Client::from_conf(s3_config);

        Ok(Self { client, bucket })
    }

    /// Upload a blob to storage
    ///
    /// Returns the blob ID and key. The key includes the user's prefix for isolation.
    pub async fn upload(&self, request: UploadRequest) -> Result<UploadResponse, AppError> {
        // Validate MIME type
        if !is_allowed_mime_type(&request.mime_type) {
            return Err(AppError::Validation(format!(
                "MIME type {} not allowed",
                request.mime_type
            )));
        }

        // Validate file size
        let size = request.data.len() as u64;
        validate_file_size(size, &request.mime_type).map_err(AppError::Validation)?;

        // Generate key with user prefix for isolation
        let category = BlobCategory::from_mime_type(&request.mime_type);
        let extension = get_extension_from_mime(&request.mime_type);
        let (blob_id, key) = generate_blob_key(&request.user_id, category, extension);

        // Build metadata
        let _metadata = BlobMetadata {
            user_id: request.user_id,
            filename: request.filename.clone(),
            uploaded_at: Utc::now().to_rfc3339(),
            custom: request.metadata,
        };

        // Upload to S3/R2
        self.client
            .put_object()
            .bucket(&self.bucket)
            .key(&key)
            .body(ByteStream::from(request.data))
            .content_type(&request.mime_type)
            .metadata("user_id", request.user_id.to_string())
            .metadata("filename", &request.filename)
            .metadata("uploaded_at", Utc::now().to_rfc3339())
            .send()
            .await
            .map_err(|e| AppError::Internal(format!("S3 upload failed: {}", e)))?;

        Ok(UploadResponse {
            id: blob_id,
            key,
            size_bytes: size,
            mime_type: request.mime_type,
            category,
        })
    }

    /// Get a blob by ID, searching under the user's prefix only (IDOR prevention)
    pub async fn get_blob_by_id(
        &self,
        user_id: &Uuid,
        blob_id: &Uuid,
    ) -> Result<Option<(Vec<u8>, String)>, AppError> {
        // Search all categories under user's prefix
        let categories = [
            BlobCategory::Audio,
            BlobCategory::Images,
            BlobCategory::Exports,
            BlobCategory::Other,
        ];

        for category in categories {
            let prefix = format!("{}/{}/{}", user_id, category.as_str(), blob_id);

            let list_result = self
                .client
                .list_objects_v2()
                .bucket(&self.bucket)
                .prefix(&prefix)
                .max_keys(1)
                .send()
                .await
                .map_err(|e| AppError::Internal(format!("S3 list failed: {}", e)))?;

            let objects = list_result.contents();
            if let Some(obj) = objects.first() {
                if let Some(key) = obj.key() {
                    // Found the blob, now get it
                    let get_result = self
                        .client
                        .get_object()
                        .bucket(&self.bucket)
                        .key(key)
                        .send()
                        .await
                        .map_err(|e| AppError::Internal(format!("S3 get failed: {}", e)))?;

                    let content_type = get_result
                        .content_type()
                        .unwrap_or("application/octet-stream")
                        .to_string();

                    let data = get_result
                        .body
                        .collect()
                        .await
                        .map_err(|e| AppError::Internal(format!("S3 read failed: {}", e)))?
                        .into_bytes()
                        .to_vec();

                    return Ok(Some((data, content_type)));
                }
            }
        }

        Ok(None)
    }

    /// Get blob info by ID without downloading content
    pub async fn get_blob_info(
        &self,
        user_id: &Uuid,
        blob_id: &Uuid,
    ) -> Result<Option<BlobInfo>, AppError> {
        let categories = [
            BlobCategory::Audio,
            BlobCategory::Images,
            BlobCategory::Exports,
            BlobCategory::Other,
        ];

        for category in categories {
            let prefix = format!("{}/{}/{}", user_id, category.as_str(), blob_id);

            let list_result = self
                .client
                .list_objects_v2()
                .bucket(&self.bucket)
                .prefix(&prefix)
                .max_keys(1)
                .send()
                .await
                .map_err(|e| AppError::Internal(format!("S3 list failed: {}", e)))?;

            let objects = list_result.contents();
            if let Some(obj) = objects.first() {
                if let Some(key) = obj.key() {
                    // Get metadata via HEAD
                    let head_result = self
                        .client
                        .head_object()
                        .bucket(&self.bucket)
                        .key(key)
                        .send()
                        .await
                        .map_err(|e| AppError::Internal(format!("S3 head failed: {}", e)))?;

                    let parsed = parse_blob_key(key);
                    let filename = head_result
                        .metadata()
                        .and_then(|m| m.get("filename").cloned())
                        .unwrap_or_else(|| "unknown".to_string());

                    let uploaded_at = head_result
                        .metadata()
                        .and_then(|m| m.get("uploaded_at").cloned())
                        .unwrap_or_else(|| Utc::now().to_rfc3339());

                    return Ok(Some(BlobInfo {
                        id: *blob_id,
                        key: key.to_string(),
                        size_bytes: head_result.content_length().unwrap_or(0) as u64,
                        mime_type: head_result
                            .content_type()
                            .unwrap_or("application/octet-stream")
                            .to_string(),
                        category: parsed.map(|p| p.category).unwrap_or(BlobCategory::Other),
                        filename,
                        uploaded_at,
                        etag: head_result.e_tag().map(|s| s.to_string()),
                    }));
                }
            }
        }

        Ok(None)
    }

    /// Delete a blob by ID (only if owned by user)
    pub async fn delete_blob_by_id(
        &self,
        user_id: &Uuid,
        blob_id: &Uuid,
    ) -> Result<bool, AppError> {
        let categories = [
            BlobCategory::Audio,
            BlobCategory::Images,
            BlobCategory::Exports,
            BlobCategory::Other,
        ];

        for category in categories {
            let prefix = format!("{}/{}/{}", user_id, category.as_str(), blob_id);

            let list_result = self
                .client
                .list_objects_v2()
                .bucket(&self.bucket)
                .prefix(&prefix)
                .max_keys(1)
                .send()
                .await
                .map_err(|e| AppError::Internal(format!("S3 list failed: {}", e)))?;

            let objects = list_result.contents();
            if let Some(obj) = objects.first() {
                if let Some(key) = obj.key() {
                    self.client
                        .delete_object()
                        .bucket(&self.bucket)
                        .key(key)
                        .send()
                        .await
                        .map_err(|e| AppError::Internal(format!("S3 delete failed: {}", e)))?;

                    return Ok(true);
                }
            }
        }

        Ok(false)
    }

    /// List blobs for a user, optionally filtered by category
    pub async fn list_blobs(
        &self,
        user_id: &Uuid,
        category: Option<BlobCategory>,
    ) -> Result<Vec<BlobInfo>, AppError> {
        let prefix = match category {
            Some(cat) => format!("{}/{}/", user_id, cat.as_str()),
            None => format!("{}/", user_id),
        };

        let list_result = self
            .client
            .list_objects_v2()
            .bucket(&self.bucket)
            .prefix(&prefix)
            .send()
            .await
            .map_err(|e| AppError::Internal(format!("S3 list failed: {}", e)))?;

        let mut blobs = Vec::new();

        for obj in list_result.contents() {
            if let Some(key) = obj.key() {
                if let Some(parsed) = parse_blob_key(key) {
                    blobs.push(BlobInfo {
                        id: parsed.blob_id,
                        key: key.to_string(),
                        size_bytes: obj.size().unwrap_or(0) as u64,
                        mime_type: "unknown".to_string(), // Would need HEAD for this
                        category: parsed.category,
                        filename: "unknown".to_string(),
                        uploaded_at: obj
                            .last_modified()
                            .map(|t| t.to_string())
                            .unwrap_or_else(|| "unknown".to_string()),
                        etag: obj.e_tag().map(|s| s.to_string()),
                    });
                }
            }
        }

        Ok(blobs)
    }

    /// Generate a signed download URL (short-lived)
    ///
    /// This allows frontend to download directly without proxying through backend.
    /// URL expires in SIGNED_URL_EXPIRY_SECONDS.
    pub async fn generate_signed_download_url(
        &self,
        user_id: &Uuid,
        blob_id: &Uuid,
    ) -> Result<Option<SignedUrlResponse>, AppError> {
        // First find the blob (verifies ownership via prefix)
        let info = self.get_blob_info(user_id, blob_id).await?;

        let info = match info {
            Some(i) => i,
            None => return Ok(None),
        };

        let expires_in = Duration::from_secs(SIGNED_URL_EXPIRY_SECONDS);
        let presigning_config = PresigningConfig::expires_in(expires_in)
            .map_err(|e| AppError::Internal(format!("Presign config error: {}", e)))?;

        let presigned_request = self
            .client
            .get_object()
            .bucket(&self.bucket)
            .key(&info.key)
            .presigned(presigning_config)
            .await
            .map_err(|e| AppError::Internal(format!("Presign failed: {}", e)))?;

        let expires_at = Utc::now() + chrono::Duration::seconds(SIGNED_URL_EXPIRY_SECONDS as i64);

        Ok(Some(SignedUrlResponse {
            url: presigned_request.uri().to_string(),
            expires_at: expires_at.to_rfc3339(),
            method: "GET".to_string(),
        }))
    }

    /// Generate a signed upload URL (short-lived)
    ///
    /// This allows frontend to upload directly without proxying through backend.
    /// Returns the key that will be created.
    pub async fn generate_signed_upload_url(
        &self,
        user_id: &Uuid,
        mime_type: &str,
        filename: &str,
    ) -> Result<SignedUrlResponse, AppError> {
        // Validate MIME type
        if !is_allowed_mime_type(mime_type) {
            return Err(AppError::Validation(format!(
                "MIME type {} not allowed",
                mime_type
            )));
        }

        // Generate key with user prefix for isolation
        let category = BlobCategory::from_mime_type(mime_type);
        let extension = get_extension_from_mime(mime_type);
        let (blob_id, key) = generate_blob_key(user_id, category, extension);

        let expires_in = Duration::from_secs(SIGNED_UPLOAD_URL_EXPIRY_SECONDS);
        let presigning_config = PresigningConfig::expires_in(expires_in)
            .map_err(|e| AppError::Internal(format!("Presign config error: {}", e)))?;

        let presigned_request = self
            .client
            .put_object()
            .bucket(&self.bucket)
            .key(&key)
            .content_type(mime_type)
            .metadata("user_id", user_id.to_string())
            .metadata("filename", filename)
            .metadata("uploaded_at", Utc::now().to_rfc3339())
            .metadata("blob_id", blob_id.to_string())
            .presigned(presigning_config)
            .await
            .map_err(|e| AppError::Internal(format!("Presign failed: {}", e)))?;

        let expires_at =
            Utc::now() + chrono::Duration::seconds(SIGNED_UPLOAD_URL_EXPIRY_SECONDS as i64);

        Ok(SignedUrlResponse {
            url: presigned_request.uri().to_string(),
            expires_at: expires_at.to_rfc3339(),
            method: "PUT".to_string(),
        })
    }

    /// Get total storage usage for a user
    pub async fn get_user_storage_usage(&self, user_id: &Uuid) -> Result<u64, AppError> {
        let prefix = format!("{}/", user_id);

        let list_result = self
            .client
            .list_objects_v2()
            .bucket(&self.bucket)
            .prefix(&prefix)
            .send()
            .await
            .map_err(|e| AppError::Internal(format!("S3 list failed: {}", e)))?;

        let total: u64 = list_result
            .contents()
            .iter()
            .map(|o| o.size().unwrap_or(0) as u64)
            .sum();

        Ok(total)
    }

    /// Check if bucket exists and is accessible
    #[allow(dead_code)]
    pub async fn health_check(&self) -> Result<bool, AppError> {
        self.client
            .head_bucket()
            .bucket(&self.bucket)
            .send()
            .await
            .map_err(|e| AppError::Internal(format!("S3 health check failed: {}", e)))?;

        Ok(true)
    }
}
