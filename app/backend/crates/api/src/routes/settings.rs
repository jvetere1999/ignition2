/// User settings API endpoints
/// GET /api/settings - get all settings for user
/// GET /api/settings/:key - get single setting
/// POST /api/settings - upsert setting
/// DELETE /api/settings/:key - delete setting

use std::sync::Arc;

use axum::{
    extract::{Path, State, Json},
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::get,
    Extension, Router,
};
use serde_json::json;

use crate::middleware::auth::AuthContext;
use crate::state::AppState;
use super::db::user_settings_models::{UpdateSettingRequest, UserSettingsResponse};
use super::db::user_settings_repos::UserSettingsRepo;

/// Mount user settings routes
pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/", get(get_all_settings).post(upsert_setting))
        .route("/{key}", get(get_setting).delete(delete_setting))
}

/// GET /api/settings - Get all settings for authenticated user
async fn get_all_settings(
    State(state): State<Arc<AppState>>,
    Extension(auth): Extension<AuthContext>,
) -> Result<Json<UserSettingsResponse>, SettingsError> {
    let settings = UserSettingsRepo::get_all(&state.db, auth.user_id)
        .await
        .map_err(|e| SettingsError::DatabaseError(e.to_string()))?;
    
    Ok(Json(UserSettingsResponse { settings }))
}

/// GET /api/settings/:key - Get a single setting
async fn get_setting(
    State(state): State<Arc<AppState>>,
    Extension(auth): Extension<AuthContext>,
    Path(key): Path<String>,
) -> Result<Json<serde_json::Value>, SettingsError> {
    let setting = UserSettingsRepo::get_one(&state.db, auth.user_id, &key)
        .await
        .map_err(|e| SettingsError::DatabaseError(e.to_string()))?
        .ok_or_else(|| SettingsError::NotFound(format!("Setting '{}' not found", key)))?;
    
    Ok(Json(json!({
        "key": setting.key,
        "value": setting.value
    })))
}

/// POST /api/settings - Upsert a setting
async fn upsert_setting(
    State(state): State<Arc<AppState>>,
    Extension(auth): Extension<AuthContext>,
    Json(payload): Json<UpdateSettingRequest>,
) -> Result<Json<serde_json::Value>, SettingsError> {
    // Validate key
    if payload.key.is_empty() || payload.key.len() > 255 {
        return Err(SettingsError::InvalidKey("Key must be 1-255 characters".to_string()));
    }

    UserSettingsRepo::upsert(&state.db, auth.user_id, &payload)
        .await
        .map_err(|e| SettingsError::DatabaseError(e.to_string()))?;
    
    Ok(Json(json!({
        "key": payload.key,
        "value": payload.value,
        "updated": true
    })))
}

/// DELETE /api/settings/:key - Delete a setting
async fn delete_setting(
    State(state): State<Arc<AppState>>,
    Extension(auth): Extension<AuthContext>,
    Path(key): Path<String>,
) -> Result<StatusCode, SettingsError> {
    UserSettingsRepo::delete(&state.db, auth.user_id, &key)
        .await
        .map_err(|e| SettingsError::DatabaseError(e.to_string()))?;
    
    Ok(StatusCode::NO_CONTENT)
}

/// Error types for settings API
#[derive(Debug)]
pub enum SettingsError {
    InvalidKey(String),
    NotFound(String),
    DatabaseError(String),
}

impl IntoResponse for SettingsError {
    fn into_response(self) -> Response {
        let (status, error_message) = match self {
            SettingsError::InvalidKey(msg) => (StatusCode::BAD_REQUEST, msg),
            SettingsError::NotFound(msg) => (StatusCode::NOT_FOUND, msg),
            SettingsError::DatabaseError(msg) => (StatusCode::INTERNAL_SERVER_ERROR, msg),
        };

        let body = Json(json!({
            "error": error_message,
        }));

        (status, body).into_response()
    }
}
