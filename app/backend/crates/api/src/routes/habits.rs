//! Habits routes
//!
//! Routes for habit tracking: create, list, complete, delete, analytics.

use std::sync::Arc;

use axum::{
    extract::{Extension, Path, State},
    http::StatusCode,
    routing::{delete, get, post},
    Json, Router,
};
use uuid::Uuid;

use crate::db::habits_goals_models::{
    CompleteHabitResult, CreateHabitRequest, HabitAnalyticsResponse, HabitResponse,
    HabitsListResponse,
};
use crate::db::habits_goals_repos::HabitsRepo;
use crate::db::models::User;
use crate::error::AppError;
use crate::shared::http::response::{ApiResponse, Created, Deleted, PaginatedResponse};
use crate::state::AppState;

/// Create habits routes
pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/", get(list_habits).post(create_habit))
        .route("/analytics", get(get_habit_analytics))
        .route("/archived", get(list_archived_habits))
        .route("/{id}/complete", post(complete_habit))
        .route("/{id}", delete(delete_habit))
}

// ============================================================================
// HANDLERS
// ============================================================================

/// GET /habits
/// List active habits with today's completion status
async fn list_habits(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<User>,
) -> Result<Json<PaginatedResponse<HabitResponse>>, AppError> {
    let result = HabitsRepo::list_active(&state.db, user.id).await?;

    Ok(Json(PaginatedResponse::new(
        result.habits,
        result.total,
        1,
        result.total,
    )))
}

/// GET /habits/archived
/// List archived habits
async fn list_archived_habits(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<User>,
) -> Result<Json<PaginatedResponse<HabitResponse>>, AppError> {
    let result = HabitsRepo::list_archived(&state.db, user.id).await?;

    Ok(Json(PaginatedResponse::new(
        result.habits,
        result.total,
        1,
        result.total,
    )))
}

/// POST /habits
/// Create a new habit
async fn create_habit(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<User>,
    Json(req): Json<CreateHabitRequest>,
) -> Result<(StatusCode, Json<Created<HabitResponse>>), AppError> {
    let habit = HabitsRepo::create(&state.db, user.id, &req).await?;

    let response = HabitResponse {
        id: habit.id,
        name: habit.name,
        description: habit.description,
        frequency: habit.frequency,
        target_count: habit.target_count,
        icon: habit.icon,
        color: habit.color,
        is_active: habit.is_active,
        current_streak: habit.current_streak,
        longest_streak: habit.longest_streak,
        last_completed_at: habit.last_completed_at,
        completed_today: false,
        sort_order: habit.sort_order,
    };

    Ok((StatusCode::CREATED, Json(Created::new(response))))
}

/// POST /habits/:id/complete
/// Complete a habit for today
async fn complete_habit(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<User>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<CompleteHabitResult>>, AppError> {
    let result = HabitsRepo::complete_habit(&state.db, id, user.id, None).await?;
    Ok(Json(ApiResponse::ok(result)))
}

/// DELETE /habits/:id
/// Archive a habit
async fn delete_habit(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<User>,
    Path(id): Path<Uuid>,
) -> Result<Json<Deleted>, AppError> {
    HabitsRepo::archive(&state.db, id, user.id).await?;
    Ok(Json(Deleted::ok()))
}

/// GET /habits/analytics
/// Get habit analytics summary
async fn get_habit_analytics(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<User>,
) -> Result<Json<ApiResponse<HabitAnalyticsResponse>>, AppError> {
    let analytics = HabitsRepo::get_analytics(&state.db, user.id).await?;
    Ok(Json(ApiResponse::ok(analytics)))
}
