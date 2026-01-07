//! Admin routes (requires admin role)
//!
//! Admin-only functionality accessible at /admin/*.
//! Per DEC-004=B: Role-based access using DB-backed roles.

use std::sync::Arc;

use axum::{
    extract::State,
    routing::{get, post},
    Json, Router,
};
use serde::Serialize;

use crate::state::AppState;

/// Create admin routes
pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        // Admin info
        .route("/", get(admin_info))
        // User management
        .nest("/users", users_routes())
        // Quest management
        .nest("/quests", quests_routes())
        // Skill management
        .nest("/skills", skills_routes())
        // Feedback management
        .nest("/feedback", feedback_routes())
        // Content management
        .nest("/content", content_routes())
        // Statistics
        .nest("/stats", stats_routes())
        // Database operations
        .nest("/db", db_routes())
        // Backup/restore
        .route("/backup", get(get_backup).post(create_backup))
        .route("/restore", post(restore_backup))
        // Database health
        .route("/db-health", get(db_health))
    // Note: Auth + admin role + CSRF middleware applied at top level
}

#[derive(Serialize)]
struct AdminInfo {
    version: String,
    modules: Vec<String>,
    role_required: String,
}

/// Admin info endpoint
async fn admin_info() -> Json<AdminInfo> {
    Json(AdminInfo {
        version: env!("CARGO_PKG_VERSION").to_string(),
        modules: vec![
            "users".to_string(),
            "quests".to_string(),
            "skills".to_string(),
            "feedback".to_string(),
            "content".to_string(),
            "stats".to_string(),
            "db".to_string(),
            "backup".to_string(),
        ],
        role_required: "admin".to_string(),
    })
}

// User management routes
fn users_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/", get(list_users))
        .route("/:id", get(get_user).delete(delete_user))
        .route("/:id/cleanup", post(cleanup_user))
}

// Quest management routes
fn quests_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/", get(list_quests).post(create_quest))
        .route(
            "/:id",
            get(get_quest).put(update_quest).delete(delete_quest),
        )
}

// Skill management routes
fn skills_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/", get(list_skills).post(create_skill))
        .route(
            "/:id",
            get(get_skill).put(update_skill).delete(delete_skill),
        )
}

// Feedback management routes
fn feedback_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/", get(list_feedback))
        .route("/:id", get(get_feedback).put(update_feedback))
}

// Content management routes
fn content_routes() -> Router<Arc<AppState>> {
    Router::new().route("/", get(list_content))
}

// Statistics routes
fn stats_routes() -> Router<Arc<AppState>> {
    Router::new().route("/", get(get_stats))
}

// Database operations routes
fn db_routes() -> Router<Arc<AppState>> {
    Router::new().route("/health", get(db_health))
}

// Stub handlers
async fn list_users() -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "users": [],
        "message": "Stub - admin feature migration pending"
    }))
}

async fn get_user() -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "user": null,
        "message": "Stub - admin feature migration pending"
    }))
}

async fn delete_user() -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "message": "Stub - admin feature migration pending"
    }))
}

async fn cleanup_user() -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "message": "Stub - admin feature migration pending"
    }))
}

async fn list_quests() -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "quests": [],
        "message": "Stub - admin feature migration pending"
    }))
}

async fn get_quest() -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "quest": null,
        "message": "Stub - admin feature migration pending"
    }))
}

async fn create_quest() -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "message": "Stub - admin feature migration pending"
    }))
}

async fn update_quest() -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "message": "Stub - admin feature migration pending"
    }))
}

async fn delete_quest() -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "message": "Stub - admin feature migration pending"
    }))
}

async fn list_skills() -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "skills": [],
        "message": "Stub - admin feature migration pending"
    }))
}

async fn get_skill() -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "skill": null,
        "message": "Stub - admin feature migration pending"
    }))
}

async fn create_skill() -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "message": "Stub - admin feature migration pending"
    }))
}

async fn update_skill() -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "message": "Stub - admin feature migration pending"
    }))
}

async fn delete_skill() -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "message": "Stub - admin feature migration pending"
    }))
}

async fn list_feedback() -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "feedback": [],
        "message": "Stub - admin feature migration pending"
    }))
}

async fn get_feedback() -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "feedback": null,
        "message": "Stub - admin feature migration pending"
    }))
}

async fn update_feedback() -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "message": "Stub - admin feature migration pending"
    }))
}

async fn list_content() -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "content": [],
        "message": "Stub - admin feature migration pending"
    }))
}

async fn get_stats() -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "stats": {},
        "message": "Stub - admin feature migration pending"
    }))
}

async fn db_health(State(state): State<Arc<AppState>>) -> Json<serde_json::Value> {
    // Simple database health check
    let health = sqlx::query("SELECT 1")
        .fetch_one(&state.db)
        .await
        .map(|_| "healthy")
        .unwrap_or("unhealthy");

    Json(serde_json::json!({
        "database": health
    }))
}

async fn get_backup() -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "backups": [],
        "message": "Stub - admin feature migration pending"
    }))
}

async fn create_backup() -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "message": "Stub - admin feature migration pending"
    }))
}

async fn restore_backup() -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "message": "Stub - admin feature migration pending"
    }))
}
