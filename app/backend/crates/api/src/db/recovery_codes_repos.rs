use crate::db::generated::RecoveryCodes;
use sqlx::PgPool;
use uuid::Uuid;

/// Recovery codes repository - handles persistence of recovery codes
pub struct RecoveryCodesRepo;

impl RecoveryCodesRepo {
    /// Generate N new recovery codes for a vault
    /// Returns a Vec of codes in format "XXXX-XXXX-XXXX"
    pub async fn generate_codes(
        pool: &PgPool,
        vault_id: Uuid,
        created_by: Uuid,
        count: usize,
    ) -> Result<Vec<String>, sqlx::Error> {
        use rand::Rng;

        let codes: Vec<String> = (0..count)
            .map(|_| {
                // Generate 12 random alphanumeric characters
                let mut rng = rand::thread_rng();
                let chars: String = (0..12)
                    .map(|_| {
                        let idx = rng.gen_range(0..36);
                        if idx < 10 {
                            (b'0' + idx as u8) as char
                        } else {
                            (b'A' + (idx - 10) as u8) as char
                        }
                    })
                    .collect();

                // Format as XXXX-XXXX-XXXX
                format!("{}-{}-{}", &chars[0..4], &chars[4..8], &chars[8..12])
            })
            .collect();

        // Insert all codes
        for code in &codes {
            sqlx::query(
                r#"
                INSERT INTO recovery_codes (vault_id, code, created_by)
                VALUES ($1, $2, $3)
                ON CONFLICT (vault_id, code) DO NOTHING
                "#,
            )
            .bind(vault_id)
            .bind(code)
            .bind(created_by)
            .execute(pool)
            .await?;
        }

        Ok(codes)
    }

    /// Get all unused recovery codes for a vault
    pub async fn get_unused_codes(
        pool: &PgPool,
        vault_id: Uuid,
    ) -> Result<Vec<RecoveryCodes>, sqlx::Error> {
        sqlx::query_as::<_, RecoveryCodes>(
            r#"
            SELECT id, vault_id, code, used, created_at, used_at, created_by
            FROM recovery_codes
            WHERE vault_id = $1 AND used = false
            ORDER BY created_at DESC
            "#,
        )
        .bind(vault_id)
        .fetch_all(pool)
        .await
    }

    /// Validate and mark a recovery code as used
    pub async fn validate_and_use_code(
        pool: &PgPool,
        code: &str,
    ) -> Result<Option<RecoveryCodes>, sqlx::Error> {
        sqlx::query_as::<_, RecoveryCodes>(
            r#"
            UPDATE recovery_codes
            SET used = true, used_at = NOW()
            WHERE code = $1 AND used = false
            RETURNING id, vault_id, code, used, created_at, used_at, created_by
            "#,
        )
        .bind(code)
        .fetch_optional(pool)
        .await
    }

    /// Find recovery code (without marking as used)
    pub async fn find_code(
        pool: &PgPool,
        code: &str,
    ) -> Result<Option<RecoveryCodes>, sqlx::Error> {
        sqlx::query_as::<_, RecoveryCodes>(
            r#"
            SELECT id, vault_id, code, used, created_at, used_at, created_by
            FROM recovery_codes
            WHERE code = $1
            "#,
        )
        .bind(code)
        .fetch_optional(pool)
        .await
    }

    /// Get recovery code count for a vault (used and unused)
    pub async fn get_code_count(pool: &PgPool, vault_id: Uuid) -> Result<(i64, i64), sqlx::Error> {
        #[derive(sqlx::FromRow)]
        struct CodeCounts {
            unused_count: Option<i64>,
            used_count: Option<i64>,
        }

        let counts = sqlx::query_as::<_, CodeCounts>(
            r#"
            SELECT
                COUNT(*) FILTER (WHERE used = false) as unused_count,
                COUNT(*) FILTER (WHERE used = true) as used_count
            FROM recovery_codes
            WHERE vault_id = $1
            "#,
        )
        .bind(vault_id)
        .fetch_one(pool)
        .await?;

        Ok((
            counts.unused_count.unwrap_or(0),
            counts.used_count.unwrap_or(0),
        ))
    }

    /// Revoke all recovery codes for a vault (mark as used)
    pub async fn revoke_all_codes(pool: &PgPool, vault_id: Uuid) -> Result<u64, sqlx::Error> {
        let result = sqlx::query(
            r#"
            UPDATE recovery_codes
            SET used = true, used_at = NOW()
            WHERE vault_id = $1 AND used = false
            "#,
        )
        .bind(vault_id)
        .execute(pool)
        .await?;

        Ok(result.rows_affected())
    }
}
