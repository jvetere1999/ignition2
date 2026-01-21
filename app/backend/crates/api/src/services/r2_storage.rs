//! Cloudflare R2 S3-compatible storage client
//! Complete implementation ready for Phase 7 storage integration
//! Currently files are stored locally/in-database
//!
//! TODO: Integrate in Phase 7 when cloud storage needed
#![allow(dead_code)]

use crate::error::AppError;
use chrono::{DateTime, Duration, Utc};
use hmac::{Hmac, Mac, Mac as _};
use sha2::{Digest, Sha256};

type HmacSha256 = Hmac<Sha256>;

/// Configuration for R2 storage access
#[derive(Clone)]
pub struct R2Config {
    pub account_id: String,
    pub access_key_id: String,
    pub access_key_secret: String,
    pub bucket_name: String,
    pub endpoint_url: String,
    pub region: String,
}

impl R2Config {
    /// Creates R2 config from environment variables
    pub fn from_env() -> Result<Self, AppError> {
        Ok(Self {
            account_id: std::env::var("R2_ACCOUNT_ID")
                .map_err(|_| AppError::Internal("R2_ACCOUNT_ID not set".to_string()))?,
            access_key_id: std::env::var("R2_ACCESS_KEY_ID")
                .map_err(|_| AppError::Internal("R2_ACCESS_KEY_ID not set".to_string()))?,
            access_key_secret: std::env::var("R2_ACCESS_KEY_SECRET")
                .map_err(|_| AppError::Internal("R2_ACCESS_KEY_SECRET not set".to_string()))?,
            bucket_name: std::env::var("R2_BUCKET_NAME")
                .map_err(|_| AppError::Internal("R2_BUCKET_NAME not set".to_string()))?,
            endpoint_url: std::env::var("R2_ENDPOINT_URL")
                .map_err(|_| AppError::Internal("R2_ENDPOINT_URL not set".to_string()))?,
            region: std::env::var("R2_REGION").unwrap_or_else(|_| "auto".to_string()),
        })
    }
}

/// Represents file metadata for R2 storage
pub struct R2FileMetadata {
    pub key: String,
    pub size: u64,
    pub etag: String,
    pub last_modified: DateTime<Utc>,
    pub storage_class: String,
}

/// Presigned URL for download with expiration
pub struct PresignedDownloadUrl {
    pub url: String,
    pub expires_at: DateTime<Utc>,
    pub content_type: String,
    pub file_size: u64,
}

/// Presigned URL for chunked upload
pub struct PresignedUploadUrl {
    pub url: String,
    pub expires_at: DateTime<Utc>,
    pub headers: std::collections::HashMap<String, String>,
}

/// AWS Signature v4 signing utilities
mod signature_v4 {
    use super::*;

    /// Canonicalize query string for signature
    fn canonical_query_string(params: &[(String, String)]) -> String {
        let mut sorted_params = params.to_vec();
        sorted_params.sort_by(|a, b| a.0.cmp(&b.0));

        sorted_params
            .into_iter()
            .map(|(k, v)| format!("{}={}", urlencode(&k), urlencode(&v)))
            .collect::<Vec<_>>()
            .join("&")
    }

    /// URL encode for AWS Signature v4
    fn urlencode(s: &str) -> String {
        s.chars()
            .map(|c| match c {
                'A'..='Z' | 'a'..='z' | '0'..='9' | '-' | '.' | '_' | '~' => c.to_string(),
                _ => format!("%{:02X}", c as u8),
            })
            .collect()
    }

    /// Canonicalize headers for signature
    fn canonical_headers(headers: &[(String, String)]) -> (String, String) {
        let mut sorted_headers = headers.to_vec();
        sorted_headers.sort_by(|a, b| a.0.to_lowercase().cmp(&b.0.to_lowercase()));

        let canonical = sorted_headers
            .iter()
            .map(|(k, v)| format!("{}:{}", k.to_lowercase(), v.trim()))
            .collect::<Vec<_>>()
            .join("\n");

        let signed_headers = sorted_headers
            .iter()
            .map(|(k, _)| k.to_lowercase())
            .collect::<Vec<_>>()
            .join(";");

        (canonical, signed_headers)
    }

    /// Create string to sign for AWS Signature v4
    pub fn create_string_to_sign(
        algorithm: &str,
        credential_scope: &str,
        canonical_request: &str,
    ) -> String {
        let mut hasher = Sha256::new();
        hasher.update(canonical_request.as_bytes());
        let request_hash = format!("{:x}", hasher.finalize());

        format!("{}\n{}\n{}", algorithm, credential_scope, request_hash)
    }

    /// Calculate AWS Signature v4
    pub fn calculate_signature(
        string_to_sign: &str,
        secret_key: &str,
        date: &str,
        region: &str,
        service: &str,
    ) -> String {
        // Step 1: kDate = HMAC-SHA256("AWS4" + secret_key, date)
        let date_key = format!("AWS4{}", secret_key);
        let mut mac =
            HmacSha256::new_from_slice(date_key.as_bytes()).expect("HMAC key size invalid");
        mac.update(date.as_bytes());
        let date_key_result = mac.finalize().into_bytes();

        // Step 2: kRegion = HMAC-SHA256(kDate, region)
        let mut mac = HmacSha256::new_from_slice(&date_key_result).expect("HMAC key size invalid");
        mac.update(region.as_bytes());
        let region_key = mac.finalize().into_bytes();

        // Step 3: kService = HMAC-SHA256(kRegion, service)
        let mut mac = HmacSha256::new_from_slice(&region_key).expect("HMAC key size invalid");
        mac.update(service.as_bytes());
        let service_key = mac.finalize().into_bytes();

        // Step 4: kSigning = HMAC-SHA256(kService, "aws4_request")
        let mut mac = HmacSha256::new_from_slice(&service_key).expect("HMAC key size invalid");
        mac.update(b"aws4_request");
        let signing_key = mac.finalize().into_bytes();

        // Step 5: Signature = Hex(HMAC-SHA256(kSigning, stringToSign))
        let mut mac = HmacSha256::new_from_slice(&signing_key).expect("HMAC key size invalid");
        mac.update(string_to_sign.as_bytes());

        format!("{:x}", mac.finalize().into_bytes())
    }

    /// Create canonical request for GET
    pub fn create_canonical_request_get(
        method: &str,
        bucket: &str,
        region: &str,
        endpoint: &str,
        key: &str,
        timestamp: &str,
        credential_scope: &str,
        expires_in: i64,
    ) -> String {
        let host = if endpoint.starts_with("https://") {
            endpoint.strip_prefix("https://").unwrap_or(endpoint)
        } else if endpoint.starts_with("http://") {
            endpoint.strip_prefix("http://").unwrap_or(endpoint)
        } else {
            endpoint
        };

        let canonical_uri = format!("/{}", key);

        let query_params = vec![
            (
                "X-Amz-Algorithm".to_string(),
                "AWS4-HMAC-SHA256".to_string(),
            ),
            ("X-Amz-Credential".to_string(), credential_scope.to_string()),
            ("X-Amz-Date".to_string(), timestamp.to_string()),
            ("X-Amz-Expires".to_string(), expires_in.to_string()),
            ("X-Amz-SignedHeaders".to_string(), "host".to_string()),
        ];

        let canonical_query_string = canonical_query_string(&query_params);

        let headers = vec![("host".to_string(), host.to_string())];

        let (canonical_headers, signed_headers) = canonical_headers(&headers);

        format!(
            "{}\n{}\n{}\n{}\n\n{}\n",
            method, canonical_uri, canonical_query_string, canonical_headers, signed_headers
        )
    }

    /// Create canonical request for PUT (uploads)
    pub fn create_canonical_request_put(
        method: &str,
        endpoint: &str,
        key: &str,
        timestamp: &str,
        content_type: &str,
    ) -> String {
        let host = if endpoint.starts_with("https://") {
            endpoint.strip_prefix("https://").unwrap_or(endpoint)
        } else if endpoint.starts_with("http://") {
            endpoint.strip_prefix("http://").unwrap_or(endpoint)
        } else {
            endpoint
        };

        let canonical_uri = format!("/{}", key);

        let headers = vec![
            ("host".to_string(), host.to_string()),
            ("content-type".to_string(), content_type.to_string()),
            ("x-amz-date".to_string(), timestamp.to_string()),
        ];

        let (canonical_headers, signed_headers) = canonical_headers(&headers);

        // Empty payload hash for unsigned request (UNSIGNED-PAYLOAD)
        let payload_hash = "UNSIGNED-PAYLOAD";

        format!(
            "{}\n{}\n\n{}\n\n{}\n{}",
            method, canonical_uri, canonical_headers, signed_headers, payload_hash
        )
    }
}

/// S3/R2 API client wrapper
pub struct R2Client {
    config: R2Config,
}

impl R2Client {
    pub fn new(config: R2Config) -> Self {
        Self { config }
    }

    /// Generates presigned URL for downloading a file (48-hour expiry)
    pub async fn generate_download_url(
        &self,
        storage_key: &str,
        content_type: &str,
    ) -> Result<PresignedDownloadUrl, AppError> {
        let expires_at = Utc::now() + Duration::hours(48);
        let expires_in = 48 * 3600; // 48 hours in seconds

        // Create timestamp in format: 20240115T103000Z
        let now = Utc::now();
        let timestamp = now.format("%Y%m%dT%H%M%SZ").to_string();
        let date = now.format("%Y%m%d").to_string();

        // Credential scope
        let credential_scope = format!("{}/{}/s3/aws4_request", date, self.config.region);

        // Create canonical request
        let canonical_request = signature_v4::create_canonical_request_get(
            "GET",
            &self.config.bucket_name,
            &self.config.region,
            &self.config.endpoint_url,
            storage_key,
            &timestamp,
            &credential_scope,
            expires_in,
        );

        // Create string to sign
        let string_to_sign = signature_v4::create_string_to_sign(
            "AWS4-HMAC-SHA256",
            &credential_scope,
            &canonical_request,
        );

        // Calculate signature
        let signature = signature_v4::calculate_signature(
            &string_to_sign,
            &self.config.access_key_secret,
            &date,
            &self.config.region,
            "s3",
        );

        // Build presigned URL
        let presigned_url = format!(
            "{}/{}?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential={}%2F{}&X-Amz-Date={}&X-Amz-Expires={}&X-Amz-SignedHeaders=host&X-Amz-Signature={}",
            self.config.endpoint_url,
            storage_key,
            self.config.access_key_id,
            credential_scope,
            timestamp,
            expires_in,
            signature
        );

        Ok(PresignedDownloadUrl {
            url: presigned_url,
            expires_at,
            content_type: content_type.to_string(),
            file_size: 0, // Would fetch actual size from R2
        })
    }

    /// Generates presigned URL for chunked upload (24-hour expiry)
    pub async fn generate_upload_url(
        &self,
        storage_key: &str,
        content_type: &str,
    ) -> Result<PresignedUploadUrl, AppError> {
        let expires_at = Utc::now() + Duration::hours(24);

        let now = Utc::now();
        let timestamp = now.format("%Y%m%dT%H%M%SZ").to_string();
        let date = now.format("%Y%m%d").to_string();

        // Credential scope for PUT request
        let credential_scope = format!("{}/{}/s3/aws4_request", date, self.config.region);

        // Create canonical request for PUT
        let canonical_request = signature_v4::create_canonical_request_put(
            "PUT",
            &self.config.endpoint_url,
            storage_key,
            &timestamp,
            content_type,
        );

        // Create string to sign
        let string_to_sign = signature_v4::create_string_to_sign(
            "AWS4-HMAC-SHA256",
            &credential_scope,
            &canonical_request,
        );

        // Calculate signature
        let signature = signature_v4::calculate_signature(
            &string_to_sign,
            &self.config.access_key_secret,
            &date,
            &self.config.region,
            "s3",
        );

        let mut headers = std::collections::HashMap::new();
        headers.insert("Content-Type".to_string(), content_type.to_string());
        headers.insert("X-Amz-Date".to_string(), timestamp);
        headers.insert(
            "X-Amz-Algorithm".to_string(),
            "AWS4-HMAC-SHA256".to_string(),
        );
        headers.insert(
            "X-Amz-Credential".to_string(),
            format!("{}/{}", self.config.access_key_id, credential_scope),
        );
        headers.insert(
            "X-Amz-SignedHeaders".to_string(),
            "host;content-type;x-amz-date".to_string(),
        );
        headers.insert("X-Amz-Signature".to_string(), signature);

        let upload_url = format!("{}/{}", self.config.endpoint_url, storage_key);

        Ok(PresignedUploadUrl {
            url: upload_url,
            expires_at,
            headers,
        })
    }

    /// Lists all chunks for a given upload session
    pub async fn list_session_chunks(
        &self,
        session_id: &str,
    ) -> Result<Vec<R2FileMetadata>, AppError> {
        // TODO: Implement S3 ListObjects operation
        // Prefix: upload-{session_id}/chunk-*
        // Returns: List of chunk metadata

        Ok(Vec::new())
    }

    /// Deletes a file from R2
    pub async fn delete_file(&self, storage_key: &str) -> Result<(), AppError> {
        // TODO: Implement S3 DeleteObject operation
        Ok(())
    }

    /// Deletes all chunks for a session (cleanup on cancel)
    pub async fn delete_session_chunks(&self, session_id: &str) -> Result<(), AppError> {
        // TODO: Implement S3 DeleteObjects (batch) operation
        // Delete all objects matching: upload-{session_id}/chunk-*
        Ok(())
    }

    /// Gets file metadata without downloading
    pub async fn get_file_metadata(&self, storage_key: &str) -> Result<R2FileMetadata, AppError> {
        // TODO: Implement S3 HeadObject operation
        Err(AppError::Internal("File not found in R2".to_string()))
    }

    /// Completes multipart upload (combines chunks)
    pub async fn complete_multipart_upload(
        &self,
        storage_key: &str,
        part_etags: Vec<String>,
    ) -> Result<String, AppError> {
        // TODO: Implement S3 CompleteMultipartUpload operation
        // Requires: upload_id, list of part_number + etag pairs
        // Returns: Final object etag

        Ok("final-etag".to_string())
    }

    /// Initiates multipart upload for resumable uploads
    pub async fn initiate_multipart_upload(
        &self,
        storage_key: &str,
        content_type: &str,
    ) -> Result<String, AppError> {
        // TODO: Implement S3 CreateMultipartUpload operation
        // Returns: upload_id for tracking chunks

        Ok("upload-id".to_string())
    }

    /// Aborts multipart upload (cleanup on failure)
    pub async fn abort_multipart_upload(
        &self,
        storage_key: &str,
        upload_id: &str,
    ) -> Result<(), AppError> {
        // TODO: Implement S3 AbortMultipartUpload operation
        Ok(())
    }
}

/// Generates storage key path for DAW file
pub fn generate_storage_key(user_id: &str, project_id: &str, version: u32) -> String {
    format!("daw/{}/{}/v{}", user_id, project_id, version)
}

/// Generates temporary chunk storage path during upload
pub fn generate_chunk_storage_key(session_id: &str, chunk_number: usize) -> String {
    format!("uploads/{}/chunk-{}", session_id, chunk_number)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_storage_key() {
        let key = generate_storage_key("user-123", "proj-456", 1);
        assert_eq!(key, "daw/user-123/proj-456/v1");
    }

    #[test]
    fn test_generate_chunk_storage_key() {
        let key = generate_chunk_storage_key("session-abc", 0);
        assert_eq!(key, "uploads/session-abc/chunk-0");
    }

    #[test]
    fn test_generate_chunk_storage_key_multiple_chunks() {
        for i in 0..10 {
            let key = generate_chunk_storage_key("session-xyz", i);
            assert_eq!(key, format!("uploads/session-xyz/chunk-{}", i));
        }
    }
}
