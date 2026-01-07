//! API routes (requires authentication)
//!
//! All business logic routes. Requires authenticated session.

use std::sync::Arc;

use axum::{
    routing::{get, post},
    Json, Router,
};
use serde::Serialize;

use crate::state::AppState;

/// Create API routes
pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        // Stub endpoints that will be filled in during feature migration
        .route("/", get(api_info))
        // Focus module
        .nest("/focus", focus_routes())
        // Quests module
        .nest("/quests", quests_routes())
        // Habits module
        .nest("/habits", habits_routes())
        // Goals module
        .nest("/goals", goals_routes())
        // Calendar module
        .nest("/calendar", calendar_routes())
        // Daily plan module
        .nest("/daily-plan", daily_plan_routes())
        // Exercise module
        .nest("/exercise", exercise_routes())
        // Market module
        .nest("/market", market_routes())
        // Reference tracks module
        .nest("/reference", reference_routes())
        // Learn module
        .nest("/learn", learn_routes())
        // User module
        .nest("/user", user_routes())
        // Onboarding module
        .nest("/onboarding", onboarding_routes())
        // Infobase module
        .nest("/infobase", infobase_routes())
        // Ideas module
        .nest("/ideas", ideas_routes())
        // Feedback module
        .nest("/feedback", feedback_routes())
        // Analysis module
        .nest("/analysis", analysis_routes())
        // Books module
        .nest("/books", books_routes())
        // Programs module
        .nest("/programs", programs_routes())
        // Gamification module
        .nest("/gamification", gamification_routes())
        // Blob storage module (real implementation)
        .nest("/blobs", super::blobs::router())
    // Apply middleware (CSRF and auth will be added at top level)
}

#[derive(Serialize)]
struct ApiInfo {
    version: String,
    modules: Vec<String>,
}

/// API info endpoint
async fn api_info() -> Json<ApiInfo> {
    Json(ApiInfo {
        version: env!("CARGO_PKG_VERSION").to_string(),
        modules: vec![
            "focus".to_string(),
            "quests".to_string(),
            "habits".to_string(),
            "goals".to_string(),
            "calendar".to_string(),
            "daily-plan".to_string(),
            "exercise".to_string(),
            "market".to_string(),
            "reference".to_string(),
            "learn".to_string(),
            "user".to_string(),
            "onboarding".to_string(),
            "infobase".to_string(),
            "ideas".to_string(),
            "feedback".to_string(),
            "analysis".to_string(),
            "books".to_string(),
            "programs".to_string(),
            "gamification".to_string(),
            "blobs".to_string(),
        ],
    })
}

// Stub route builders for each module
// These will be expanded during feature migration

fn focus_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/", get(stub_list).post(stub_create))
        .route("/active", get(stub_get))
        .route("/pause", post(stub_action))
        .route("/:id/complete", post(stub_action))
        .route("/:id/abandon", post(stub_action))
}

fn quests_routes() -> Router<Arc<AppState>> {
    Router::new().route("/", get(stub_list))
}

fn habits_routes() -> Router<Arc<AppState>> {
    Router::new().route("/", get(stub_list).post(stub_create))
}

fn goals_routes() -> Router<Arc<AppState>> {
    Router::new().route("/", get(stub_list).post(stub_create))
}

fn calendar_routes() -> Router<Arc<AppState>> {
    Router::new().route("/", get(stub_list).post(stub_create))
}

fn daily_plan_routes() -> Router<Arc<AppState>> {
    Router::new().route("/", get(stub_list))
}

fn exercise_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/", get(stub_list))
        .route("/seed", post(stub_action))
}

fn market_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/", get(stub_list))
        .route("/items", get(stub_list))
        .route("/purchase", post(stub_action))
        .route("/redeem", post(stub_action))
}

fn reference_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/tracks", get(stub_list))
        .route("/upload", post(stub_create))
}

fn learn_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/", get(stub_list))
        .route("/progress", get(stub_get).post(stub_action))
        .route("/review", get(stub_list))
}

fn user_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/export", get(stub_get))
        .route("/delete", post(stub_action))
}

fn onboarding_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/", get(stub_get))
        .route("/start", post(stub_action))
        .route("/step", post(stub_action))
        .route("/skip", post(stub_action))
        .route("/reset", post(stub_action))
}

fn infobase_routes() -> Router<Arc<AppState>> {
    Router::new().route("/", get(stub_list))
}

fn ideas_routes() -> Router<Arc<AppState>> {
    Router::new().route("/", get(stub_list).post(stub_create))
}

fn feedback_routes() -> Router<Arc<AppState>> {
    Router::new().route("/", post(stub_create))
}

fn analysis_routes() -> Router<Arc<AppState>> {
    Router::new().route("/", get(stub_get))
}

fn books_routes() -> Router<Arc<AppState>> {
    Router::new().route("/", get(stub_list).post(stub_create))
}

fn programs_routes() -> Router<Arc<AppState>> {
    Router::new().route("/", get(stub_list))
}

fn gamification_routes() -> Router<Arc<AppState>> {
    Router::new().route("/teaser", get(stub_get))
}

// Stub handlers
#[allow(dead_code)]
async fn stub_list() -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "data": [],
        "message": "Stub endpoint - feature migration pending"
    }))
}

async fn stub_get() -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "data": null,
        "message": "Stub endpoint - feature migration pending"
    }))
}

async fn stub_create() -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "message": "Stub endpoint - feature migration pending"
    }))
}

async fn stub_action() -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "message": "Stub endpoint - feature migration pending"
    }))
}
