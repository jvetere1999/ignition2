//! Health check routes
//!
//! Simple health check endpoint for load balancers and monitoring.

use std::sync::Arc;

use axum::{extract::State, routing::get, Json, Router};
use serde::Serialize;

use crate::state::AppState;

/// Health check response
#[derive(Serialize)]
pub struct HealthResponse {
    pub status: String,
    pub version: String,
    pub schema_version: Option<i64>,
    pub timestamp: String,
}

/// Version info response
#[derive(Serialize)]
pub struct VersionResponse {
    pub api_version: String,
    pub schema_version: Option<i64>,
    pub rust_version: String,
    pub build_timestamp: String,
}

/// Create health routes
pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/health", get(health_check))
        .route("/version", get(version_info))
        .route("/", get(root))
}

/// Root endpoint
async fn root() -> &'static str {
    "Ignition API"
}

/// Health check handler
async fn health_check(State(state): State<Arc<AppState>>) -> Json<HealthResponse> {
    let schema_version = state.get_schema_version().await;
    
    Json(HealthResponse {
        status: "healthy".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        schema_version,
        timestamp: chrono::Utc::now().to_rfc3339(),
    })
}

/// Version info handler
async fn version_info(State(state): State<Arc<AppState>>) -> Json<VersionResponse> {
    let schema_version = state.get_schema_version().await;
    
    Json(VersionResponse {
        api_version: env!("CARGO_PKG_VERSION").to_string(),
        schema_version,
        rust_version: env!("CARGO_PKG_RUST_VERSION").to_string(),
        build_timestamp: option_env!("BUILD_TIMESTAMP").unwrap_or("unknown").to_string(),
    })
}
