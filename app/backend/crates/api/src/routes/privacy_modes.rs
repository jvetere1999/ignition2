use crate::db::privacy_modes_models::*;
use crate::db::privacy_modes_repos::PrivacyModesRepo;
use crate::error::AppError;
use crate::middleware::auth::AuthContext;
use crate::middleware::trust_boundary::*;
use crate::state::AppState;
use axum::{
    extract::{Extension, Json, State},
    http::StatusCode,
    routing::{get, post},
    Router,
};
use std::sync::Arc;

pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/preferences", get(get_preferences))
        .route("/preferences", post(update_preferences))
}

/// GET /api/privacy/preferences
/// Get user's privacy preferences
///
/// # Trust Boundary
/// server_trusted!() - Returns user's privacy settings (non-sensitive configuration)
async fn get_preferences(
    State(state): State<Arc<AppState>>,
    Extension(auth): Extension<AuthContext>,
) -> Result<(StatusCode, Json<PrivacyPreferencesResponse>), AppError> {
    let prefs = PrivacyModesRepo::get_preferences(&state.db, auth.user_id)
        .await
        .map_err(|e| {
            tracing::error!("Failed to fetch privacy preferences: {}", e);
            AppError::Internal("Failed to fetch privacy preferences".to_string())
        })?;

    Ok((
        StatusCode::OK,
        Json(PrivacyPreferencesResponse {
            default_mode: prefs.default_mode,
            show_privacy_toggle: prefs.show_privacy_toggle,
            exclude_private_from_search: prefs.exclude_private_from_search,
            private_content_retention_days: prefs.private_content_retention_days,
            standard_content_retention_days: prefs.standard_content_retention_days,
        }),
    ))
}

/// POST /api/privacy/preferences
/// Update user's privacy preferences
///
/// # Trust Boundary
/// server_trusted!() - Updates user's privacy configuration (non-cryptographic)
async fn update_preferences(
    State(state): State<Arc<AppState>>,
    Extension(auth): Extension<AuthContext>,
    Json(req): Json<UpdatePrivacyPreferencesRequest>,
) -> Result<(StatusCode, Json<PrivacyPreferencesResponse>), AppError> {
    // Validate inputs
    if let Some(ref mode) = req.default_mode {
        if PrivacyMode::from_str(mode).is_none() {
            return Err(AppError::BadRequest(
                "Invalid privacy mode. Must be 'standard' or 'private'.".to_string(),
            ));
        }
    }

    if let Some(days) = req.private_content_retention_days {
        if days < 0 || days > 365 {
            return Err(AppError::BadRequest(
                "Private content retention must be between 0 and 365 days.".to_string(),
            ));
        }
    }

    let prefs = PrivacyModesRepo::update_preferences(&state.db, auth.user_id, &req)
        .await
        .map_err(|e| {
            tracing::error!("Failed to update privacy preferences: {}", e);
            AppError::Internal("Failed to update privacy preferences".to_string())
        })?;

    // Log privacy preference change
    tracing::info!(
        user_id = %auth.user_id,
        "Privacy preferences updated: default_mode={}, show_toggle={}, exclude_private={}",
        prefs.default_mode,
        prefs.show_privacy_toggle,
        prefs.exclude_private_from_search
    );

    Ok((
        StatusCode::OK,
        Json(PrivacyPreferencesResponse {
            default_mode: prefs.default_mode,
            show_privacy_toggle: prefs.show_privacy_toggle,
            exclude_private_from_search: prefs.exclude_private_from_search,
            private_content_retention_days: prefs.private_content_retention_days,
            standard_content_retention_days: prefs.standard_content_retention_days,
        }),
    ))
}
