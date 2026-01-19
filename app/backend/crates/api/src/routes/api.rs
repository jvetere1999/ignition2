//! API routes (requires authentication)
//!
//! All business logic routes. Requires authenticated session.

use std::sync::Arc;

use axum::{routing::get, Json, Router};
use serde::Serialize;

use crate::state::AppState;

/// Create API routes
pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        // Stub endpoints that will be filled in during feature migration
        .route("/", get(api_info))
        // Focus module (Wave 2 - real implementation)
        .nest("/focus", super::focus::router())
        // Quests module (Wave 2 - real implementation)
        .nest("/quests", super::quests::router())
        // Habits module (Wave 2 - real implementation)
        .nest("/habits", super::habits::router())
        // Goals module (Wave 2 - real implementation)
        .nest("/goals", super::goals::router())
        // Calendar module (Wave 4 - real implementation)
        .nest("/calendar", super::calendar::router())
        // Daily plan module (Wave 4 - real implementation)
        .nest("/daily-plan", super::daily_plan::router())
        // Exercise module (Wave 3 - real implementation)
        .nest("/exercise", super::exercise::router())
        // Market module (Wave 3 - real implementation)
        .nest("/market", super::market::router())
        // Reference tracks module (Wave 5 - real implementation)
        .nest("/reference", super::reference::router())
        // References library module (stateless sync - 2026-01-10)
        .nest("/references", super::references_library::router())
        // Frames module (Wave 5 - real implementation)
        .nest("/frames", super::frames::router())
        // Learn module (Wave 3 - real implementation)
        .nest("/learn", super::learn::router())
        // User module (Wave 4 - real implementation)
        .nest("/user", super::user::router())
        // Onboarding module (Wave 4 - real implementation)
        .nest("/onboarding", super::onboarding::router())
        // Infobase module (Wave 4 - real implementation)
        .nest("/infobase", super::infobase::router())
        // Ideas module (Wave 4 - real implementation)
        .nest("/ideas", super::ideas::router())
        // Feedback module (Wave 4 - real implementation)
        .nest("/feedback", super::feedback::router())
        // Analysis module
        .nest("/analysis", analysis_routes())
        // Books module (Wave 3 - real implementation)
        .nest("/books", super::books::router())
        // Programs are handled under /exercise/programs
        // Gamification module (real implementation)
        .nest("/gamification", super::gamification::router())
        // Blob storage module (real implementation)
        .nest("/blobs", super::blobs::router())
        // Sync module - lightweight polling endpoints for UI optimization
        .nest("/sync", super::sync::router())
        // Settings module
        .nest("/settings", super::settings::router())
        // Today module - dashboard data aggregation (Wave 5)
        .nest("/today", super::today::router())
        // Crypto policy module - E2EE algorithm versioning & management
        .nest("/crypto-policy", super::crypto_policy::router())
        // DAW project file tracking - versioning and upload management
        .nest("/daw", super::daw_projects::router())
        // Privacy modes module - Private vs Standard work classification
        .nest("/privacy", super::privacy_modes::router())
        // Search module - client-side encrypted search index
        .nest("/search", super::search::router())
        // Vault module - E2EE vault lock/unlock
        .nest("/vault", super::vault::router())
        // Vault recovery module - recovery codes and passphrase reset
        .nest("/vault", super::vault_recovery::router())
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
            "books".to_string(),
            "blobs".to_string(),
            "calendar".to_string(),
            "crypto-policy".to_string(),
            "daily-plan".to_string(),
            "exercise".to_string(),
            "feedback".to_string(),
            "focus".to_string(),
            "gamification".to_string(),
            "goals".to_string(),
            "habits".to_string(),
            "ideas".to_string(),
            "infobase".to_string(),
            "learn".to_string(),
            "market".to_string(),
            "onboarding".to_string(),
            "quests".to_string(),
            "reference".to_string(),
            "search".to_string(),
            "settings".to_string(),
            "sync".to_string(),
            "user".to_string(),
            "vault".to_string(),
            "analysis".to_string(),
        ],
    })
}

// Stub route builders for modules not yet migrated
// Note: focus, quests, habits, goals, exercise, market, learn, books, gamification, blobs are using real implementations
// Wave 4 migrated: calendar, daily-plan, user, onboarding, infobase, ideas, feedback
// Wave 5 migrated: reference, frames (2026-01-10)

fn analysis_routes() -> Router<Arc<AppState>> {
    // Analysis is handled as part of reference tracks - this is a legacy compatibility route
    Router::new().route("/", get(stub_get))
}

// Stub handlers for legacy routes
async fn stub_get() -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "data": null,
        "message": "This endpoint has been moved. Use /api/reference/tracks/:id/analysis instead."
    }))
}
