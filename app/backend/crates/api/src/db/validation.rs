/// Data Validation & Sanitization Utilities
///
/// Provides comprehensive validation and sanitization for common data types,
/// including email, URLs, passwords, and custom validation rules. Ensures data
/// integrity at the application boundary.

use regex::Regex;
use lazy_static::lazy_static;

/// Result of validation
pub type ValidationResult<T> = Result<T, ValidationError>;

/// Validation error with detailed context
#[derive(Debug, Clone)]
pub struct ValidationError {
    pub field: String,
    pub code: String,
    pub message: String,
}

impl ValidationError {
    /// Create new validation error
    pub fn new(field: impl Into<String>, code: impl Into<String>, message: impl Into<String>) -> Self {
        Self {
            field: field.into(),
            code: code.into(),
            message: message.into(),
        }
    }
}

impl std::fmt::Display for ValidationError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}: {} ({})", self.field, self.message, self.code)
    }
}

impl std::error::Error for ValidationError {}

lazy_static! {
    static ref EMAIL_REGEX: Regex = Regex::new(
        r"^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$"
    ).unwrap();

    static ref URL_REGEX: Regex = Regex::new(
        r"^https?://[^\s/$.?#].[^\s]*$"
    ).unwrap();

    static ref SLUG_REGEX: Regex = Regex::new(
        r"^[a-z0-9]+(?:-[a-z0-9]+)*$"
    ).unwrap();

    static ref ALPHANUMERIC_REGEX: Regex = Regex::new(
        r"^[a-zA-Z0-9]+$"
    ).unwrap();
}

/// Email validation
pub fn validate_email(email: &str) -> ValidationResult<String> {
    let trimmed = email.trim();

    if trimmed.is_empty() {
        return Err(ValidationError::new("email", "required", "Email is required"));
    }

    if trimmed.len() > 254 {
        return Err(ValidationError::new("email", "too_long", "Email must be 254 characters or less"));
    }

    if !EMAIL_REGEX.is_match(trimmed) {
        return Err(ValidationError::new("email", "invalid_format", "Invalid email format"));
    }

    Ok(trimmed.to_lowercase())
}

/// Password validation
pub fn validate_password(password: &str) -> ValidationResult<String> {
    if password.is_empty() {
        return Err(ValidationError::new("password", "required", "Password is required"));
    }

    if password.len() < 8 {
        return Err(ValidationError::new(
            "password",
            "too_short",
            "Password must be at least 8 characters",
        ));
    }

    if password.len() > 128 {
        return Err(ValidationError::new(
            "password",
            "too_long",
            "Password must be 128 characters or less",
        ));
    }

    // Check for character variety
    let has_upper = password.chars().any(|c| c.is_uppercase());
    let has_lower = password.chars().any(|c| c.is_lowercase());
    let has_digit = password.chars().any(|c| c.is_numeric());
    let has_special = password.chars().any(|c| !c.is_alphanumeric());

    let variety_score = [has_upper, has_lower, has_digit, has_special]
        .iter()
        .filter(|&&x| x)
        .count();

    if variety_score < 2 {
        return Err(ValidationError::new(
            "password",
            "weak",
            "Password must contain at least 2 of: uppercase, lowercase, numbers, special characters",
        ));
    }

    Ok(password.to_string())
}

/// URL validation
pub fn validate_url(url: &str) -> ValidationResult<String> {
    let trimmed = url.trim();

    if trimmed.is_empty() {
        return Err(ValidationError::new("url", "required", "URL is required"));
    }

    if trimmed.len() > 2048 {
        return Err(ValidationError::new("url", "too_long", "URL must be 2048 characters or less"));
    }

    if !URL_REGEX.is_match(trimmed) {
        return Err(ValidationError::new("url", "invalid_format", "Invalid URL format"));
    }

    Ok(trimmed.to_string())
}

/// Username validation
pub fn validate_username(username: &str) -> ValidationResult<String> {
    let trimmed = username.trim();

    if trimmed.is_empty() {
        return Err(ValidationError::new("username", "required", "Username is required"));
    }

    if trimmed.len() < 3 {
        return Err(ValidationError::new(
            "username",
            "too_short",
            "Username must be at least 3 characters",
        ));
    }

    if trimmed.len() > 32 {
        return Err(ValidationError::new(
            "username",
            "too_long",
            "Username must be 32 characters or less",
        ));
    }

    if !ALPHANUMERIC_REGEX.is_match(trimmed) && !trimmed.chars().all(|c| c.is_alphanumeric() || c == '_' || c == '-') {
        return Err(ValidationError::new(
            "username",
            "invalid_characters",
            "Username can only contain letters, numbers, underscores, and hyphens",
        ));
    }

    if trimmed.starts_with('-') || trimmed.ends_with('-') {
        return Err(ValidationError::new(
            "username",
            "invalid_format",
            "Username cannot start or end with a hyphen",
        ));
    }

    Ok(trimmed.to_lowercase())
}

/// Slug validation (URL-safe identifier)
pub fn validate_slug(slug: &str) -> ValidationResult<String> {
    let trimmed = slug.trim();

    if trimmed.is_empty() {
        return Err(ValidationError::new("slug", "required", "Slug is required"));
    }

    if trimmed.len() > 64 {
        return Err(ValidationError::new("slug", "too_long", "Slug must be 64 characters or less"));
    }

    if !SLUG_REGEX.is_match(trimmed) {
        return Err(ValidationError::new(
            "slug",
            "invalid_format",
            "Slug must contain only lowercase letters, numbers, and hyphens",
        ));
    }

    Ok(trimmed.to_string())
}

/// String length validation
pub fn validate_length(
    value: &str,
    min: usize,
    max: usize,
    field: &str,
) -> ValidationResult<String> {
    let trimmed = value.trim();

    if trimmed.is_empty() && min > 0 {
        return Err(ValidationError::new(field, "required", format!("{} is required", field)));
    }

    if trimmed.len() < min {
        return Err(ValidationError::new(
            field,
            "too_short",
            format!("{} must be at least {} characters", field, min),
        ));
    }

    if trimmed.len() > max {
        return Err(ValidationError::new(
            field,
            "too_long",
            format!("{} must be {} characters or less", field, max),
        ));
    }

    Ok(trimmed.to_string())
}

/// Number range validation
pub fn validate_range(
    value: i64,
    min: i64,
    max: i64,
    field: &str,
) -> ValidationResult<i64> {
    if value < min {
        return Err(ValidationError::new(
            field,
            "too_small",
            format!("{} must be at least {}", field, min),
        ));
    }

    if value > max {
        return Err(ValidationError::new(
            field,
            "too_large",
            format!("{} must be at most {}", field, max),
        ));
    }

    Ok(value)
}

/// UUID validation
pub fn validate_uuid(value: &str) -> ValidationResult<String> {
    let trimmed = value.trim();

    if trimmed.is_empty() {
        return Err(ValidationError::new("uuid", "required", "UUID is required"));
    }

    if uuid::Uuid::parse_str(trimmed).is_err() {
        return Err(ValidationError::new("uuid", "invalid_format", "Invalid UUID format"));
    }

    Ok(trimmed.to_lowercase())
}

/// Data sanitization - remove potentially dangerous characters
pub fn sanitize_html(input: &str) -> String {
    // Simple HTML escaping (for more comprehensive sanitization, use ammonia crate)
    input
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace("\"", "&quot;")
        .replace("'", "&#39;")
}

/// Trim and normalize whitespace
pub fn normalize_whitespace(input: &str) -> String {
    input
        .trim()
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_email_validation() {
        assert!(validate_email("test@example.com").is_ok());
        assert!(validate_email("invalid.email").is_err());
        assert!(validate_email("").is_err());
    }

    #[test]
    fn test_password_validation() {
        assert!(validate_password("StrongPass123").is_ok());
        assert!(validate_password("weak").is_err());
        assert!(validate_password("").is_err());
    }

    #[test]
    fn test_url_validation() {
        assert!(validate_url("https://example.com").is_ok());
        assert!(validate_url("invalid-url").is_err());
    }

    #[test]
    fn test_username_validation() {
        assert!(validate_username("valid_user").is_ok());
        assert!(validate_username("ab").is_err());
        assert!(validate_username("invalid user").is_err());
    }

    #[test]
    fn test_slug_validation() {
        assert!(validate_slug("my-slug").is_ok());
        assert!(validate_slug("My-Slug").is_err());
        assert!(validate_slug("-invalid").is_err());
    }

    #[test]
    fn test_html_sanitization() {
        let input = "<script>alert('xss')</script>";
        let output = sanitize_html(input);
        assert!(!output.contains("<"));
    }

    #[test]
    fn test_whitespace_normalization() {
        assert_eq!(normalize_whitespace("  hello   world  "), "hello world");
    }
}
