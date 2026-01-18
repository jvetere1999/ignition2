use super::search_models::*;
use chrono::Utc;
use sqlx::PgPool;
use uuid::Uuid;

/// Search index repository for database operations
pub struct SearchIndexRepository;

impl SearchIndexRepository {
    /// Get all ideas and infobase entries for a user (for indexing)
    pub async fn get_all_indexable_content(
        pool: &PgPool,
        user_id: Uuid,
    ) -> Result<Vec<SearchableContent>, sqlx::Error> {
        // Fetch all ideas for the user
        let ideas: Vec<SearchableContent> =
            sqlx::query_as::<_, (String, String, String, i64, i64)>(
                "SELECT 
                'idea:' || id::text,
                content_encrypted,
                content_hash,
                EXTRACT(EPOCH FROM created_at)::bigint,
                EXTRACT(EPOCH FROM updated_at)::bigint
             FROM ideas
             WHERE user_id = $1 AND deleted_at IS NULL",
            )
            .bind(user_id)
            .fetch_all(pool)
            .await?
            .into_iter()
            .map(
                |(id, encrypted_text, plaintext_hash, created_at_epoch, updated_at_epoch)| {
                    SearchableContent {
                        id,
                        user_id,
                        content_type: ContentType::Idea,
                        encrypted_text,
                        plaintext_hash,
                        tags: vec![],
                        status: ContentStatus::Active,
                        created_at: chrono::DateTime::from_timestamp(created_at_epoch, 0)
                            .unwrap_or_else(Utc::now),
                        updated_at: chrono::DateTime::from_timestamp(updated_at_epoch, 0)
                            .unwrap_or_else(Utc::now),
                    }
                },
            )
            .collect();

        // Fetch all infobase entries for the user
        let infobase: Vec<SearchableContent> =
            sqlx::query_as::<_, (String, String, String, i64, i64)>(
                "SELECT 
                'infobase:' || id::text,
                content_encrypted,
                content_hash,
                EXTRACT(EPOCH FROM created_at)::bigint,
                EXTRACT(EPOCH FROM updated_at)::bigint
             FROM infobase_entries
             WHERE user_id = $1 AND deleted_at IS NULL",
            )
            .bind(user_id)
            .fetch_all(pool)
            .await?
            .into_iter()
            .map(
                |(id, encrypted_text, plaintext_hash, created_at_epoch, updated_at_epoch)| {
                    SearchableContent {
                        id,
                        user_id,
                        content_type: ContentType::Infobase,
                        encrypted_text,
                        plaintext_hash,
                        tags: vec![],
                        status: ContentStatus::Active,
                        created_at: chrono::DateTime::from_timestamp(created_at_epoch, 0)
                            .unwrap_or_else(Utc::now),
                        updated_at: chrono::DateTime::from_timestamp(updated_at_epoch, 0)
                            .unwrap_or_else(Utc::now),
                    }
                },
            )
            .collect();

        let mut all_content = ideas;
        all_content.extend(infobase);
        Ok(all_content)
    }

    /// Get a specific piece of content by ID
    pub async fn get_content(
        pool: &PgPool,
        user_id: Uuid,
        content_id: &str,
    ) -> Result<Option<SearchableContent>, sqlx::Error> {
        if content_id.starts_with("idea:") {
            let uuid_str = &content_id[5..]; // Remove "idea:" prefix
            if let Ok(uuid) = Uuid::parse_str(uuid_str) {
                let result: Option<(String, String, i64, i64)> = sqlx::query_as(
                    "SELECT content_encrypted, content_hash, 
                            EXTRACT(EPOCH FROM created_at)::bigint,
                            EXTRACT(EPOCH FROM updated_at)::bigint
                     FROM ideas WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL",
                )
                .bind(uuid)
                .bind(user_id)
                .fetch_optional(pool)
                .await?;

                if let Some((encrypted_text, plaintext_hash, created_at_epoch, updated_at_epoch)) =
                    result
                {
                    return Ok(Some(SearchableContent {
                        id: content_id.to_string(),
                        user_id,
                        content_type: ContentType::Idea,
                        encrypted_text,
                        plaintext_hash,
                        tags: vec![],
                        status: ContentStatus::Active,
                        created_at: chrono::DateTime::from_timestamp(created_at_epoch, 0)
                            .unwrap_or_else(Utc::now),
                        updated_at: chrono::DateTime::from_timestamp(updated_at_epoch, 0)
                            .unwrap_or_else(Utc::now),
                    }));
                }
            }
        } else if content_id.starts_with("infobase:") {
            let uuid_str = &content_id[9..]; // Remove "infobase:" prefix
            if let Ok(uuid) = Uuid::parse_str(uuid_str) {
                let result: Option<(String, String, i64, i64)> = sqlx::query_as(
                    "SELECT content_encrypted, content_hash,
                            EXTRACT(EPOCH FROM created_at)::bigint,
                            EXTRACT(EPOCH FROM updated_at)::bigint
                     FROM infobase_entries WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL",
                )
                .bind(uuid)
                .bind(user_id)
                .fetch_optional(pool)
                .await?;

                if let Some((encrypted_text, plaintext_hash, created_at_epoch, updated_at_epoch)) =
                    result
                {
                    return Ok(Some(SearchableContent {
                        id: content_id.to_string(),
                        user_id,
                        content_type: ContentType::Infobase,
                        encrypted_text,
                        plaintext_hash,
                        tags: vec![],
                        status: ContentStatus::Active,
                        created_at: chrono::DateTime::from_timestamp(created_at_epoch, 0)
                            .unwrap_or_else(Utc::now),
                        updated_at: chrono::DateTime::from_timestamp(updated_at_epoch, 0)
                            .unwrap_or_else(Utc::now),
                    }));
                }
            }
        }

        Ok(None)
    }

    /// Get count of indexable content for a user
    pub async fn get_content_count(pool: &PgPool, user_id: Uuid) -> Result<u32, sqlx::Error> {
        let ideas_count: (i64,) =
            sqlx::query_as("SELECT COUNT(*) FROM ideas WHERE user_id = $1 AND deleted_at IS NULL")
                .bind(user_id)
                .fetch_one(pool)
                .await?;

        let infobase_count: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM infobase_entries WHERE user_id = $1 AND deleted_at IS NULL",
        )
        .bind(user_id)
        .fetch_one(pool)
        .await?;

        Ok((ideas_count.0 + infobase_count.0) as u32)
    }

    /// Store search index metadata (for tracking rebuild status)
    pub async fn store_index_metadata(
        pool: &PgPool,
        metadata: &SearchIndexMetadata,
    ) -> Result<(), sqlx::Error> {
        // This is a placeholder for future use when we add search_index_metadata table
        // For now, this is a no-op that succeeds
        Ok(())
    }

    /// Get search index metadata
    pub async fn get_index_metadata(
        pool: &PgPool,
        _user_id: Uuid,
    ) -> Result<Option<SearchIndexMetadata>, sqlx::Error> {
        // This is a placeholder for future use when we add search_index_metadata table
        // For now, return None (client-side index is source of truth)
        Ok(None)
    }

    /// Check if content exists and matches plaintext hash (for edit detection)
    pub async fn check_content_modified(
        pool: &PgPool,
        content_id: &str,
        expected_hash: &str,
    ) -> Result<bool, sqlx::Error> {
        if content_id.starts_with("idea:") {
            let uuid_str = &content_id[5..];
            if let Ok(uuid) = Uuid::parse_str(uuid_str) {
                let result: Option<(String,)> =
                    sqlx::query_as("SELECT content_hash FROM ideas WHERE id = $1")
                        .bind(uuid)
                        .fetch_optional(pool)
                        .await?;

                if let Some((hash,)) = result {
                    return Ok(hash != expected_hash);
                }
            }
        } else if content_id.starts_with("infobase:") {
            let uuid_str = &content_id[9..];
            if let Ok(uuid) = Uuid::parse_str(uuid_str) {
                let result: Option<(String,)> =
                    sqlx::query_as("SELECT content_hash FROM infobase_entries WHERE id = $1")
                        .bind(uuid)
                        .fetch_optional(pool)
                        .await?;

                if let Some((hash,)) = result {
                    return Ok(hash != expected_hash);
                }
            }
        }

        Ok(true) // Modified if not found
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // Note: Database tests would require a test database setup
    // These are placeholder tests showing the expected behavior

    #[test]
    fn test_search_repository_would_fetch_content() {
        // In integration tests, this would:
        // 1. Create test ideas and infobase entries
        // 2. Call get_all_indexable_content
        // 3. Verify all content is returned with correct structure
    }

    #[test]
    fn test_search_repository_would_get_count() {
        // In integration tests, this would:
        // 1. Create multiple ideas and infobase entries
        // 2. Call get_content_count
        // 3. Verify count is accurate
    }
}
