//! WebAuthn Authenticator Repository
//!
//! Database operations for managing WebAuthn credentials.

use sqlx::PgPool;
use uuid::Uuid;

use crate::db::authenticator_models::{AuthenticatorRow, CreateAuthenticatorInput, AuthenticatorInfo};
use crate::error::{AppError, AppResult};

pub struct AuthenticatorRepo;

impl AuthenticatorRepo {
    /// Create a new authenticator credential
    pub async fn create(
        pool: &PgPool,
        input: CreateAuthenticatorInput,
    ) -> AppResult<AuthenticatorRow> {
        let id = Uuid::new_v4();

        let row = sqlx::query_as::<_, AuthenticatorRow>(
            r#"
            INSERT INTO authenticators (
                id, user_id, credential_id, provider_account_id, 
                credential_public_key, counter, credential_device_type, 
                credential_backed_up, transports, created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
            RETURNING *
            "#
        )
        .bind(id)
        .bind(input.user_id)
        .bind(&input.credential_id)
        .bind(&input.provider_account_id)
        .bind(&input.credential_public_key)
        .bind(0i64) // counter starts at 0
        .bind(&input.credential_device_type)
        .bind(input.credential_backed_up)
        .bind(&input.transports)
        .fetch_one(pool)
        .await?;

        Ok(row)
    }

    /// Get authenticator by credential ID
    pub async fn get_by_credential_id(
        pool: &PgPool,
        credential_id: &str,
    ) -> AppResult<Option<AuthenticatorRow>> {
        let row = sqlx::query_as::<_, AuthenticatorRow>(
            "SELECT * FROM authenticators WHERE credential_id = $1"
        )
        .bind(credential_id)
        .fetch_optional(pool)
        .await?;

        Ok(row)
    }

    /// Get all authenticators for a user
    pub async fn get_by_user_id(
        pool: &PgPool,
        user_id: Uuid,
    ) -> AppResult<Vec<AuthenticatorRow>> {
        let rows = sqlx::query_as::<_, AuthenticatorRow>(
            "SELECT * FROM authenticators WHERE user_id = $1 ORDER BY created_at DESC"
        )
        .bind(user_id)
        .fetch_all(pool)
        .await?;

        Ok(rows)
    }

    /// Update counter for cloning detection
    pub async fn update_counter(
        pool: &PgPool,
        credential_id: &str,
        new_counter: i64,
    ) -> AppResult<()> {
        let result = sqlx::query(
            "UPDATE authenticators SET counter = $1 WHERE credential_id = $2"
        )
        .bind(new_counter)
        .bind(credential_id)
        .execute(pool)
        .await?;

        if result.rows_affected() == 0 {
            return Err(AppError::NotFound("Authenticator not found".to_string()));
        }

        Ok(())
    }

    /// Delete an authenticator
    pub async fn delete(
        pool: &PgPool,
        id: Uuid,
        user_id: Uuid,
    ) -> AppResult<()> {
        let result = sqlx::query(
            "DELETE FROM authenticators WHERE id = $1 AND user_id = $2"
        )
        .bind(id)
        .bind(user_id)
        .execute(pool)
        .await?;

        if result.rows_affected() == 0 {
            return Err(AppError::NotFound("Authenticator not found".to_string()));
        }

        Ok(())
    }

    /// Get user ID from credential ID (for signin)
    pub async fn get_user_id_by_credential_id(
        pool: &PgPool,
        credential_id: &str,
    ) -> AppResult<Uuid> {
        let row = sqlx::query_scalar::<_, Uuid>(
            "SELECT user_id FROM authenticators WHERE credential_id = $1"
        )
        .bind(credential_id)
        .fetch_optional(pool)
        .await?;

        row.ok_or_else(|| AppError::NotFound("Credential not found".to_string()))
    }

    /// Get authenticators as public info (for listing)
    pub async fn get_user_credentials_info(
        pool: &PgPool,
        user_id: Uuid,
    ) -> AppResult<Vec<AuthenticatorInfo>> {
        let rows = Self::get_by_user_id(pool, user_id).await?;
        Ok(rows.into_iter().map(AuthenticatorInfo::from).collect())
    }
}
