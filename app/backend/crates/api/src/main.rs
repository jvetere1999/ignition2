//! Ignition API Server
//!
//! Rust backend monolith for the Ignition application.
//! Handles all business logic, authentication, and data access.

use std::net::SocketAddr;
use std::sync::Arc;

use axum::Router;
use tower_http::request_id::{MakeRequestUuid, PropagateRequestIdLayer, SetRequestIdLayer};
use tower_http::trace::TraceLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod config;
mod cache;
mod db;
mod error;
mod middleware;
mod routes;
mod services;
mod shared;
mod state;
mod storage;

#[cfg(test)]
mod tests;

use config::AppConfig;
use state::AppState;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Load environment variables from .env
    dotenvy::dotenv().ok();

    // Initialize tracing
    // Load filter from env var with documented default
    // See docs/LOGGING.md for configuration options
    let default_filter = std::env::var("RUST_LOG").unwrap_or_else(|_| {
        // Default filter for development:
        // ignition_api = debug (our app logs)
        // tower_http = debug (HTTP middleware logs)
        // sqlx = warn (avoid chatty query logs)
        "ignition_api=debug,tower_http=debug,sqlx=warn".into()
    });

    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(default_filter))
        .with(tracing_subscriber::fmt::layer().json())
        .init();

    tracing::info!(
        operation = "startup",
        component = "app",
        "Initializing Ignition API"
    );

    // Load configuration
    let config = AppConfig::load()?;
    tracing::info!(
        operation = "startup",
        component = "config",
        server_host = %config.server.host,
        server_port = config.server.port,
        "Configuration loaded"
    );

    // Validate configuration - fail fast with clear error messages
    // TODO [SEC-004]: Ensure all required field combinations are validated
    // Reference: backend_configuration_patterns.md#cfg-2-missing-validation-of-required-fields
    // Roadmap: Step 2 of 3 - Call validate() on loaded config
    config.validate()?;

    // Create application state
    let state = AppState::new(&config).await?;
    let state = Arc::new(state);

    // Build the router
    let app = build_router(state);

    // Start the server
    let addr: SocketAddr = format!("{}:{}", config.server.host, config.server.port)
        .parse()
        .expect("Invalid server address");

    tracing::info!(
        operation = "startup",
        component = "server",
        http.host = %addr.ip(),
        http.port = addr.port(),
        "Starting server"
    );

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

fn build_router(state: Arc<AppState>) -> Router {
    // Create base router with state type
    let app: Router<Arc<AppState>> = Router::new()
        // Health check (no auth required)
        .merge(routes::health::router())
        // Auth routes (needs session extraction for /session endpoint, but no CSRF)
        .nest(
            "/auth",
            routes::auth::router().layer(axum::middleware::from_fn_with_state(
                state.clone(),
                middleware::auth::extract_session,
            )),
        )
        // API routes (requires auth + CSRF)
        .nest(
            "/api",
            routes::api::router()
                .layer(axum::middleware::from_fn_with_state(
                    state.clone(),
                    middleware::auth::require_auth,
                ))
                .layer(axum::middleware::from_fn(middleware::csrf::csrf_check))
                .layer(axum::middleware::from_fn_with_state(
                    state.clone(),
                    middleware::auth::extract_session,
                )),
        )
        // Reference tracks routes (requires auth + CSRF)
        .nest(
            "/reference",
            routes::reference::router()
                .layer(axum::middleware::from_fn_with_state(
                    state.clone(),
                    middleware::auth::require_auth,
                ))
                .layer(axum::middleware::from_fn(middleware::csrf::csrf_check))
                .layer(axum::middleware::from_fn_with_state(
                    state.clone(),
                    middleware::auth::extract_session,
                )),
        )
        // Frames routes (requires auth, GET only so no CSRF needed)
        .nest(
            "/frames",
            routes::frames::router()
                .layer(axum::middleware::from_fn_with_state(
                    state.clone(),
                    middleware::auth::require_auth,
                ))
                .layer(axum::middleware::from_fn_with_state(
                    state.clone(),
                    middleware::auth::extract_session,
                )),
        )
        // Blob storage routes (requires auth + CSRF)
        .nest(
            "/blobs",
            routes::blobs::router()
                .layer(axum::middleware::from_fn_with_state(
                    state.clone(),
                    middleware::auth::require_auth,
                ))
                .layer(axum::middleware::from_fn(middleware::csrf::csrf_check))
                .layer(axum::middleware::from_fn_with_state(
                    state.clone(),
                    middleware::auth::extract_session,
                )),
        )
        // Admin claiming routes (requires auth only, NOT admin role)
        .nest(
            "/admin-access",
            routes::admin::claiming_router()
                .layer(axum::middleware::from_fn_with_state(
                    state.clone(),
                    middleware::auth::require_auth,
                ))
                .layer(axum::middleware::from_fn_with_state(
                    state.clone(),
                    middleware::auth::extract_session,
                )),
        )
        // Admin routes (requires admin role + auth + CSRF)
        .nest(
            "/admin",
            routes::admin::router()
                .layer(axum::middleware::from_fn(middleware::auth::require_admin))
                .layer(axum::middleware::from_fn(middleware::csrf::csrf_check))
                .layer(axum::middleware::from_fn_with_state(
                    state.clone(),
                    middleware::auth::extract_session,
                )),
        );

    // Apply state and middleware
    app.with_state(state.clone())
        .layer(axum::middleware::from_fn(
            middleware::security_headers::add_security_headers,
        ))
        .layer(middleware::cors::cors_layer(&state.config))
        .layer(TraceLayer::new_for_http())
        .layer(PropagateRequestIdLayer::x_request_id())
        .layer(SetRequestIdLayer::x_request_id(MakeRequestUuid))
}
