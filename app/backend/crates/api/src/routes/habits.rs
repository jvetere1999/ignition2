//! Habits routes
//!
//! Routes for habit tracking.

use std::sync::Arc;

use axum::{
    extract::{Extension, Path, State},
    http::StatusCode,
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::db::habits_goals_models::*;
use crate::db::habits_goals_repos::HabitsRepo;
use crate::db::models::User;
use crate::error::AppError;
use crate::state::AppState;

/// Create habits routes
pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/", get(list_habits).post(create_habit))
        .route("/archived", get(list_archived_habits))
        .route("/{id}/complete", post(complete_habit))
}

// ============================================================================
// RESPONSE WRAPPERS
// ============================================================================

#[derive(Serialize)]
struct HabitResponseWrapper {
    habit: HabitResponse,
}

#[derive(Serialize)]
struct HabitsListWrapper {
    habits: Vec<HabitResponse>,
    total: i64,
}

#[derive(Serialize)]
struct CompleteResultWrapper {
    result: CompleteHabitResult,
}

// ============================================================================
// HANDLERS
// ============================================================================

/// GET /habits
/// List active habits with today's completion status
async fn list_habits(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<User>,
) -> Result<Json<HabitsListWrapper>, AppError> {
    let result = HabitsRepo::list_active(&state.db, user.id).await?;

    Ok(Json(HabitsListWrapper { habits: result.habits, total: result.total }))
}

/// GET /habits/archived
/// List archived habits
async fn list_archived_habits(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<User>,
) -> Result<Json<HabitsListWrapper>, AppError> {
    let result = HabitsRepo::list_archived(&state.db, user.id).await?;

    Ok(Json(HabitsListWrapper { habits: result.habits, total: result.total }))
}

/// POST /habits
/// Create a new habit
async fn create_habit(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<User>,
    Json(req): Json<CreateHabitRequest>,
) -> Result<(StatusCode, Json<HabitResponseWrapper>), AppError> {
    let habit = HabitsRepo::create(&state.db, user.id, &req).await?;

    Ok((StatusCode::CREATED, Json(HabitResponseWrapper {
        habit: HabitResponse {
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
        },
    })))
}

#[derive(Debug, Deserialize)]
struct CompleteHabitBody {
    notes: Option<String>,
}

/// POST /habits/:id/complete
/// Complete a habit for today
async fn complete_habit(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<User>,
    Path(id): Path<Uuid>,
    body: Option<Json<CompleteHabitBody>>,
) -> Result<Json<CompleteResultWrapper>, AppError> {
    let notes = body.and_then(|b| b.notes.clone());
    let result = HabitsRepo::complete_habit(&state.db, id, user.id, notes.as_deref()).await?;

    Ok(Json(CompleteResultWrapper { result }))
}
