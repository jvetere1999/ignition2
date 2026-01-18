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
        .route("/debug/env", get(debug_env))
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
        build_timestamp: option_env!("BUILD_TIMESTAMP")
            .unwrap_or("unknown")
            .to_string(),
    })
}

/// Debug env response
#[derive(Serialize)]
pub struct DebugEnvResponse {
    pub oauth_google_configured: bool,
    pub oauth_azure_configured: bool,
    pub google_client_id_present: bool,
    pub google_client_secret_present: bool,
    pub azure_client_id_present: bool,
    pub azure_tenant_id_present: bool,
    pub env_auth_oauth_google_client_id: bool,
    pub env_auth_oauth_google_client_secret: bool,
    pub config_oauth_is_some: bool,
    pub config_oauth_google_is_some: bool,
}

/// Debug env handler - shows what the Rust code sees
async fn debug_env(State(state): State<Arc<AppState>>) -> Json<DebugEnvResponse> {
    let env_google_id = std::env::var("AUTH_OAUTH_GOOGLE_CLIENT_ID").unwrap_or_default();
    let env_google_secret = std::env::var("AUTH_OAUTH_GOOGLE_CLIENT_SECRET").unwrap_or_default();

    let oauth_config = &state.config.auth.oauth;
    let google_config = oauth_config.as_ref().and_then(|o| o.google.as_ref());
    let azure_config = oauth_config.as_ref().and_then(|o| o.azure.as_ref());

    Json(DebugEnvResponse {
        oauth_google_configured: google_config
            .map(|g| !g.client_id.is_empty() && !g.client_secret.is_empty())
            .unwrap_or(false),
        oauth_azure_configured: azure_config
            .map(|a| !a.client_id.is_empty() && a.tenant_id.is_some())
            .unwrap_or(false),
        google_client_id_present: google_config
            .map(|g| !g.client_id.is_empty())
            .unwrap_or(false),
        google_client_secret_present: google_config
            .map(|g| !g.client_secret.is_empty())
            .unwrap_or(false),
        azure_client_id_present: azure_config
            .map(|a| !a.client_id.is_empty())
            .unwrap_or(false),
        azure_tenant_id_present: azure_config
            .and_then(|a| a.tenant_id.as_ref())
            .map(|t| !t.is_empty())
            .unwrap_or(false),
        env_auth_oauth_google_client_id: !env_google_id.is_empty(),
        env_auth_oauth_google_client_secret: !env_google_secret.is_empty(),
        config_oauth_is_some: oauth_config.is_some(),
        config_oauth_google_is_some: google_config.is_some(),
    })
}
