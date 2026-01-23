//! Application state shared across handlers

use std::sync::Arc;
use std::time::Duration;

use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;

use crate::cache::QueryCache;
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
    /// Query result cache (BACK-015) - reduces expensive query repetition
    pub cache: QueryCache,
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
        // BACK-014: Connection pool optimization for scalability
        // - max_connections: Environment-aware sizing (5 dev, 20 prod)
        // - min_connections: Eagerly created at startup to reduce latency
        // - max_lifetime: Recycle connections every 30 min for state refresh
        // - idle_timeout: Close idle connections after 10 min to free resources
        let db = PgPoolOptions::new()
            .max_connections(config.database.pool_size)
            .min_connections(config.database.min_pool_size)
            .max_lifetime(std::time::Duration::from_secs(
                config.database.connection_max_lifetime,
            ))
            .idle_timeout(std::time::Duration::from_secs(
                config.database.connection_idle_timeout,
            ))
            .acquire_timeout(Duration::from_secs(30))
            .connect(&config.database.url)
            .await
            .map_err(|e| {
                tracing::error!(
                    error.type = "connection",
                    error.message = %e,
                    operation = "database_connection",
                    db.max_connections = config.database.pool_size,
                    db.min_connections = config.database.min_pool_size,
                    db.max_lifetime_secs = config.database.connection_max_lifetime,
                    db.idle_timeout_secs = config.database.connection_idle_timeout,
                    "Failed to connect to database"
                );
                e
            })?;

        tracing::info!(
            operation = "startup",
            component = "database",
            db.max_connections = config.database.pool_size,
            db.min_connections = config.database.min_pool_size,
            db.max_lifetime_secs = config.database.connection_max_lifetime,
            db.idle_timeout_secs = config.database.connection_idle_timeout,
            "Database connection pool created (BACK-014: optimized for scalability)"
        );

        // Lightweight connectivity validation to fail fast if DB is unreachable
        if let Err(e) = sqlx::query_scalar::<_, i32>("SELECT 1")
            .fetch_one(&db)
            .await
        {
            tracing::error!(
                error.type = "connection",
                error.message = %e,
                operation = "database_health_check",
                "Database connectivity validation failed"
            );
            return Err(anyhow::anyhow!(
                "Database connectivity validation failed: {e}"
            ));
        }

        // ✓ Migrations are now handled by the deployment pipeline (wipe-and-rebuild-neon job)
        // ✓ Backend no longer runs migrations on startup to avoid conflicts
        // ✓ Database schema is verified and ready before container deployment
        tracing::info!(
            operation = "startup",
            component = "migrations",
            "Database ready - migrations pre-applied by deployment pipeline"
        );

        // Initialize default onboarding flow if it doesn't exist
        if let Err(e) = Self::ensure_onboarding_flow_exists(&db).await {
            tracing::warn!(
                error.type = "onboarding",
                error.message = %e,
                operation = "startup",
                component = "onboarding",
                "Failed to ensure onboarding flow exists"
            );
        }

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
            cache: QueryCache::new(),
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

    /// Ensure the default onboarding flow exists in the database
    /// If not present, creates it with standard onboarding steps
    async fn ensure_onboarding_flow_exists(db: &PgPool) -> anyhow::Result<()> {
        use uuid::Uuid;
        use chrono::Utc;

        // Check if an active flow already exists
        let existing_flow: Option<Uuid> = sqlx::query_scalar(
            "SELECT id FROM onboarding_flows WHERE is_active = true LIMIT 1"
        )
        .fetch_optional(db)
        .await?;

        if existing_flow.is_some() {
            tracing::debug!(
                operation = "startup",
                component = "onboarding",
                "Active onboarding flow already exists"
            );
            return Ok(());
        }

        // Create default onboarding flow
        let flow_id = Uuid::new_v4();
        let now = Utc::now();

        tracing::info!(
            operation = "startup",
            component = "onboarding",
            flow_id = %flow_id,
            "Creating default onboarding flow"
        );

        sqlx::query(
            r#"
            INSERT INTO onboarding_flows (id, name, description, is_active, total_steps, created_at, updated_at)
            VALUES ($1, $2, $3, true, 5, $4, $4)
            ON CONFLICT (name) DO NOTHING
            "#
        )
        .bind(flow_id)
        .bind("flow_main_v1")
        .bind("Main onboarding flow for new users")
        .bind(now)
        .execute(db)
        .await?;

        // Define standard onboarding steps
        let steps = vec![
            ("Welcome", "Get started with Ignition", "welcome", 1),
            ("Setup Passkey", "Create your secure authentication method", "action", 2),
            ("Choose Interests", "Select topics that matter to you", "multi_select", 3),
            ("Personalize", "Configure your workspace preferences", "input", 4),
            ("You're Ready", "Your Ignition workspace is all set!", "completion", 5),
        ];

        // Insert steps
        for (title, description, step_type, order) in steps {
            let step_id = Uuid::new_v4();
            sqlx::query(
                r#"
                INSERT INTO onboarding_steps 
                (id, flow_id, step_order, step_type, title, description, required, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, true, $7, $7)
                ON CONFLICT (flow_id, step_order) DO NOTHING
                "#
            )
            .bind(step_id)
            .bind(flow_id)
            .bind(order)
            .bind(step_type)
            .bind(title)
            .bind(description)
            .bind(now)
            .execute(db)
            .await?;
        }

        tracing::info!(
            operation = "startup",
            component = "onboarding",
            flow_id = %flow_id,
            step_count = 5,
            "Default onboarding flow created successfully"
        );

        Ok(())
    }
}
