//! Error types and handling

use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::Serialize;

/// Application error type
#[derive(Debug, thiserror::Error)]
#[allow(dead_code)]
pub enum AppError {
    #[error("Not found: {0}")]
    NotFound(String),

    #[error("Unauthorized")]
    Unauthorized,

    #[error("Forbidden")]
    Forbidden,

    #[error("CSRF violation")]
    CsrfViolation,

    #[error("Invalid origin")]
    InvalidOrigin,

    #[error("Bad request: {0}")]
    BadRequest(String),

    #[error("Validation error: {0}")]
    Validation(String),

    #[error("OAuth error: {0}")]
    OAuthError(String),

    #[error("Session expired")]
    SessionExpired,

    #[error("Database error: {0}")]
    Database(String),

    #[error("Internal error: {0}")]
    Internal(String),

    #[error("Configuration error: {0}")]
    Config(String),
}

// Manual implementation to avoid conflicts
impl From<sqlx::Error> for AppError {
    fn from(e: sqlx::Error) -> Self {
        AppError::Database(e.to_string())
    }
}

impl From<anyhow::Error> for AppError {
    fn from(e: anyhow::Error) -> Self {
        AppError::Internal(e.to_string())
    }
}

impl From<url::ParseError> for AppError {
    fn from(e: url::ParseError) -> Self {
        AppError::Config(e.to_string())
    }
}

/// Error response body
#[derive(Serialize)]
pub struct ErrorResponse {
    pub error: String,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub code: Option<String>,
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, error_type, message) = match &self {
            AppError::NotFound(msg) => (StatusCode::NOT_FOUND, "not_found", msg.clone()),
            AppError::Unauthorized => (
                StatusCode::UNAUTHORIZED,
                "unauthorized",
                "Unauthorized".to_string(),
            ),
            AppError::Forbidden => (StatusCode::FORBIDDEN, "forbidden", "Forbidden".to_string()),
            AppError::CsrfViolation => (
                StatusCode::FORBIDDEN,
                "csrf_violation",
                "CSRF validation failed".to_string(),
            ),
            AppError::InvalidOrigin => (
                StatusCode::FORBIDDEN,
                "invalid_origin",
                "Invalid origin".to_string(),
            ),
            AppError::BadRequest(msg) => (StatusCode::BAD_REQUEST, "bad_request", msg.clone()),
            AppError::Validation(msg) => (
                StatusCode::UNPROCESSABLE_ENTITY,
                "validation_error",
                msg.clone(),
            ),
            AppError::OAuthError(msg) => {
                tracing::error!("OAuth error: {}", msg);
                (StatusCode::BAD_REQUEST, "oauth_error", msg.clone())
            }
            AppError::SessionExpired => (
                StatusCode::UNAUTHORIZED,
                "session_expired",
                "Session has expired".to_string(),
            ),
            AppError::Database(e) => {
                tracing::error!("Database error: {}", e);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "database_error",
                    "Database error".to_string(),
                )
            }
            AppError::Internal(e) => {
                tracing::error!("Internal error: {}", e);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "internal_error",
                    "Internal server error".to_string(),
                )
            }
            AppError::Config(msg) => {
                tracing::error!("Configuration error: {}", msg);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "config_error",
                    "Configuration error".to_string(),
                )
            }
        };

        let body = ErrorResponse {
            error: error_type.to_string(),
            message,
            code: None,
        };

        (status, Json(body)).into_response()
    }
}

/// Result type alias for application errors
pub type AppResult<T> = Result<T, AppError>;
