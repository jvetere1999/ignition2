use crate::db::crypto_policy_models::{
    CreateCryptoPolicyRequest, CryptoPolicy, DeprecateCryptoPolicyRequest,
};
use chrono::{DateTime, Utc};
use sqlx::PgPool;

pub struct CryptoPolicyRepo;

impl CryptoPolicyRepo {
    /// Get current active crypto policy
    pub async fn get_current(pool: &PgPool) -> Result<CryptoPolicy, sqlx::Error> {
        sqlx::query_as::<_, CryptoPolicy>(
            "SELECT version, algorithm, kdf_algorithm, kdf_iterations, kdf_memory_mb,
                    tls_minimum, effective_date, deprecated_date, migration_deadline,
                    rationale, created_at
             FROM crypto_policies
             WHERE deprecated_date IS NULL
             ORDER BY effective_date DESC
             LIMIT 1",
        )
        .fetch_one(pool)
        .await
    }

    /// Get a specific policy version
    pub async fn get_by_version(pool: &PgPool, version: &str) -> Result<CryptoPolicy, sqlx::Error> {
        sqlx::query_as::<_, CryptoPolicy>(
            "SELECT version, algorithm, kdf_algorithm, kdf_iterations, kdf_memory_mb,
                    tls_minimum, effective_date, deprecated_date, migration_deadline,
                    rationale, created_at
             FROM crypto_policies
             WHERE version = $1",
        )
        .bind(version)
        .fetch_one(pool)
        .await
    }

    /// Get all policies (active and deprecated)
    pub async fn get_all(pool: &PgPool) -> Result<Vec<CryptoPolicy>, sqlx::Error> {
        sqlx::query_as::<_, CryptoPolicy>(
            "SELECT version, algorithm, kdf_algorithm, kdf_iterations, kdf_memory_mb,
                    tls_minimum, effective_date, deprecated_date, migration_deadline,
                    rationale, created_at
             FROM crypto_policies
             ORDER BY effective_date DESC",
        )
        .fetch_all(pool)
        .await
    }

    /// Create a new crypto policy version
    pub async fn create(
        pool: &PgPool,
        req: &CreateCryptoPolicyRequest,
    ) -> Result<CryptoPolicy, sqlx::Error> {
        sqlx::query_as::<_, CryptoPolicy>(
            "INSERT INTO crypto_policies
             (version, algorithm, kdf_algorithm, kdf_iterations, kdf_memory_mb,
              tls_minimum, effective_date, rationale, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
             RETURNING version, algorithm, kdf_algorithm, kdf_iterations, kdf_memory_mb,
                      tls_minimum, effective_date, deprecated_date, migration_deadline,
                      rationale, created_at",
        )
        .bind(&req.version)
        .bind(&req.algorithm)
        .bind(&req.kdf_algorithm)
        .bind(req.kdf_iterations)
        .bind(req.kdf_memory_mb)
        .bind(&req.tls_minimum)
        .bind(req.effective_date)
        .bind(&req.rationale)
        .fetch_one(pool)
        .await
    }

    /// Deprecate a crypto policy version
    pub async fn deprecate(
        pool: &PgPool,
        req: &DeprecateCryptoPolicyRequest,
    ) -> Result<CryptoPolicy, sqlx::Error> {
        sqlx::query_as::<_, CryptoPolicy>(
            "UPDATE crypto_policies
             SET deprecated_date = $2, migration_deadline = $3, rationale = $4
             WHERE version = $1
             RETURNING version, algorithm, kdf_algorithm, kdf_iterations, kdf_memory_mb,
                      tls_minimum, effective_date, deprecated_date, migration_deadline,
                      rationale, created_at",
        )
        .bind(&req.version)
        .bind(req.deprecated_date)
        .bind(req.migration_deadline)
        .bind(&req.rationale)
        .fetch_one(pool)
        .await
    }

    /// Get policies that have passed their migration deadline
    pub async fn get_past_deadline(
        pool: &PgPool,
        now: DateTime<Utc>,
    ) -> Result<Vec<CryptoPolicy>, sqlx::Error> {
        sqlx::query_as::<_, CryptoPolicy>(
            "SELECT version, algorithm, kdf_algorithm, kdf_iterations, kdf_memory_mb,
                    tls_minimum, effective_date, deprecated_date, migration_deadline,
                    rationale, created_at
             FROM crypto_policies
             WHERE migration_deadline IS NOT NULL AND migration_deadline < $1",
        )
        .bind(now)
        .fetch_all(pool)
        .await
    }

    /// Get all deprecated policies
    pub async fn get_deprecated(pool: &PgPool) -> Result<Vec<CryptoPolicy>, sqlx::Error> {
        sqlx::query_as::<_, CryptoPolicy>(
            "SELECT version, algorithm, kdf_algorithm, kdf_iterations, kdf_memory_mb,
                    tls_minimum, effective_date, deprecated_date, migration_deadline,
                    rationale, created_at
             FROM crypto_policies
             WHERE deprecated_date IS NOT NULL
             ORDER BY deprecated_date DESC",
        )
        .fetch_all(pool)
        .await
    }
}
