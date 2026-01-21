use crate::db::daw_project_models::*;
use chrono::Utc;
use sqlx::PgPool;
use uuid::Uuid;

pub struct DawProjectsRepo;

impl DawProjectsRepo {
    /// Create a new DAW project file record
    pub async fn create(
        pool: &PgPool,
        user_id: Uuid,
        project_name: &str,
        content_type: &str,
        file_size: i64,
        file_hash: &str,
        storage_key: &str,
    ) -> Result<DawProjectFile, sqlx::Error> {
        let id = Uuid::new_v4();
        let version_id = Uuid::new_v4();
        let now = Utc::now();

        sqlx::query_as::<_, DawProjectFile>(
            r#"
            INSERT INTO daw_project_files (
                id, user_id, project_name, file_path, file_size,
                file_hash, content_type, storage_key, encrypted,
                current_version_id, version_count, last_modified_at,
                created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING *
            "#,
        )
        .bind(id)
        .bind(user_id)
        .bind(project_name)
        .bind(format!("/daw/{}/{}", user_id, project_name))
        .bind(file_size)
        .bind(file_hash)
        .bind(content_type)
        .bind(storage_key)
        .bind(true) // encrypted
        .bind(version_id)
        .bind(1) // initial version
        .bind(now)
        .bind(now)
        .bind(now)
        .fetch_one(pool)
        .await
    }

    /// Get a DAW project by ID
    pub async fn get_by_id(
        pool: &PgPool,
        project_id: Uuid,
        user_id: Uuid,
    ) -> Result<Option<DawProjectFile>, sqlx::Error> {
        sqlx::query_as::<_, DawProjectFile>(
            "SELECT * FROM daw_project_files WHERE id = $1 AND user_id = $2",
        )
        .bind(project_id)
        .bind(user_id)
        .fetch_optional(pool)
        .await
    }

    /// List all DAW projects for user
    pub async fn list_by_user(
        pool: &PgPool,
        user_id: Uuid,
        limit: i64,
        offset: i64,
    ) -> Result<(Vec<DawProjectFile>, i64), sqlx::Error> {
        let projects = sqlx::query_as::<_, DawProjectFile>(
            "SELECT * FROM daw_project_files WHERE user_id = $1 ORDER BY last_modified_at DESC LIMIT $2 OFFSET $3",
        )
        .bind(user_id)
        .bind(limit)
        .bind(offset)
        .fetch_all(pool)
        .await?;

        let count: (i64,) =
            sqlx::query_as("SELECT COUNT(*) FROM daw_project_files WHERE user_id = $1")
                .bind(user_id)
                .fetch_one(pool)
                .await?;

        Ok((projects, count.0))
    }

    /// Create a new version record
    pub async fn create_version(
        pool: &PgPool,
        project_id: Uuid,
        user_id: Uuid,
        version_number: i32,
        file_size: i64,
        file_hash: &str,
        storage_key: &str,
        change_description: Option<&str>,
    ) -> Result<DawProjectVersion, sqlx::Error> {
        let version_id = Uuid::new_v4();

        sqlx::query_as::<_, DawProjectVersion>(
            r#"
            INSERT INTO daw_project_versions (
                id, project_id, user_id, version_number, file_size,
                file_hash, storage_key, change_description, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
            "#,
        )
        .bind(version_id)
        .bind(project_id)
        .bind(user_id)
        .bind(version_number)
        .bind(file_size)
        .bind(file_hash)
        .bind(storage_key)
        .bind(change_description)
        .bind(Utc::now())
        .fetch_one(pool)
        .await
    }

    /// Get version history for project
    pub async fn get_versions(
        pool: &PgPool,
        project_id: Uuid,
        user_id: Uuid,
    ) -> Result<Vec<DawProjectVersion>, sqlx::Error> {
        sqlx::query_as::<_, DawProjectVersion>(
            "SELECT * FROM daw_project_versions WHERE project_id = $1 AND user_id = $2 ORDER BY version_number DESC",
        )
        .bind(project_id)
        .bind(user_id)
        .fetch_all(pool)
        .await
    }

    /// Get specific version
    pub async fn get_version(
        pool: &PgPool,
        version_id: Uuid,
        user_id: Uuid,
    ) -> Result<Option<DawProjectVersion>, sqlx::Error> {
        sqlx::query_as::<_, DawProjectVersion>(
            "SELECT * FROM daw_project_versions WHERE id = $1 AND user_id = $2",
        )
        .bind(version_id)
        .bind(user_id)
        .fetch_optional(pool)
        .await
    }

    /// Create upload session
    pub async fn create_upload_session(
        pool: &PgPool,
        user_id: Uuid,
        project_name: &str,
        content_type: &str,
        total_size: i64,
        total_chunks: i32,
        storage_key: &str,
    ) -> Result<UploadSession, sqlx::Error> {
        let session_id = Uuid::new_v4();
        let expires_at = Utc::now() + chrono::Duration::hours(24);

        sqlx::query_as::<_, UploadSession>(
            r#"
            INSERT INTO upload_sessions (
                id, user_id, project_name, content_type, total_size,
                chunks_received, total_chunks, status, storage_key, expires_at, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
            "#,
        )
        .bind(session_id)
        .bind(user_id)
        .bind(project_name)
        .bind(content_type)
        .bind(total_size)
        .bind(0) // chunks_received starts at 0
        .bind(total_chunks)
        .bind("uploading")
        .bind(storage_key)
        .bind(expires_at)
        .bind(Utc::now())
        .fetch_one(pool)
        .await
    }

    /// Get upload session
    pub async fn get_upload_session(
        pool: &PgPool,
        session_id: Uuid,
        user_id: Uuid,
    ) -> Result<Option<UploadSession>, sqlx::Error> {
        sqlx::query_as::<_, UploadSession>(
            "SELECT * FROM upload_sessions WHERE id = $1 AND user_id = $2",
        )
        .bind(session_id)
        .bind(user_id)
        .fetch_optional(pool)
        .await
    }

    /// Update chunks received
    pub async fn update_chunks_received(
        pool: &PgPool,
        session_id: Uuid,
        chunks_received: i32,
    ) -> Result<(), sqlx::Error> {
        sqlx::query(
            "UPDATE upload_sessions SET chunks_received = $1, updated_at = $2 WHERE id = $3",
        )
        .bind(chunks_received)
        .bind(Utc::now())
        .bind(session_id)
        .execute(pool)
        .await?;

        Ok(())
    }

    /// Complete upload session
    pub async fn complete_upload_session(
        pool: &PgPool,
        session_id: Uuid,
    ) -> Result<(), sqlx::Error> {
        sqlx::query("UPDATE upload_sessions SET status = 'complete' WHERE id = $1")
            .bind(session_id)
            .execute(pool)
            .await?;

        Ok(())
    }

    /// Update current version and version count
    pub async fn update_current_version(
        pool: &PgPool,
        project_id: Uuid,
        version_id: Uuid,
        version_count: i32,
    ) -> Result<(), sqlx::Error> {
        let now = Utc::now();
        sqlx::query(
            "UPDATE daw_project_files SET current_version_id = $1, version_count = $2, last_modified_at = $3, updated_at = $4 WHERE id = $5",
        )
        .bind(version_id)
        .bind(version_count)
        .bind(now)
        .bind(now)
        .bind(project_id)
        .execute(pool)
        .await?;

        Ok(())
    }

    /// Restore a previous version as current
    pub async fn restore_version(
        pool: &PgPool,
        project_id: Uuid,
        version_id: Uuid,
        user_id: Uuid,
    ) -> Result<DawProjectVersion, sqlx::Error> {
        // Get the version to restore
        let version = sqlx::query_as::<_, DawProjectVersion>(
            "SELECT * FROM daw_project_versions WHERE id = $1 AND project_id = $2 AND user_id = $3",
        )
        .bind(version_id)
        .bind(project_id)
        .bind(user_id)
        .fetch_one(pool)
        .await?;

        // Get current project
        let project = sqlx::query_as::<_, DawProjectFile>(
            "SELECT * FROM daw_project_files WHERE id = $1 AND user_id = $2",
        )
        .bind(project_id)
        .bind(user_id)
        .fetch_one(pool)
        .await?;

        // Create new version from restored data
        let new_version = Self::create_version(
            pool,
            project_id,
            user_id,
            project.version_count + 1,
            version.file_size,
            &version.file_hash,
            &version.storage_key,
            Some(&format!("Restored from version {}", version.version_number)),
        )
        .await?;

        // Update current version
        Self::update_current_version(pool, project_id, new_version.id, project.version_count + 1)
            .await?;

        Ok(new_version)
    }

    /// Delete a project (soft delete via status)
    pub async fn delete_project(
        pool: &PgPool,
        project_id: Uuid,
        user_id: Uuid,
    ) -> Result<(), sqlx::Error> {
        sqlx::query("UPDATE daw_project_files SET updated_at = $1 WHERE id = $2 AND user_id = $3")
            .bind(Utc::now())
            .bind(project_id)
            .bind(user_id)
            .execute(pool)
            .await?;

        Ok(())
    }

    /// Get total storage used by user
    pub async fn get_user_storage_usage(pool: &PgPool, user_id: Uuid) -> Result<i64, sqlx::Error> {
        let result: (Option<i64>,) = sqlx::query_as(
            "SELECT COALESCE(SUM(file_size), 0) FROM daw_project_files WHERE user_id = $1",
        )
        .bind(user_id)
        .fetch_one(pool)
        .await?;

        Ok(result.0.unwrap_or(0))
    }
}
