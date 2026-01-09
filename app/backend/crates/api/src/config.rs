//! Application configuration

use config::{Config, Environment, File};
use serde::Deserialize;

/// Main application configuration
#[derive(Debug, Clone, Deserialize)]
pub struct AppConfig {
    pub server: ServerConfig,
    pub database: DatabaseConfig,
    pub auth: AuthConfig,
    pub cors: CorsConfig,
    /// Storage config (R2/S3) - used in Phase 14
    #[allow(dead_code)]
    pub storage: StorageConfig,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ServerConfig {
    #[serde(default = "default_host")]
    pub host: String,
    #[serde(default = "default_port")]
    pub port: u16,
    #[serde(default = "default_env")]
    pub environment: String,
    #[serde(default = "default_public_url")]
    pub public_url: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct DatabaseConfig {
    /// Database URL - can be set via DATABASE_URL env var
    /// Uses serde default to handle missing values gracefully
    #[serde(default = "default_database_url")]
    pub url: String,
    /// Pool size - used when sqlx pool is configured
    #[serde(default = "default_pool_size")]
    #[allow(dead_code)]
    pub pool_size: u32,
}

fn default_database_url() -> String {
    // Check environment directly as fallback
    let db_url = std::env::var("DATABASE_URL")
        .ok()
        .filter(|s| !s.is_empty() && s != "undefined")
        .unwrap_or_else(|| "postgres://localhost/ignition".to_string());
    
    // Log what we got (redacted for security)
    let redacted = if db_url.len() > 30 {
        format!("{}...{}", &db_url[..15], &db_url[db_url.len()-10..])
    } else {
        "***".to_string()
    };
    tracing::info!("DATABASE_URL from env: {}", redacted);
    
    db_url
}

#[derive(Debug, Clone, Deserialize)]
pub struct AuthConfig {
    /// Session cookie domain (e.g., "ecent.online")
    #[serde(default = "default_cookie_domain")]
    pub cookie_domain: String,
    /// Session TTL in seconds (default: 30 days)
    #[serde(default = "default_session_ttl")]
    pub session_ttl_seconds: u64,
    /// OAuth providers configuration
    pub oauth: Option<OAuthConfig>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct OAuthConfig {
    pub google: Option<OAuthProviderConfig>,
    pub azure: Option<OAuthProviderConfig>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct OAuthProviderConfig {
    pub client_id: String,
    pub client_secret: String,
    /// Redirect URI from config (may be overridden by computed value)
    #[allow(dead_code)]
    pub redirect_uri: String,
    /// Tenant ID (required for Azure)
    pub tenant_id: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CorsConfig {
    /// Allowed origins for CORS and CSRF verification
    #[serde(default = "default_allowed_origins")]
    pub allowed_origins: Vec<String>,
}

/// Storage config - used in Phase 14 R2 integration
#[derive(Debug, Clone, Deserialize)]
#[allow(dead_code)]
pub struct StorageConfig {
    /// R2/S3 endpoint URL
    pub endpoint: Option<String>,
    /// R2/S3 bucket name
    pub bucket: Option<String>,
    /// R2/S3 region
    #[serde(default = "default_region")]
    pub region: String,
    /// Access key ID
    pub access_key_id: Option<String>,
    /// Secret access key
    pub secret_access_key: Option<String>,
}

// Default value functions
fn default_host() -> String {
    "0.0.0.0".to_string()
}

fn default_port() -> u16 {
    8080
}

fn default_env() -> String {
    "development".to_string()
}

fn default_pool_size() -> u32 {
    10
}

fn default_cookie_domain() -> String {
    "localhost".to_string()
}

fn default_session_ttl() -> u64 {
    60 * 60 * 24 * 30 // 30 days in seconds
}

fn default_allowed_origins() -> Vec<String> {
    vec![
        "http://localhost:3000".to_string(),
        "http://localhost:3001".to_string(),
    ]
}

fn default_region() -> String {
    "auto".to_string()
}

fn default_public_url() -> String {
    "http://localhost:8080".to_string()
}

impl AppConfig {
    /// Load configuration from files and environment
    pub fn load() -> anyhow::Result<Self> {
        let env = std::env::var("APP_ENV").unwrap_or_else(|_| "development".to_string());

        // Get database URL directly from environment - handle missing/empty/undefined values
        let database_url = std::env::var("DATABASE_URL")
            .ok()
            .filter(|s| !s.is_empty() && s != "undefined")
            .unwrap_or_else(|| "postgres://localhost/ignition".to_string());

        let config = Config::builder()
            // Default configuration
            .set_default("server.host", "0.0.0.0")?
            .set_default("server.port", 8080)?
            .set_default("server.environment", env.clone())?
            .set_default("server.public_url", "http://localhost:8080")?
            // Set database.url BEFORE adding Environment source so it acts as fallback
            .set_default("database.url", database_url.clone())?
            .set_default("database.pool_size", 10)?
            .set_default("auth.cookie_domain", "localhost")?
            .set_default("auth.session_ttl_seconds", 60 * 60 * 24 * 30)?
            .set_default(
                "cors.allowed_origins",
                vec!["http://localhost:3000", "http://localhost:3001"],
            )?
            .set_default("storage.region", "auto")?
            // Load from config file if exists
            .add_source(File::with_name("config/default").required(false))
            .add_source(File::with_name(&format!("config/{}", env)).required(false))
            // Override with environment variables (e.g., DATABASE_URL, SERVER_PORT)
            // Note: separator("_") means DATABASE_URL -> database.url
            .add_source(Environment::default().separator("_").try_parsing(true))
            .build()?;

        // Deserialize but handle potential empty url from env override
        let mut app_config: Self = config.try_deserialize()?;
        
        // If url is empty after deserialization (env var was empty string), use our fallback
        if app_config.database.url.is_empty() || app_config.database.url == "undefined" {
            app_config.database.url = database_url;
        }

        Ok(app_config)
    }

    /// Check if running in production
    #[allow(dead_code)]
    pub fn is_production(&self) -> bool {
        self.server.environment == "production"
    }

    /// Check if running in development
    pub fn is_development(&self) -> bool {
        self.server.environment == "development"
    }
}
