/// Request/Response Validation Middleware
///
/// Validates incoming requests and outgoing responses against schema definitions.
/// Provides automatic error reporting for validation failures and debug logging.

use axum::{
    body::Body,
    extract::rejection::JsonRejection,
    http::{Request, StatusCode, header::HeaderMap},
    middleware::Next,
    response::{IntoResponse, Response},
    Json,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use validator::Validate;

/// Validation result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationResult {
    pub valid: bool,
    pub errors: Vec<ValidationError>,
}

/// Individual validation error
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationError {
    pub field: String,
    pub code: String,
    pub message: String,
}

impl ValidationResult {
    /// Create successful validation result
    pub fn ok() -> Self {
        Self {
            valid: true,
            errors: Vec::new(),
        }
    }

    /// Create failed validation result with errors
    pub fn failed(errors: Vec<ValidationError>) -> Self {
        Self {
            valid: false,
            errors,
        }
    }

    /// Add validation error
    pub fn add_error(&mut self, field: String, code: String, message: String) {
        self.errors.push(ValidationError {
            field,
            code,
            message,
        });
        self.valid = false;
    }
}

/// Request validation rules
pub struct RequestValidator {
    rules: Vec<Box<dyn Fn(&serde_json::Value) -> ValidationResult + Send + Sync>>,
}

impl RequestValidator {
    /// Create new request validator
    pub fn new() -> Self {
        Self {
            rules: Vec::new(),
        }
    }

    /// Add validation rule
    pub fn add_rule<F>(mut self, rule: F) -> Self
    where
        F: Fn(&serde_json::Value) -> ValidationResult + Send + Sync + 'static,
    {
        self.rules.push(Box::new(rule));
        self
    }

    /// Validate JSON payload
    pub fn validate(&self, payload: &serde_json::Value) -> ValidationResult {
        for rule in &self.rules {
            let result = rule(payload);
            if !result.valid {
                return result;
            }
        }
        ValidationResult::ok()
    }

    /// Validate request has required headers
    pub fn validate_headers(headers: &HeaderMap, required: &[&str]) -> ValidationResult {
        for header_name in required {
            if !headers.contains_key(*header_name) {
                return ValidationResult::failed(vec![ValidationError {
                    field: header_name.to_string(),
                    code: "missing_header".to_string(),
                    message: format!("Required header '{}' is missing", header_name),
                }]);
            }
        }
        ValidationResult::ok()
    }

    /// Validate request has content type
    pub fn validate_content_type(headers: &HeaderMap, expected: &str) -> ValidationResult {
        match headers.get("content-type") {
            Some(ct) => {
                let content_type = ct.to_str().unwrap_or("");
                if !content_type.contains(expected) {
                    return ValidationResult::failed(vec![ValidationError {
                        field: "content-type".to_string(),
                        code: "invalid_content_type".to_string(),
                        message: format!(
                            "Expected content-type '{}', got '{}'",
                            expected, content_type
                        ),
                    }]);
                }
                ValidationResult::ok()
            }
            None => ValidationResult::failed(vec![ValidationError {
                field: "content-type".to_string(),
                code: "missing_header".to_string(),
                message: "Content-Type header is missing".to_string(),
            }]),
        }
    }
}

/// Response validation
pub struct ResponseValidator {
    rules: Vec<Box<dyn Fn(&serde_json::Value) -> ValidationResult + Send + Sync>>,
}

impl ResponseValidator {
    /// Create new response validator
    pub fn new() -> Self {
        Self {
            rules: Vec::new(),
        }
    }

    /// Add validation rule
    pub fn add_rule<F>(mut self, rule: F) -> Self
    where
        F: Fn(&serde_json::Value) -> ValidationResult + Send + Sync + 'static,
    {
        self.rules.push(Box::new(rule));
        self
    }

    /// Validate response payload
    pub fn validate(&self, payload: &serde_json::Value) -> ValidationResult {
        for rule in &self.rules {
            let result = rule(payload);
            if !result.valid {
                return result;
            }
        }
        ValidationResult::ok()
    }

    /// Validate response has data field
    pub fn validate_has_data(payload: &serde_json::Value) -> ValidationResult {
        if !payload.is_object() || !payload.get("data").is_some() {
            return ValidationResult::failed(vec![ValidationError {
                field: "data".to_string(),
                code: "missing_field".to_string(),
                message: "Response must contain 'data' field".to_string(),
            }]);
        }
        ValidationResult::ok()
    }

    /// Validate response is valid JSON structure
    pub fn validate_structure(payload: &serde_json::Value) -> ValidationResult {
        if !payload.is_object() {
            return ValidationResult::failed(vec![ValidationError {
                field: "root".to_string(),
                code: "invalid_structure".to_string(),
                message: "Response must be a JSON object".to_string(),
            }]);
        }
        ValidationResult::ok()
    }
}

/// Built-in schema validators
pub mod schemas {
    use super::*;

    /// Validate user creation request
    pub fn validate_user_creation(payload: &serde_json::Value) -> ValidationResult {
        let mut errors = Vec::new();

        // Check email format
        if let Some(email) = payload.get("email").and_then(|e| e.as_str()) {
            if !email.contains('@') {
                errors.push(ValidationError {
                    field: "email".to_string(),
                    code: "invalid_email".to_string(),
                    message: "Invalid email format".to_string(),
                });
            }
        } else {
            errors.push(ValidationError {
                field: "email".to_string(),
                code: "required".to_string(),
                message: "Email is required".to_string(),
            });
        }

        // Check password strength
        if let Some(password) = payload.get("password").and_then(|p| p.as_str()) {
            if password.len() < 8 {
                errors.push(ValidationError {
                    field: "password".to_string(),
                    code: "too_short".to_string(),
                    message: "Password must be at least 8 characters".to_string(),
                });
            }
        } else {
            errors.push(ValidationError {
                field: "password".to_string(),
                code: "required".to_string(),
                message: "Password is required".to_string(),
            });
        }

        if errors.is_empty() {
            ValidationResult::ok()
        } else {
            ValidationResult::failed(errors)
        }
    }

    /// Validate habit creation request
    pub fn validate_habit_creation(payload: &serde_json::Value) -> ValidationResult {
        let mut errors = Vec::new();

        if payload.get("name").and_then(|n| n.as_str()).is_none() {
            errors.push(ValidationError {
                field: "name".to_string(),
                code: "required".to_string(),
                message: "Habit name is required".to_string(),
            });
        }

        if let Some(frequency) = payload.get("frequency").and_then(|f| f.as_str()) {
            if !["daily", "weekly", "monthly"].contains(&frequency) {
                errors.push(ValidationError {
                    field: "frequency".to_string(),
                    code: "invalid_value".to_string(),
                    message: "Frequency must be daily, weekly, or monthly".to_string(),
                });
            }
        } else {
            errors.push(ValidationError {
                field: "frequency".to_string(),
                code: "required".to_string(),
                message: "Frequency is required".to_string(),
            });
        }

        if errors.is_empty() {
            ValidationResult::ok()
        } else {
            ValidationResult::failed(errors)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validation_result() {
        let result = ValidationResult::ok();
        assert!(result.valid);
        assert_eq!(result.errors.len(), 0);

        let errors = vec![ValidationError {
            field: "name".to_string(),
            code: "required".to_string(),
            message: "Name is required".to_string(),
        }];
        let result = ValidationResult::failed(errors);
        assert!(!result.valid);
        assert_eq!(result.errors.len(), 1);
    }

    #[test]
    fn test_header_validation() {
        let mut headers = HeaderMap::new();
        headers.insert("authorization", "Bearer token".parse().unwrap());

        let result = RequestValidator::validate_headers(&headers, &["authorization"]);
        assert!(result.valid);

        let result = RequestValidator::validate_headers(&headers, &["x-api-key"]);
        assert!(!result.valid);
    }

    #[test]
    fn test_user_creation_validation() {
        let payload = serde_json::json!({
            "email": "test@example.com",
            "password": "securepassword123"
        });

        let result = schemas::validate_user_creation(&payload);
        assert!(result.valid);

        let payload = serde_json::json!({
            "email": "invalid-email",
            "password": "short"
        });

        let result = schemas::validate_user_creation(&payload);
        assert!(!result.valid);
        assert!(result.errors.len() > 0);
    }
}
