//! Custom assertions for tests
//!
//! Domain-specific assertion helpers for consistent test assertions.

use crate::error::AppError;

/// Assert that an AppError is of a specific type
///
/// # Example
/// ```ignore
/// let result: Result<_, AppError> = operation().await;
/// assert_app_error(&result, "expected_error_type");
/// ```
#[allow(dead_code)]
pub fn assert_app_error(result: &Result<impl std::fmt::Debug, AppError>, error_type: &str) {
    match result {
        Err(e) => {
            let error_str = format!("{:?}", e);
            assert!(
                error_str.contains(error_type),
                "Expected error to contain '{}', but got: {}",
                error_type,
                error_str
            );
        }
        Ok(ok) => {
            panic!(
                "Expected error but got success: {:?}",
                ok
            );
        }
    }
}

/// Assert that a UUID is not nil
///
/// # Example
/// ```ignore
/// let id = create_user().await;
/// assert_not_nil_uuid(id);
/// ```
#[allow(dead_code)]
pub fn assert_not_nil_uuid(id: uuid::Uuid) {
    assert_ne!(id, uuid::Uuid::nil(), "UUID must not be nil");
}

/// Assert that a string matches a pattern
///
/// # Example
/// ```ignore
/// assert_matches_pattern(&email, r"^[a-z0-9\.]+@[a-z0-9\.]+$");
/// ```
#[allow(dead_code)]
pub fn assert_matches_pattern(text: &str, pattern: &str) {
    let re = regex::Regex::new(pattern).expect("Invalid regex pattern");
    assert!(
        re.is_match(text),
        "Text '{}' does not match pattern '{}'",
        text,
        pattern
    );
}
