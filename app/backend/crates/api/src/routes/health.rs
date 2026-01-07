//! Health check routes
//!
//! Simple health check endpoint for load balancers and monitoring.

use std::sync::Arc;

use axum::{routing::get, Json, Router};
use serde::Serialize;

use crate::state::AppState;

/// Health check response
#[derive(Serialize)]
pub struct HealthResponse {
    pub status: String,
    pub version: String,
    pub timestamp: String,
}

/// Create health routes
pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/health", get(health_check))
        .route("/", get(root))
}

/// Root endpoint
async fn root() -> &'static str {
    "Ignition API"
}

/// Health check handler
async fn health_check() -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "healthy".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        timestamp: chrono::Utc::now().to_rfc3339(),
    })
}
