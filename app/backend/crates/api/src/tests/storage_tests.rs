//! Storage/R2 integration tests
//!
//! Tests for blob storage authorization and IDOR prevention.

/// Test that MIME type validation works
#[test]
fn test_mime_type_validation() {
    use crate::storage::{is_allowed_mime_type, ALLOWED_MIME_TYPES};

    // Allowed types
    for mime in ALLOWED_MIME_TYPES {
        assert!(
            is_allowed_mime_type(mime),
            "Expected {} to be allowed",
            mime
        );
    }

    // Disallowed types
    assert!(!is_allowed_mime_type("application/x-executable"));
    assert!(!is_allowed_mime_type("application/x-msdownload"));
    assert!(!is_allowed_mime_type("text/html"));
    assert!(!is_allowed_mime_type("application/javascript"));
}

/// Test file size validation
#[test]
fn test_file_size_validation() {
    use crate::storage::{validate_file_size, MAX_AUDIO_SIZE, MAX_FILE_SIZE, MAX_IMAGE_SIZE};

    // Valid sizes
    assert!(validate_file_size(1024, "image/png").is_ok());
    assert!(validate_file_size(MAX_IMAGE_SIZE, "image/png").is_ok());
    assert!(validate_file_size(MAX_AUDIO_SIZE, "audio/mpeg").is_ok());
    assert!(validate_file_size(MAX_FILE_SIZE, "application/pdf").is_ok());

    // Invalid sizes
    assert!(validate_file_size(MAX_IMAGE_SIZE + 1, "image/png").is_err());
    assert!(validate_file_size(MAX_AUDIO_SIZE + 1, "audio/mpeg").is_err());
    assert!(validate_file_size(MAX_FILE_SIZE + 1, "application/pdf").is_err());
}

/// Test blob key generation includes user prefix (IDOR prevention)
#[test]
fn test_blob_key_includes_user_prefix() {
    use crate::storage::{generate_blob_key, BlobCategory};
    use uuid::Uuid;

    let user_id = Uuid::new_v4();
    let (blob_id, key) = generate_blob_key(&user_id, BlobCategory::Audio, "mp3");

    // Key must start with user_id (IDOR prevention)
    assert!(
        key.starts_with(&user_id.to_string()),
        "Key must start with user_id for IDOR prevention"
    );

    // Key must contain blob_id
    assert!(
        key.contains(&blob_id.to_string()),
        "Key must contain blob_id"
    );

    // Key must contain category
    assert!(key.contains("/audio/"), "Key must contain category");
}

/// Test that different users get different prefixes
#[test]
fn test_user_isolation_via_prefix() {
    use crate::storage::{generate_blob_key, BlobCategory};
    use uuid::Uuid;

    let user_a = Uuid::new_v4();
    let user_b = Uuid::new_v4();

    let (_, key_a) = generate_blob_key(&user_a, BlobCategory::Images, "png");
    let (_, key_b) = generate_blob_key(&user_b, BlobCategory::Images, "png");

    // Keys must have different prefixes
    assert_ne!(
        key_a.split('/').next(),
        key_b.split('/').next(),
        "Different users must have different key prefixes"
    );
}

/// Test blob key parsing
#[test]
fn test_blob_key_parsing() {
    use crate::storage::{generate_blob_key, parse_blob_key, BlobCategory};
    use uuid::Uuid;

    let user_id = Uuid::new_v4();
    let (blob_id, key) = generate_blob_key(&user_id, BlobCategory::Exports, "zip");

    let parsed = parse_blob_key(&key).expect("Key should be parseable");

    assert_eq!(parsed.user_id, user_id.to_string());
    assert_eq!(parsed.category, BlobCategory::Exports);
    assert_eq!(parsed.blob_id, blob_id);
    assert_eq!(parsed.extension, "zip");
}

/// Test invalid key parsing fails
#[test]
fn test_invalid_key_parsing() {
    use crate::storage::parse_blob_key;

    // Invalid formats
    assert!(parse_blob_key("").is_none());
    assert!(parse_blob_key("single").is_none());
    assert!(parse_blob_key("two/parts").is_none());
    assert!(parse_blob_key("a/b/not-uuid.mp3").is_none());
}

/// Test category detection from MIME type
#[test]
fn test_category_from_mime() {
    use crate::storage::BlobCategory;

    // Audio
    assert_eq!(
        BlobCategory::from_mime_type("audio/mpeg"),
        BlobCategory::Audio
    );
    assert_eq!(
        BlobCategory::from_mime_type("audio/wav"),
        BlobCategory::Audio
    );
    assert_eq!(
        BlobCategory::from_mime_type("audio/flac"),
        BlobCategory::Audio
    );

    // Images
    assert_eq!(
        BlobCategory::from_mime_type("image/png"),
        BlobCategory::Images
    );
    assert_eq!(
        BlobCategory::from_mime_type("image/jpeg"),
        BlobCategory::Images
    );
    assert_eq!(
        BlobCategory::from_mime_type("image/webp"),
        BlobCategory::Images
    );

    // Exports
    assert_eq!(
        BlobCategory::from_mime_type("application/zip"),
        BlobCategory::Exports
    );

    // Other
    assert_eq!(
        BlobCategory::from_mime_type("application/pdf"),
        BlobCategory::Other
    );
    assert_eq!(
        BlobCategory::from_mime_type("text/plain"),
        BlobCategory::Other
    );
}

/// Test extension extraction from MIME type
#[test]
fn test_extension_from_mime() {
    use crate::storage::get_extension_from_mime;

    assert_eq!(get_extension_from_mime("audio/mpeg"), "mp3");
    assert_eq!(get_extension_from_mime("audio/wav"), "wav");
    assert_eq!(get_extension_from_mime("image/jpeg"), "jpg");
    assert_eq!(get_extension_from_mime("image/png"), "png");
    assert_eq!(get_extension_from_mime("application/pdf"), "pdf");
    assert_eq!(get_extension_from_mime("unknown/type"), "bin");
}

/// Test signed URL expiry constants are reasonable
#[test]
fn test_signed_url_expiry_constants() {
    use crate::storage::{SIGNED_UPLOAD_URL_EXPIRY_SECONDS, SIGNED_URL_EXPIRY_SECONDS};

    // Download URLs should be valid for a reasonable time (1 hour)
    assert_eq!(SIGNED_URL_EXPIRY_SECONDS, 3600);

    // Upload URLs should be short-lived (5 minutes)
    assert_eq!(SIGNED_UPLOAD_URL_EXPIRY_SECONDS, 300);

    // Upload should be shorter than download
    assert!(SIGNED_UPLOAD_URL_EXPIRY_SECONDS < SIGNED_URL_EXPIRY_SECONDS);
}

/// Test that category round-trips through string
#[test]
fn test_category_string_roundtrip() {
    use crate::storage::BlobCategory;

    for category in [
        BlobCategory::Audio,
        BlobCategory::Images,
        BlobCategory::Exports,
        BlobCategory::Other,
    ] {
        let s = category.as_str();
        let parsed: BlobCategory = s.parse().expect("Should parse");
        assert_eq!(parsed, category);
    }
}
