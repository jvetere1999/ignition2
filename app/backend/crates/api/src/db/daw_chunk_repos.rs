use sqlx::{PgPool, Row};
use std::collections::HashSet;

pub struct DawChunkRepo;

impl DawChunkRepo {
    pub async fn list_existing_hashes(
        pool: &PgPool,
        hashes: &[String],
        compression: &str,
        encryption: &str,
    ) -> Result<HashSet<String>, sqlx::Error> {
        if hashes.is_empty() {
            return Ok(HashSet::new());
        }

        let rows = sqlx::query(
            r#"
            SELECT hash
            FROM daw_project_chunks
            WHERE hash = ANY($1)
              AND compression = $2
              AND encryption = $3
            "#,
        )
        .bind(hashes)
        .bind(compression)
        .bind(encryption)
        .fetch_all(pool)
        .await?;

        Ok(rows
            .into_iter()
            .filter_map(|row| row.try_get::<String, _>("hash").ok())
            .collect())
    }

    pub async fn insert_chunk(
        pool: &PgPool,
        hash: &str,
        compression: &str,
        encryption: &str,
        size_bytes: i64,
        storage_key: &str,
    ) -> Result<(), sqlx::Error> {
        sqlx::query(
            r#"
            INSERT INTO daw_project_chunks (hash, compression, encryption, size_bytes, storage_key)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (hash) DO NOTHING
            "#,
        )
        .bind(hash)
        .bind(compression)
        .bind(encryption)
        .bind(size_bytes)
        .bind(storage_key)
        .execute(pool)
        .await?;

        Ok(())
    }
}
