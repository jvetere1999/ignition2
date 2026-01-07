//! CORS configuration
//!
//! Configures Cross-Origin Resource Sharing for the API.
//! Works in conjunction with CSRF protection (DEC-002=A).

use axum::http::{header, HeaderValue, Method};
use tower_http::cors::CorsLayer;

use crate::config::AppConfig;

/// Create CORS layer based on configuration
pub fn cors_layer(config: &AppConfig) -> CorsLayer {
    let mut layer = CorsLayer::new()
        // Allow credentials (cookies)
        .allow_credentials(true)
        // Allow common headers
        .allow_headers([
            header::ACCEPT,
            header::ACCEPT_LANGUAGE,
            header::AUTHORIZATION,
            header::CONTENT_LANGUAGE,
            header::CONTENT_TYPE,
            header::ORIGIN,
        ])
        // Allow common methods
        .allow_methods([
            Method::GET,
            Method::POST,
            Method::PUT,
            Method::PATCH,
            Method::DELETE,
            Method::OPTIONS,
        ])
        // Expose headers the client may need
        .expose_headers([header::CONTENT_TYPE, header::CONTENT_LENGTH]);

    // Set allowed origins
    if config.is_development() {
        // In development, allow localhost origins
        let origins: Vec<HeaderValue> = config
            .cors
            .allowed_origins
            .iter()
            .filter_map(|o| o.parse().ok())
            .collect();

        layer = layer.allow_origin(origins);
    } else {
        // In production, use explicit production origins
        let origins = [
            "https://ignition.ecent.online",
            "https://admin.ignition.ecent.online",
        ]
        .iter()
        .filter_map(|o| o.parse().ok())
        .collect::<Vec<HeaderValue>>();

        layer = layer.allow_origin(origins);
    }

    layer
}
