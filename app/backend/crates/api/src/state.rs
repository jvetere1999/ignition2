//! Application state shared across handlers

use std::sync::Arc;

use sqlx::PgPool;

use crate::config::AppConfig;
use crate::storage::StorageClient;

/// Shared application state
#[derive(Clone)]
pub struct AppState {
    /// Application configuration
    pub config: Arc<AppConfig>,
    /// Database connection pool
    pub db: PgPool,
    /// Storage client (R2/S3) - optional, only available if configured
    pub storage: Option<StorageClient>,
}

impl AppState {
    /// Create new application state
    pub async fn new(config: &AppConfig) -> anyhow::Result<Self> {
        // Create database pool
        let db = PgPool::connect(&config.database.url).await?;

        // Run pending migrations (in development)
        if config.is_development() {
            tracing::info!("Running database migrations...");
            // TODO: sqlx::migrate!().run(&db).await?;
        }

        // Create storage client if configured
        let storage = if config.storage.endpoint.is_some() {
            match StorageClient::new(&config.storage).await {
                Ok(client) => {
                    tracing::info!("Storage client initialized");
                    Some(client)
                }
                Err(e) => {
                    tracing::warn!("Storage client not available: {}", e);
                    None
                }
            }
        } else {
            tracing::info!("Storage not configured");
            None
        };

        Ok(Self {
            config: Arc::new(config.clone()),
            db,
            storage,
        })
    }
}
