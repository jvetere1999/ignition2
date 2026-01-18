use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// Represents a cryptographic policy version in the system
/// Defines which algorithms, parameters, and standards are in use
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct CryptoPolicy {
    /// Semantic version string (e.g., "1.0.0", "2.0.0")
    pub version: String,

    /// Encryption algorithm (e.g., "AES-256-GCM", "ChaCha20-Poly1305")
    pub algorithm: String,

    /// Key derivation function (e.g., "PBKDF2-SHA256", "Argon2id")
    pub kdf_algorithm: String,

    /// Number of KDF iterations (for PBKDF2, typically 100,000+)
    pub kdf_iterations: i32,

    /// Memory cost in MB for Argon2id (NULL for PBKDF2)
    pub kdf_memory_mb: Option<i32>,

    /// Minimum TLS version required (e.g., "TLS1.3")
    pub tls_minimum: String,

    /// When this policy becomes active
    pub effective_date: DateTime<Utc>,

    /// When this policy is deprecated (NULL if current)
    pub deprecated_date: Option<DateTime<Utc>>,

    /// When old version is no longer accepted
    pub migration_deadline: Option<DateTime<Utc>>,

    /// Rationale for this policy or deprecation
    pub rationale: Option<String>,

    /// Created timestamp
    pub created_at: DateTime<Utc>,
}

/// Request to query current crypto policy
#[derive(Debug, Serialize, Deserialize)]
pub struct GetCryptoPolicyRequest {
    /// Optional specific version to retrieve (defaults to current)
    pub version: Option<String>,
}

/// Response with current crypto policy
#[derive(Debug, Serialize, Deserialize)]
pub struct GetCryptoPolicyResponse {
    pub version: String,
    pub algorithm: String,
    pub kdf_algorithm: String,
    pub kdf_iterations: i32,
    pub kdf_memory_mb: Option<i32>,
    pub tls_minimum: String,
    pub effective_date: DateTime<Utc>,
    pub deprecated_date: Option<DateTime<Utc>>,
    pub migration_deadline: Option<DateTime<Utc>>,
    pub is_current: bool,
    pub is_deprecated: bool,
}

/// Request to create a new crypto policy version
#[derive(Debug, Serialize, Deserialize)]
pub struct CreateCryptoPolicyRequest {
    pub version: String,
    pub algorithm: String,
    pub kdf_algorithm: String,
    pub kdf_iterations: i32,
    pub kdf_memory_mb: Option<i32>,
    pub tls_minimum: String,
    pub effective_date: DateTime<Utc>,
    pub rationale: Option<String>,
}

/// Request to deprecate a crypto policy version
#[derive(Debug, Serialize, Deserialize)]
pub struct DeprecateCryptoPolicyRequest {
    pub version: String,
    pub deprecated_date: DateTime<Utc>,
    pub migration_deadline: DateTime<Utc>,
    pub rationale: String,
}

/// Information about crypto policy for a specific vault
#[derive(Debug, Serialize, Deserialize)]
pub struct VaultCryptoInfo {
    pub vault_id: String,
    pub user_id: String,
    pub crypto_policy_version: String,
    pub last_rotated_at: Option<DateTime<Utc>>,
    pub next_rotation_due: Option<DateTime<Utc>>,
    pub current_policy: CryptoPolicy,
    pub rotation_required: bool,
    pub deprecation_info: Option<DeprecationInfo>,
}

/// Information about policy deprecation
#[derive(Debug, Serialize, Deserialize)]
pub struct DeprecationInfo {
    pub deprecated_date: DateTime<Utc>,
    pub migration_deadline: DateTime<Utc>,
    pub days_until_deadline: i32,
    pub rationale: Option<String>,
}

impl CryptoPolicy {
    /// Check if this policy is current (effective but not deprecated)
    pub fn is_current(&self, now: DateTime<Utc>) -> bool {
        self.effective_date <= now && self.deprecated_date.is_none()
    }

    /// Check if this policy is deprecated
    pub fn is_deprecated(&self) -> bool {
        self.deprecated_date.is_some()
    }

    /// Check if this policy has passed its migration deadline
    pub fn has_passed_deadline(&self, now: DateTime<Utc>) -> bool {
        if let Some(deadline) = self.migration_deadline {
            now > deadline
        } else {
            false
        }
    }
}
