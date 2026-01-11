//! Reference tracks repository
//!
//! Database operations for reference tracks, analyses, annotations, and regions.
//! Uses centralized observability layer for structured logging.

#![allow(dead_code)]

use sqlx::PgPool;
use uuid::Uuid;

use super::core::{QueryContext, db_error};
use super::reference_models::*;
use crate::error::AppError;

// =============================================================================
// Reference Tracks Repository
// =============================================================================

pub struct ReferenceTrackRepo;

impl ReferenceTrackRepo {
    /// Create a new reference track
    /// Aligned with migration 0012_reference.sql
    pub async fn create(
        pool: &PgPool,
        user_id: Uuid,
        input: CreateTrackInput,
    ) -> Result<ReferenceTrack, AppError> {
        let ctx = QueryContext::new("INSERT", "reference_tracks")
            .with_user(user_id);
        
        let track = sqlx::query_as::<_, ReferenceTrack>(
            r#"
            INSERT INTO reference_tracks (
                user_id, title, r2_key, artist, album, genre, bpm, key,
                duration_seconds, waveform_r2_key, thumbnail_r2_key,
                file_format, sample_rate, bit_depth, channels,
                is_reference, is_user_upload, source, source_url, metadata
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
            RETURNING *
            "#,
        )
        .bind(user_id)
        .bind(&input.title)
        .bind(&input.r2_key)
        .bind(&input.artist)
        .bind(&input.album)
        .bind(&input.genre)
        .bind(input.bpm)
        .bind(&input.key)
        .bind(input.duration_seconds)
        .bind(&input.waveform_r2_key)
        .bind(&input.thumbnail_r2_key)
        .bind(&input.file_format)
        .bind(input.sample_rate)
        .bind(input.bit_depth)
        .bind(input.channels)
        .bind(input.is_reference.unwrap_or(true))
        .bind(input.is_user_upload.unwrap_or(false))
        .bind(&input.source)
        .bind(&input.source_url)
        .bind(&input.metadata)
        .fetch_one(pool)
        .await
        .map_err(|e| db_error(&ctx, e))?;

        Ok(track)
    }

    /// Find track by ID (no ownership check - use for internal lookups)
    #[allow(dead_code)]
    pub async fn find_by_id(pool: &PgPool, id: Uuid) -> Result<Option<ReferenceTrack>, AppError> {
        let ctx = QueryContext::new("SELECT", "reference_tracks")
            .with_entity(id);
        
        let track =
            sqlx::query_as::<_, ReferenceTrack>("SELECT * FROM reference_tracks WHERE id = $1")
                .bind(id)
                .fetch_optional(pool)
                .await
                .map_err(|e| db_error(&ctx, e))?;

        Ok(track)
    }

    /// Find track by ID with ownership check (IDOR prevention)
    pub async fn find_by_id_for_user(
        pool: &PgPool,
        id: Uuid,
        user_id: Uuid,
    ) -> Result<Option<ReferenceTrack>, AppError> {
        let ctx = QueryContext::new("SELECT", "reference_tracks")
            .with_user(user_id)
            .with_entity(id);
        
        let track = sqlx::query_as::<_, ReferenceTrack>(
            "SELECT * FROM reference_tracks WHERE id = $1 AND user_id = $2",
        )
        .bind(id)
        .bind(user_id)
        .fetch_optional(pool)
        .await
        .map_err(|e| db_error(&ctx, e))?;

        Ok(track)
    }

    /// List tracks for a user with pagination
    pub async fn list_for_user(
        pool: &PgPool,
        user_id: Uuid,
        page: i32,
        page_size: i32,
    ) -> Result<(Vec<ReferenceTrack>, i64), AppError> {
        let ctx = QueryContext::new("SELECT", "reference_tracks")
            .with_user(user_id);
        
        let offset = (page - 1) * page_size;

        let tracks = sqlx::query_as::<_, ReferenceTrack>(
            r#"
            SELECT * FROM reference_tracks
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
            "#,
        )
        .bind(user_id)
        .bind(page_size)
        .bind(offset)
        .fetch_all(pool)
        .await
        .map_err(|e| db_error(&ctx, e))?;

        let total: (i64,) =
            sqlx::query_as("SELECT COUNT(*) FROM reference_tracks WHERE user_id = $1")
                .bind(user_id)
                .fetch_one(pool)
                .await
                .map_err(|e| db_error(&ctx, e))?;

        Ok((tracks, total.0))
    }

    /// List tracks for a user by their email (for cross-user browsing)
    pub async fn list_by_user_email(
        pool: &PgPool,
        email: &str,
        page: i32,
        page_size: i32,
    ) -> Result<Option<(Uuid, String, Option<String>, Vec<ReferenceTrack>, i64)>, AppError> {
        let ctx = QueryContext::new("SELECT", "reference_tracks");
        
        // First find the user by email
        let user: Option<(Uuid, String, Option<String>)> = sqlx::query_as(
            "SELECT id, email, name FROM users WHERE email = $1",
        )
        .bind(email)
        .fetch_optional(pool)
        .await
        .map_err(|e| db_error(&QueryContext::new("SELECT", "users"), e))?;

        let Some((user_id, user_email, user_name)) = user else {
            return Ok(None);
        };

        let ctx = ctx.with_user(user_id);
        let offset = (page - 1) * page_size;

        let tracks = sqlx::query_as::<_, ReferenceTrack>(
            r#"
            SELECT * FROM reference_tracks
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
            "#,
        )
        .bind(user_id)
        .bind(page_size)
        .bind(offset)
        .fetch_all(pool)
        .await
        .map_err(|e| db_error(&ctx, e))?;

        let total: (i64,) =
            sqlx::query_as("SELECT COUNT(*) FROM reference_tracks WHERE user_id = $1")
                .bind(user_id)
                .fetch_one(pool)
                .await
                .map_err(|e| db_error(&ctx, e))?;

        Ok(Some((user_id, user_email, user_name, tracks, total.0)))
    }

    /// Update a track
    /// Aligned with migration 0012_reference.sql
    pub async fn update(
        pool: &PgPool,
        id: Uuid,
        user_id: Uuid,
        input: UpdateTrackInput,
    ) -> Result<Option<ReferenceTrack>, AppError> {
        // Build dynamic update query
        let mut updates = Vec::new();
        let mut idx = 3;

        if input.title.is_some() {
            updates.push(format!("title = ${}", idx));
            idx += 1;
        }
        if input.artist.is_some() {
            updates.push(format!("artist = ${}", idx));
            idx += 1;
        }
        if input.album.is_some() {
            updates.push(format!("album = ${}", idx));
            idx += 1;
        }
        if input.genre.is_some() {
            updates.push(format!("genre = ${}", idx));
            idx += 1;
        }
        if input.bpm.is_some() {
            updates.push(format!("bpm = ${}", idx));
            idx += 1;
        }
        if input.key.is_some() {
            updates.push(format!("key = ${}", idx));
            idx += 1;
        }
        if input.duration_seconds.is_some() {
            updates.push(format!("duration_seconds = ${}", idx));
            idx += 1;
        }
        if input.waveform_r2_key.is_some() {
            updates.push(format!("waveform_r2_key = ${}", idx));
            idx += 1;
        }
        if input.thumbnail_r2_key.is_some() {
            updates.push(format!("thumbnail_r2_key = ${}", idx));
            idx += 1;
        }
        if input.file_format.is_some() {
            updates.push(format!("file_format = ${}", idx));
            idx += 1;
        }
        if input.sample_rate.is_some() {
            updates.push(format!("sample_rate = ${}", idx));
            idx += 1;
        }
        if input.bit_depth.is_some() {
            updates.push(format!("bit_depth = ${}", idx));
            idx += 1;
        }
        if input.channels.is_some() {
            updates.push(format!("channels = ${}", idx));
            idx += 1;
        }
        if input.is_reference.is_some() {
            updates.push(format!("is_reference = ${}", idx));
            idx += 1;
        }
        if input.source.is_some() {
            updates.push(format!("source = ${}", idx));
            idx += 1;
        }
        if input.source_url.is_some() {
            updates.push(format!("source_url = ${}", idx));
            idx += 1;
        }
        if input.metadata.is_some() {
            updates.push(format!("metadata = ${}", idx));
            let _ = idx; // suppress unused warning
        }

        if updates.is_empty() {
            // No updates, just return current track
            return Self::find_by_id_for_user(pool, id, user_id).await;
        }

        updates.push("updated_at = NOW()".to_string());
        let update_clause = updates.join(", ");

        let query = format!(
            "UPDATE reference_tracks SET {} WHERE id = $1 AND user_id = $2 RETURNING *",
            update_clause
        );

        let mut q = sqlx::query_as::<_, ReferenceTrack>(&query)
            .bind(id)
            .bind(user_id);

        if let Some(ref title) = input.title {
            q = q.bind(title);
        }
        if let Some(ref artist) = input.artist {
            q = q.bind(artist);
        }
        if let Some(ref album) = input.album {
            q = q.bind(album);
        }
        if let Some(ref genre) = input.genre {
            q = q.bind(genre);
        }
        if let Some(bpm) = input.bpm {
            q = q.bind(bpm);
        }
        if let Some(ref key) = input.key {
            q = q.bind(key);
        }
        if let Some(dur) = input.duration_seconds {
            q = q.bind(dur);
        }
        if let Some(ref waveform) = input.waveform_r2_key {
            q = q.bind(waveform);
        }
        if let Some(ref thumb) = input.thumbnail_r2_key {
            q = q.bind(thumb);
        }
        if let Some(ref fmt) = input.file_format {
            q = q.bind(fmt);
        }
        if let Some(sr) = input.sample_rate {
            q = q.bind(sr);
        }
        if let Some(bd) = input.bit_depth {
            q = q.bind(bd);
        }
        if let Some(ch) = input.channels {
            q = q.bind(ch);
        }
        if let Some(is_ref) = input.is_reference {
            q = q.bind(is_ref);
        }
        if let Some(ref src) = input.source {
            q = q.bind(src);
        }
        if let Some(ref src_url) = input.source_url {
            q = q.bind(src_url);
        }
        if let Some(ref meta) = input.metadata {
            q = q.bind(meta);
        }

        let ctx = QueryContext::new("UPDATE", "reference_tracks")
            .with_user(user_id)
            .with_entity(id);

        let track = q
            .fetch_optional(pool)
            .await
            .map_err(|e| db_error(&ctx, e))?;

        Ok(track)
    }

    /// Delete a track (and cascade to analyses/annotations/regions)
    pub async fn delete(pool: &PgPool, id: Uuid, user_id: Uuid) -> Result<bool, AppError> {
        let ctx = QueryContext::new("DELETE", "reference_tracks")
            .with_user(user_id)
            .with_entity(id);

        let result = sqlx::query("DELETE FROM reference_tracks WHERE id = $1 AND user_id = $2")
            .bind(id)
            .bind(user_id)
            .execute(pool)
            .await
            .map_err(|e| db_error(&ctx, e))?;

        Ok(result.rows_affected() > 0)
    }
}

// =============================================================================
// Track Analyses Repository
// =============================================================================

pub struct TrackAnalysisRepo;

impl TrackAnalysisRepo {
    /// Get analysis by ID
    pub async fn get_by_id(pool: &PgPool, id: Uuid) -> Result<Option<TrackAnalysis>, AppError> {
        let ctx = QueryContext::new("SELECT", "track_analyses")
            .with_entity(id);

        let analysis =
            sqlx::query_as::<_, TrackAnalysis>("SELECT * FROM track_analyses WHERE id = $1")
                .bind(id)
                .fetch_optional(pool)
                .await
                .map_err(|e| db_error(&ctx, e))?;

        Ok(analysis)
    }

    /// Create a new analysis
    pub async fn create(
        pool: &PgPool,
        track_id: Uuid,
        analysis_type: &str,
    ) -> Result<TrackAnalysis, AppError> {
        let ctx = QueryContext::new("INSERT", "track_analyses")
            .with_entity(track_id);

        let analysis = sqlx::query_as::<_, TrackAnalysis>(
            r#"
            INSERT INTO track_analyses (track_id, analysis_type, status)
            VALUES ($1, $2, 'pending')
            RETURNING *
            "#,
        )
        .bind(track_id)
        .bind(analysis_type)
        .fetch_one(pool)
        .await
        .map_err(|e| db_error(&ctx, e))?;

        Ok(analysis)
    }

    /// Get latest analysis for a track
    pub async fn get_latest(
        pool: &PgPool,
        track_id: Uuid,
        analysis_type: Option<&str>,
    ) -> Result<Option<TrackAnalysis>, AppError> {
        let ctx = QueryContext::new("SELECT", "track_analyses")
            .with_entity(track_id);

        let analysis = if let Some(atype) = analysis_type {
            sqlx::query_as::<_, TrackAnalysis>(
                r#"
                SELECT * FROM track_analyses
                WHERE track_id = $1 AND analysis_type = $2
                ORDER BY created_at DESC
                LIMIT 1
                "#,
            )
            .bind(track_id)
            .bind(atype)
            .fetch_optional(pool)
            .await
        } else {
            sqlx::query_as::<_, TrackAnalysis>(
                r#"
                SELECT * FROM track_analyses
                WHERE track_id = $1
                ORDER BY created_at DESC
                LIMIT 1
                "#,
            )
            .bind(track_id)
            .fetch_optional(pool)
            .await
        }
        .map_err(|e| db_error(&ctx, e))?;

        Ok(analysis)
    }

    /// Update analysis status and results
    /// Aligned with migration 0012_reference.sql
    pub async fn update_status(
        pool: &PgPool,
        id: Uuid,
        status: &str,
        results: Option<serde_json::Value>,
        error_message: Option<&str>,
    ) -> Result<(), AppError> {
        let ctx = QueryContext::new("UPDATE", "track_analyses")
            .with_entity(id);

        let completed_at = if status == "completed" {
            Some(chrono::Utc::now())
        } else {
            None
        };

        sqlx::query(
            r#"
            UPDATE track_analyses
            SET status = $2,
                results = COALESCE($3, results),
                error_message = $4,
                completed_at = COALESCE($5, completed_at)
            WHERE id = $1
            "#,
        )
        .bind(id)
        .bind(status)
        .bind(results)
        .bind(error_message)
        .bind(completed_at)
        .execute(pool)
        .await
        .map_err(|e| db_error(&ctx, e))?;

        Ok(())
    }

    /// Mark analysis as started
    pub async fn mark_started(pool: &PgPool, id: Uuid) -> Result<(), AppError> {
        let ctx = QueryContext::new("UPDATE", "track_analyses")
            .with_entity(id);

        sqlx::query(
            r#"
            UPDATE track_analyses
            SET status = 'running', started_at = NOW()
            WHERE id = $1
            "#,
        )
        .bind(id)
        .execute(pool)
        .await
        .map_err(|e| db_error(&ctx, e))?;

        Ok(())
    }
}

// =============================================================================
// Track Annotations Repository
// =============================================================================

pub struct TrackAnnotationRepo;

impl TrackAnnotationRepo {
    /// Create a new annotation
    /// Aligned with migration 0012_reference.sql - uses seconds not ms
    pub async fn create(
        pool: &PgPool,
        track_id: Uuid,
        user_id: Uuid,
        input: CreateAnnotationInput,
    ) -> Result<TrackAnnotation, AppError> {
        let ctx = QueryContext::new("INSERT", "track_annotations")
            .with_user(user_id)
            .with_entity(track_id);

        let annotation = sqlx::query_as::<_, TrackAnnotation>(
            r#"
            INSERT INTO track_annotations (
                track_id, user_id, start_time_seconds, end_time_seconds,
                annotation_type, title, content, color, tags, is_private
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
            "#,
        )
        .bind(track_id)
        .bind(user_id)
        .bind(input.start_time_seconds)
        .bind(input.end_time_seconds)
        .bind(&input.annotation_type)
        .bind(&input.title)
        .bind(&input.content)
        .bind(&input.color)
        .bind(&input.tags)
        .bind(input.is_private.unwrap_or(true))
        .fetch_one(pool)
        .await
        .map_err(|e| db_error(&ctx, e))?;

        Ok(annotation)
    }

    /// List annotations for a track (respects privacy)
    pub async fn list_for_track(
        pool: &PgPool,
        track_id: Uuid,
        user_id: Uuid,
    ) -> Result<Vec<TrackAnnotation>, AppError> {
        let ctx = QueryContext::new("SELECT", "track_annotations")
            .with_user(user_id)
            .with_entity(track_id);

        let annotations = sqlx::query_as::<_, TrackAnnotation>(
            r#"
            SELECT * FROM track_annotations
            WHERE track_id = $1 AND (user_id = $2 OR is_private = false)
            ORDER BY start_time_seconds ASC
            "#,
        )
        .bind(track_id)
        .bind(user_id)
        .fetch_all(pool)
        .await
        .map_err(|e| db_error(&ctx, e))?;

        Ok(annotations)
    }

    /// Get annotation by ID with ownership check
    pub async fn find_by_id_for_user(
        pool: &PgPool,
        id: Uuid,
        user_id: Uuid,
    ) -> Result<Option<TrackAnnotation>, AppError> {
        let ctx = QueryContext::new("SELECT", "track_annotations")
            .with_user(user_id)
            .with_entity(id);

        let annotation = sqlx::query_as::<_, TrackAnnotation>(
            "SELECT * FROM track_annotations WHERE id = $1 AND user_id = $2",
        )
        .bind(id)
        .bind(user_id)
        .fetch_optional(pool)
        .await
        .map_err(|e| db_error(&ctx, e))?;

        Ok(annotation)
    }

    /// Update an annotation
    /// Aligned with migration 0012_reference.sql
    pub async fn update(
        pool: &PgPool,
        id: Uuid,
        user_id: Uuid,
        input: UpdateAnnotationInput,
    ) -> Result<Option<TrackAnnotation>, AppError> {
        let ctx = QueryContext::new("UPDATE", "track_annotations")
            .with_user(user_id)
            .with_entity(id);

        let annotation = sqlx::query_as::<_, TrackAnnotation>(
            r#"
            UPDATE track_annotations SET
                start_time_seconds = COALESCE($3, start_time_seconds),
                end_time_seconds = COALESCE($4, end_time_seconds),
                annotation_type = COALESCE($5, annotation_type),
                title = COALESCE($6, title),
                content = COALESCE($7, content),
                color = COALESCE($8, color),
                tags = COALESCE($9, tags),
                is_private = COALESCE($10, is_private),
                updated_at = NOW()
            WHERE id = $1 AND user_id = $2
            RETURNING *
            "#,
        )
        .bind(id)
        .bind(user_id)
        .bind(input.start_time_seconds)
        .bind(input.end_time_seconds)
        .bind(&input.annotation_type)
        .bind(&input.title)
        .bind(&input.content)
        .bind(&input.color)
        .bind(&input.tags)
        .bind(input.is_private)
        .fetch_optional(pool)
        .await
        .map_err(|e| db_error(&ctx, e))?;

        Ok(annotation)
    }

    /// Delete an annotation
    pub async fn delete(pool: &PgPool, id: Uuid, user_id: Uuid) -> Result<bool, AppError> {
        let ctx = QueryContext::new("DELETE", "track_annotations")
            .with_user(user_id)
            .with_entity(id);

        let result = sqlx::query("DELETE FROM track_annotations WHERE id = $1 AND user_id = $2")
            .bind(id)
            .bind(user_id)
            .execute(pool)
            .await
            .map_err(|e| db_error(&ctx, e))?;

        Ok(result.rows_affected() > 0)
    }
}

// =============================================================================
// Track Regions Repository
// =============================================================================

pub struct TrackRegionRepo;

impl TrackRegionRepo {
    /// Create a new region
    /// Aligned with migration 0012_reference.sql - uses seconds not ms
    pub async fn create(
        pool: &PgPool,
        track_id: Uuid,
        user_id: Uuid,
        input: CreateRegionInput,
    ) -> Result<TrackRegion, AppError> {
        let ctx = QueryContext::new("INSERT", "track_regions")
            .with_user(user_id)
            .with_entity(track_id);

        let region = sqlx::query_as::<_, TrackRegion>(
            r#"
            INSERT INTO track_regions (
                track_id, user_id, name, start_time_seconds, end_time_seconds,
                color, region_type, notes, is_favorite
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
            "#,
        )
        .bind(track_id)
        .bind(user_id)
        .bind(&input.name)
        .bind(input.start_time_seconds)
        .bind(input.end_time_seconds)
        .bind(&input.color)
        .bind(&input.region_type)
        .bind(&input.notes)
        .bind(input.is_favorite.unwrap_or(false))
        .fetch_one(pool)
        .await
        .map_err(|e| db_error(&ctx, e))?;

        Ok(region)
    }

    /// List regions for a track
    pub async fn list_for_track(
        pool: &PgPool,
        track_id: Uuid,
        user_id: Uuid,
    ) -> Result<Vec<TrackRegion>, AppError> {
        let ctx = QueryContext::new("SELECT", "track_regions")
            .with_user(user_id)
            .with_entity(track_id);

        let regions = sqlx::query_as::<_, TrackRegion>(
            r#"
            SELECT * FROM track_regions
            WHERE track_id = $1 AND user_id = $2
            ORDER BY start_time_seconds ASC
            "#,
        )
        .bind(track_id)
        .bind(user_id)
        .fetch_all(pool)
        .await
        .map_err(|e| db_error(&ctx, e))?;

        Ok(regions)
    }

    /// Get region by ID with ownership check
    pub async fn find_by_id_for_user(
        pool: &PgPool,
        id: Uuid,
        user_id: Uuid,
    ) -> Result<Option<TrackRegion>, AppError> {
        let ctx = QueryContext::new("SELECT", "track_regions")
            .with_user(user_id)
            .with_entity(id);

        let region = sqlx::query_as::<_, TrackRegion>(
            "SELECT * FROM track_regions WHERE id = $1 AND user_id = $2",
        )
        .bind(id)
        .bind(user_id)
        .fetch_optional(pool)
        .await
        .map_err(|e| db_error(&ctx, e))?;

        Ok(region)
    }

    /// Update a region
    /// Aligned with migration 0012_reference.sql
    pub async fn update(
        pool: &PgPool,
        id: Uuid,
        user_id: Uuid,
        input: UpdateRegionInput,
    ) -> Result<Option<TrackRegion>, AppError> {
        let ctx = QueryContext::new("UPDATE", "track_regions")
            .with_user(user_id)
            .with_entity(id);

        let region = sqlx::query_as::<_, TrackRegion>(
            r#"
            UPDATE track_regions SET
                name = COALESCE($3, name),
                start_time_seconds = COALESCE($4, start_time_seconds),
                end_time_seconds = COALESCE($5, end_time_seconds),
                color = COALESCE($6, color),
                region_type = COALESCE($7, region_type),
                notes = COALESCE($8, notes),
                loop_count = COALESCE($9, loop_count),
                is_favorite = COALESCE($10, is_favorite),
                updated_at = NOW()
            WHERE id = $1 AND user_id = $2
            RETURNING *
            "#,
        )
        .bind(id)
        .bind(user_id)
        .bind(&input.name)
        .bind(input.start_time_seconds)
        .bind(input.end_time_seconds)
        .bind(&input.color)
        .bind(&input.region_type)
        .bind(&input.notes)
        .bind(input.loop_count)
        .bind(input.is_favorite)
        .fetch_optional(pool)
        .await
        .map_err(|e| db_error(&ctx, e))?;

        Ok(region)
    }

    /// Delete a region
    pub async fn delete(pool: &PgPool, id: Uuid, user_id: Uuid) -> Result<bool, AppError> {
        let ctx = QueryContext::new("DELETE", "track_regions")
            .with_user(user_id)
            .with_entity(id);

        let result = sqlx::query("DELETE FROM track_regions WHERE id = $1 AND user_id = $2")
            .bind(id)
            .bind(user_id)
            .execute(pool)
            .await
            .map_err(|e| db_error(&ctx, e))?;

        Ok(result.rows_affected() > 0)
    }
}
