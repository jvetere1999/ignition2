//! Application state shared across handlers

use std::sync::Arc;
use std::time::Duration;

use sqlx::postgres::PgPoolOptions;
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
        // Log the database URL (redacted for security)
        let db_url = &config.database.url;
        tracing::debug!(
            operation = "startup",
            component = "database",
            db_url_length = db_url.len(),
            "DATABASE_URL received"
        );

        if db_url.is_empty() || db_url == "postgres://localhost/ignition" {
            tracing::error!(
                error.type = "config",
                error.message = "DATABASE_URL not configured",
                operation = "startup",
                "Database configuration missing"
            );
            return Err(anyhow::anyhow!(
                "DATABASE_URL environment variable not configured"
            ));
        }

        let redacted_url = if db_url.contains('@') {
            let parts: Vec<&str> = db_url.splitn(2, '@').collect();
            format!("***@{}", parts.get(1).unwrap_or(&"unknown"))
        } else {
            "***".to_string()
        };
        tracing::info!(
            operation = "startup",
            component = "database",
            redacted_url = %redacted_url,
            "Connecting to database"
        );

        // Create database pool with explicit timeout settings
        // Cloudflare containers may have network latency, so we use conservative timeouts
        let db = PgPoolOptions::new()
            .max_connections(config.database.pool_size)
            .acquire_timeout(Duration::from_secs(30))
            .idle_timeout(Duration::from_secs(600))
            .connect(&config.database.url)
            .await
            .map_err(|e| {
                tracing::error!(
                    error.type = "connection",
                    error.message = %e,
                    operation = "database_connection",
                    db.pool_size = config.database.pool_size,
                    "Failed to connect to database"
                );
                e
            })?;

        tracing::info!(
            operation = "startup",
            component = "database",
            db.pool_size = config.database.pool_size,
            "Database connection pool created"
        );

        // ✓ Migrations are now handled by the deployment pipeline (wipe-and-rebuild-neon job)
        // ✓ Backend no longer runs migrations on startup to avoid conflicts
        // ✓ Database schema is verified and ready before container deployment
        tracing::info!(
            operation = "startup",
            component = "migrations",
            "Database ready - migrations pre-applied by deployment pipeline"
        );

        // Create storage client if configured
        let storage = if config.storage.endpoint.is_some() {
            match StorageClient::new(&config.storage).await {
                Ok(client) => {
                    tracing::debug!(
                        operation = "startup",
                        component = "storage",
                        "Storage client initialized successfully"
                    );
                    Some(client)
                }
                Err(e) => {
                    tracing::warn!(
                        error.type = "storage",
                        error.message = %e,
                        operation = "startup",
                        component = "storage",
                        "Storage client initialization failed - using fallback"
                    );
                    None
                }
            }
        } else {
            tracing::info!(
                operation = "startup",
                component = "storage",
                status = "disabled",
                "Storage not configured - feature disabled"
            );
            None
        };

        Ok(Self {
            config: Arc::new(config.clone()),
            db,
            storage,
        })
    }

    /// Legacy: Database migrations are now handled by the deployment pipeline
    /// This method is kept for reference but is no longer called on startup
    #[allow(dead_code)]
    async fn run_migrations(db: &PgPool) -> Result<usize, sqlx::migrate::MigrateError> {
        // Migrations are embedded at compile time
        // Path relative to Cargo.toml: app/backend/migrations
        let migrator = sqlx::migrate!("../../migrations");

        // Get current migration count before running
        let before = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM _sqlx_migrations")
            .fetch_one(db)
            .await
            .unwrap_or(0);

        // Run all pending migrations
        migrator.run(db).await?;

        // Get count after running
        let after = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM _sqlx_migrations")
            .fetch_one(db)
            .await
            .unwrap_or(0);

        Ok((after - before) as usize)
    }

    /// Get the current database schema version
    pub async fn get_schema_version(&self) -> Option<i64> {
        sqlx::query_scalar::<_, i64>(
            "SELECT version FROM _sqlx_migrations ORDER BY version DESC LIMIT 1",
        )
        .fetch_optional(&self.db)
        .await
        .ok()
        .flatten()
    }
}
