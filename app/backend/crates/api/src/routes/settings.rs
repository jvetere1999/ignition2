/// User settings API endpoints
/// GET /api/settings - get all settings for user
/// PATCH /api/settings - update settings
use std::sync::Arc;

use axum::{
    extract::State,
    routing::{get, patch},
    Extension, Json, Router,
};

use crate::db::platform_models::{UpdateUserSettingsRequest, UserSettingsResponse};
use crate::db::platform_repos::UserSettingsRepo;
use crate::error::AppError;
use crate::middleware::auth::AuthContext;
use crate::shared::http::response::ApiResponse;
use crate::state::AppState;

/// Mount user settings routes
pub fn router() -> Router<Arc<AppState>> {
    Router::new().route("/", get(get_settings).patch(update_settings))
}

/// GET /api/settings - Get all settings for authenticated user
async fn get_settings(
    State(state): State<Arc<AppState>>,
    Extension(auth): Extension<AuthContext>,
) -> Result<Json<ApiResponse<UserSettingsResponse>>, AppError> {
    let settings = UserSettingsRepo::get(&state.db, auth.user_id).await?;
    Ok(Json(ApiResponse::ok(settings)))
}

/// PATCH /api/settings - Update user settings
async fn update_settings(
    State(state): State<Arc<AppState>>,
    Extension(auth): Extension<AuthContext>,
    Json(payload): Json<UpdateUserSettingsRequest>,
) -> Result<Json<ApiResponse<UserSettingsResponse>>, AppError> {
    let updated = UserSettingsRepo::update(&state.db, auth.user_id, &payload).await?;
    Ok(Json(ApiResponse::ok(updated)))
}
