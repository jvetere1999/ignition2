//! Quests routes
//!
//! Routes for quest system.

use std::sync::Arc;

use axum::{
    extract::{Extension, Path, Query, State},
    http::StatusCode,
    routing::{get, post},
    Json, Router,
};
use serde::Deserialize;
use uuid::Uuid;

use crate::db::models::User;
use crate::db::quests_models::*;
use crate::db::quests_repos::QuestsRepo;
use crate::error::AppError;
use crate::shared::http::response::{ApiResponse, Created, PaginatedResponse};
use crate::state::AppState;

/// Create quests routes
pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/", get(list_quests).post(create_quest))
        .route("/{id}", get(get_quest))
        .route("/{id}/accept", post(accept_quest))
        .route("/{id}/progress", post(update_progress))
        .route("/{id}/complete", post(complete_quest))
        .route("/{id}/abandon", post(abandon_quest))
}

// ============================================================================
// QUERY PARAMS
// ============================================================================

#[derive(Debug, Deserialize)]
pub struct ListQuestsQuery {
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateQuestProgressRequest {
    pub progress: i32,
}

// ============================================================================
// HANDLERS
// ============================================================================

/// GET /quests
/// List quests for user
async fn list_quests(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<User>,
    Query(query): Query<ListQuestsQuery>,
) -> Result<Json<PaginatedResponse<QuestResponse>>, AppError> {
    let result = QuestsRepo::list(&state.db, user.id, query.status.as_deref()).await?;

    Ok(Json(PaginatedResponse::new(
        result.quests,
        result.total,
        1,
        result.total,
    )))
}

/// POST /quests
/// Create a new quest
async fn create_quest(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<User>,
    Json(req): Json<CreateQuestRequest>,
) -> Result<(StatusCode, Json<Created<QuestResponse>>), AppError> {
    let quest = QuestsRepo::create(&state.db, user.id, &req).await?;

    Ok((StatusCode::CREATED, Json(Created::new(quest.into()))))
}

/// GET /quests/:id
/// Get a quest
async fn get_quest(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<User>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<QuestResponse>>, AppError> {
    let quest = QuestsRepo::get_by_id(&state.db, id, user.id).await?;
    let quest = quest.ok_or_else(|| AppError::not_found("Quest not found"))?;

    Ok(Json(ApiResponse::ok(quest.into())))
}

/// POST /quests/:id/accept
/// Accept a quest
async fn accept_quest(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<User>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<QuestResponse>>, AppError> {
    let quest = QuestsRepo::accept_quest(&state.db, id, user.id).await?;

    Ok(Json(ApiResponse::ok(quest.into())))
}

/// POST /quests/:id/progress
/// Update quest progress
async fn update_progress(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<User>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateQuestProgressRequest>,
) -> Result<Json<ApiResponse<QuestResponse>>, AppError> {
    let quest = QuestsRepo::update_progress(&state.db, id, user.id, req.progress).await?;

    Ok(Json(ApiResponse::ok(quest.into())))
}

/// POST /quests/:id/complete
/// Complete a quest
async fn complete_quest(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<User>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<CompleteQuestResult>>, AppError> {
    let result = QuestsRepo::complete_quest(&state.db, id, user.id).await?;

    Ok(Json(ApiResponse::ok(result)))
}

/// POST /quests/:id/abandon
/// Abandon a quest
async fn abandon_quest(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<User>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<QuestResponse>>, AppError> {
    let quest = QuestsRepo::abandon_quest(&state.db, id, user.id).await?;

    Ok(Json(ApiResponse::ok(quest.into())))
}
