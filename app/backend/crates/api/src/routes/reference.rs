//! Reference tracks routes
//!
//! API endpoints for the Critical Listening domain:
//! - Track CRUD
//! - Analysis management
//! - Annotations CRUD
//! - Regions CRUD

use std::sync::Arc;

use axum::{
    extract::{Path, Query, State},
    routing::{delete, get, patch, post},
    Extension, Json, Router,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::db::reference_models::*;
use crate::db::reference_repos::*;
use crate::error::{AppError, AppResult};
use crate::middleware::auth::AuthContext;
use crate::state::AppState;
use crate::storage::SignedUrlResponse;

/// Create reference tracks routes
pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        // Track routes
        .route("/tracks", get(list_tracks))
        .route("/tracks", post(create_track))
        .route("/tracks/{id}", get(get_track))
        .route("/tracks/{id}", patch(update_track))
        .route("/tracks/{id}", delete(delete_track))
        // Cross-user track browsing
        .route("/browse", get(browse_tracks_by_email))
        // Upload routes
        .route("/upload", post(upload_track))
        .route("/upload/init", post(init_upload))
        // Analysis routes
        .route("/tracks/{id}/analysis", get(get_analysis))
        .route("/tracks/{id}/analysis", post(start_analysis))
        // Streaming routes
        .route("/tracks/{id}/stream", get(stream_track))
        .route("/tracks/{id}/play", get(stream_track))
        // Annotation routes
        .route("/tracks/{id}/annotations", get(list_annotations))
        .route("/tracks/{id}/annotations", post(create_annotation))
        .route("/annotations/{id}", get(get_annotation))
        .route("/annotations/{id}", patch(update_annotation))
        .route("/annotations/{id}", delete(delete_annotation))
        // Region routes
        .route("/tracks/{id}/regions", get(list_regions))
        .route("/tracks/{id}/regions", post(create_region))
        .route("/regions/{id}", get(get_region))
        .route("/regions/{id}", patch(update_region))
        .route("/regions/{id}", delete(delete_region))
}

// =============================================================================
// Request/Response types
// =============================================================================

#[derive(Debug, Deserialize)]
pub struct ListTracksQuery {
    #[serde(default = "default_page")]
    pub page: i32,
    #[serde(default = "default_page_size")]
    pub page_size: i32,
}

#[derive(Debug, Deserialize)]
pub struct BrowseTracksQuery {
    /// Email of the user whose tracks to browse
    pub email: String,
    #[serde(default = "default_page")]
    pub page: i32,
    #[serde(default = "default_page_size")]
    pub page_size: i32,
}

#[derive(Debug, Serialize)]
pub struct BrowseTracksResponse {
    pub user_email: String,
    pub user_name: Option<String>,
    pub tracks: Vec<ReferenceTrack>,
    pub total: i64,
    pub page: i32,
    pub page_size: i32,
}

fn default_page() -> i32 {
    1
}

fn default_page_size() -> i32 {
    20
}

#[derive(Debug, Deserialize)]
pub struct CreateTrackRequest {
    pub title: String,
    pub r2_key: String,
    pub artist: Option<String>,
    pub album: Option<String>,
    pub genre: Option<String>,
    pub bpm: Option<f32>,
    pub key: Option<String>,
    pub duration_seconds: Option<f32>,
    pub waveform_r2_key: Option<String>,
    pub thumbnail_r2_key: Option<String>,
    pub file_format: Option<String>,
    pub sample_rate: Option<i32>,
    pub bit_depth: Option<i32>,
    pub channels: Option<i32>,
    pub is_reference: Option<bool>,
    pub is_user_upload: Option<bool>,
    pub source: Option<String>,
    pub source_url: Option<String>,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateTrackRequest {
    pub title: Option<String>,
    pub artist: Option<String>,
    pub album: Option<String>,
    pub genre: Option<String>,
    pub bpm: Option<f32>,
    pub key: Option<String>,
    pub duration_seconds: Option<f32>,
    pub waveform_r2_key: Option<String>,
    pub thumbnail_r2_key: Option<String>,
    pub file_format: Option<String>,
    pub sample_rate: Option<i32>,
    pub bit_depth: Option<i32>,
    pub channels: Option<i32>,
    pub is_reference: Option<bool>,
    pub source: Option<String>,
    pub source_url: Option<String>,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Serialize)]
pub struct TrackResponse {
    pub track: ReferenceTrack,
    pub annotation_count: i64,
    pub region_count: i64,
    pub latest_analysis: Option<AnalysisSummary>,
}

#[derive(Debug, Deserialize)]
pub struct InitUploadRequest {
    pub filename: String,
    pub mime_type: String,
    #[allow(dead_code)]
    pub file_size_bytes: i64,
}

#[derive(Debug, Serialize)]
pub struct InitUploadResponse {
    pub upload_url: String,
    pub r2_key: String,
    pub expires_at: String,
}

#[derive(Debug, Deserialize)]
pub struct StartAnalysisRequest {
    pub analysis_type: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateAnnotationRequest {
    pub start_time_seconds: f32,
    pub end_time_seconds: Option<f32>,
    pub annotation_type: String,
    pub title: Option<String>,
    pub content: Option<String>,
    pub color: Option<String>,
    pub tags: Option<Vec<String>>,
    pub is_private: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateAnnotationRequest {
    pub start_time_seconds: Option<f32>,
    pub end_time_seconds: Option<f32>,
    pub annotation_type: Option<String>,
    pub title: Option<String>,
    pub content: Option<String>,
    pub color: Option<String>,
    pub tags: Option<Vec<String>>,
    pub is_private: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct CreateRegionRequest {
    pub name: String,
    pub start_time_seconds: f32,
    pub end_time_seconds: f32,
    pub color: Option<String>,
    pub region_type: Option<String>,
    pub notes: Option<String>,
    pub is_favorite: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateRegionRequest {
    pub name: Option<String>,
    pub start_time_seconds: Option<f32>,
    pub end_time_seconds: Option<f32>,
    pub color: Option<String>,
    pub region_type: Option<String>,
    pub notes: Option<String>,
    pub loop_count: Option<i32>,
    pub is_favorite: Option<bool>,
}

// =============================================================================
// Track handlers
// =============================================================================

/// Browse tracks by user email (cross-user viewing)
async fn browse_tracks_by_email(
    State(state): State<Arc<AppState>>,
    Extension(_auth): Extension<AuthContext>,
    Query(query): Query<BrowseTracksQuery>,
) -> AppResult<Json<BrowseTracksResponse>> {
    let result = ReferenceTrackRepo::list_by_user_email(
        &state.db,
        &query.email,
        query.page,
        query.page_size,
    )
    .await?;

    match result {
        Some((_user_id, user_email, user_name, tracks, total)) => {
            Ok(Json(BrowseTracksResponse {
                user_email,
                user_name,
                tracks,
                total,
                page: query.page,
                page_size: query.page_size,
            }))
        }
        None => Err(AppError::NotFound(format!(
            "User with email '{}' not found",
            query.email
        ))),
    }
}

/// List user's tracks
async fn list_tracks(
    State(state): State<Arc<AppState>>,
    Extension(auth): Extension<AuthContext>,
    Query(query): Query<ListTracksQuery>,
) -> AppResult<Json<PaginatedResponse<ReferenceTrack>>> {
    let (tracks, total) =
        ReferenceTrackRepo::list_for_user(&state.db, auth.user_id, query.page, query.page_size)
            .await?;

    Ok(Json(PaginatedResponse::new(
        tracks,
        total,
        query.page,
        query.page_size,
    )))
}

/// Create a new track (after upload complete)
async fn create_track(
    State(state): State<Arc<AppState>>,
    Extension(auth): Extension<AuthContext>,
    Json(request): Json<CreateTrackRequest>,
) -> AppResult<Json<ReferenceTrack>> {
    let input = CreateTrackInput {
        title: request.title,
        r2_key: request.r2_key,
        artist: request.artist,
        album: request.album,
        genre: request.genre,
        bpm: request.bpm,
        key: request.key,
        duration_seconds: request.duration_seconds,
        waveform_r2_key: request.waveform_r2_key,
        thumbnail_r2_key: request.thumbnail_r2_key,
        file_format: request.file_format,
        sample_rate: request.sample_rate,
        bit_depth: request.bit_depth,
        channels: request.channels,
        is_reference: request.is_reference,
        is_user_upload: request.is_user_upload,
        source: request.source,
        source_url: request.source_url,
        metadata: request.metadata,
    };

    let track = ReferenceTrackRepo::create(&state.db, auth.user_id, input).await?;

    Ok(Json(track))
}

/// Get a track by ID
async fn get_track(
    State(state): State<Arc<AppState>>,
    Extension(auth): Extension<AuthContext>,
    Path(id): Path<Uuid>,
) -> AppResult<Json<TrackResponse>> {
    let track = ReferenceTrackRepo::find_by_id_for_user(&state.db, id, auth.user_id)
        .await?
        .ok_or_else(|| AppError::NotFound("Track not found".to_string()))?;

    // Get annotation and region counts
    let annotations = TrackAnnotationRepo::list_for_track(&state.db, id, auth.user_id).await?;
    let regions = TrackRegionRepo::list_for_track(&state.db, id, auth.user_id).await?;

    // Get latest analysis
    let analysis = TrackAnalysisRepo::get_latest(&state.db, id, None).await?;
    let latest_analysis = analysis.map(|a| AnalysisSummary {
        id: a.id,
        analysis_type: a.analysis_type,
        status: a.status,
        parameters: a.parameters,
        completed_at: a.completed_at,
    });

    Ok(Json(TrackResponse {
        track,
        annotation_count: annotations.len() as i64,
        region_count: regions.len() as i64,
        latest_analysis,
    }))
}

/// Update a track
async fn update_track(
    State(state): State<Arc<AppState>>,
    Extension(auth): Extension<AuthContext>,
    Path(id): Path<Uuid>,
    Json(request): Json<UpdateTrackRequest>,
) -> AppResult<Json<ReferenceTrack>> {
    let input = UpdateTrackInput {
        title: request.title,
        artist: request.artist,
        album: request.album,
        genre: request.genre,
        bpm: request.bpm,
        key: request.key,
        duration_seconds: request.duration_seconds,
        waveform_r2_key: request.waveform_r2_key,
        thumbnail_r2_key: request.thumbnail_r2_key,
        file_format: request.file_format,
        sample_rate: request.sample_rate,
        bit_depth: request.bit_depth,
        channels: request.channels,
        is_reference: request.is_reference,
        source: request.source,
        source_url: request.source_url,
        metadata: request.metadata,
    };

    let track = ReferenceTrackRepo::update(&state.db, id, auth.user_id, input)
        .await?
        .ok_or_else(|| AppError::NotFound("Track not found".to_string()))?;

    Ok(Json(track))
}

/// Delete a track
async fn delete_track(
    State(state): State<Arc<AppState>>,
    Extension(auth): Extension<AuthContext>,
    Path(id): Path<Uuid>,
) -> AppResult<Json<serde_json::Value>> {
    // Get track first to get R2 key
    let track = ReferenceTrackRepo::find_by_id_for_user(&state.db, id, auth.user_id)
        .await?
        .ok_or_else(|| AppError::NotFound("Track not found".to_string()))?;

    // Delete from database (cascades to analyses, annotations, regions)
    let deleted = ReferenceTrackRepo::delete(&state.db, id, auth.user_id).await?;

    if !deleted {
        return Err(AppError::NotFound("Track not found".to_string()));
    }

    // Delete from R2 storage
    if let Some(storage) = &state.storage {
        if let Err(e) = storage.delete_by_key(&track.r2_key).await {
            tracing::warn!("Failed to delete R2 object {}: {}", track.r2_key, e);
            // Don't fail the request - DB deletion succeeded
        }
    }

    Ok(Json(serde_json::json!({ "success": true })))
}

// =============================================================================
// Upload handlers
// =============================================================================

/// Initialize an upload (get signed URL)
async fn init_upload(
    State(state): State<Arc<AppState>>,
    Extension(auth): Extension<AuthContext>,
    Json(request): Json<InitUploadRequest>,
) -> AppResult<Json<InitUploadResponse>> {
    // Validate MIME type is audio
    if !request.mime_type.starts_with("audio/") {
        return Err(AppError::Validation(
            "Only audio files are allowed for reference tracks".to_string(),
        ));
    }

    let storage = state
        .storage
        .as_ref()
        .ok_or_else(|| AppError::Config("Storage not configured".to_string()))?;

    let response = storage
        .generate_signed_upload_url(&auth.user_id, &request.mime_type, &request.filename)
        .await?;

    // Use the key returned by storage (same as the presigned URL target)
    let r2_key = response.key.clone().ok_or_else(|| {
        AppError::Internal("Storage did not return upload key".to_string())
    })?;

    Ok(Json(InitUploadResponse {
        upload_url: response.url,
        r2_key,
        expires_at: response.expires_at,
    }))
}

/// Upload a track directly (backend proxies to R2)
async fn upload_track(
    State(state): State<Arc<AppState>>,
    Extension(auth): Extension<AuthContext>,
    mut multipart: axum::extract::Multipart,
) -> AppResult<Json<ReferenceTrack>> {
    let storage = state
        .storage
        .as_ref()
        .ok_or_else(|| AppError::Config("Storage not configured".to_string()))?;

    let mut file_data: Option<Vec<u8>> = None;
    let mut filename: Option<String> = None;
    let mut mime_type: Option<String> = None;
    let mut name: Option<String> = None;
    let mut description: Option<String> = None;

    // Parse multipart form
    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|e| AppError::BadRequest(format!("Multipart error: {}", e)))?
    {
        let field_name = field.name().unwrap_or("").to_string();

        match field_name.as_str() {
            "file" => {
                filename = field.file_name().map(|s| s.to_string());
                mime_type = field.content_type().map(|s| s.to_string());
                file_data = Some(
                    field
                        .bytes()
                        .await
                        .map_err(|e| AppError::BadRequest(format!("File read error: {}", e)))?
                        .to_vec(),
                );
            }
            "name" => {
                name = Some(
                    field
                        .text()
                        .await
                        .map_err(|e| AppError::BadRequest(format!("Read error: {}", e)))?,
                );
            }
            "description" => {
                description = Some(
                    field
                        .text()
                        .await
                        .map_err(|e| AppError::BadRequest(format!("Read error: {}", e)))?,
                );
            }
            _ => {}
        }
    }

    let data = file_data.ok_or_else(|| AppError::BadRequest("No file provided".to_string()))?;
    let filename = filename.unwrap_or_else(|| "unnamed.mp3".to_string());
    let mime_type = mime_type.unwrap_or_else(|| "audio/mpeg".to_string());

    // Validate MIME type is audio
    if !mime_type.starts_with("audio/") {
        return Err(AppError::Validation(
            "Only audio files are allowed for reference tracks".to_string(),
        ));
    }

    let file_size = data.len() as i64;
    let track_name = name.unwrap_or_else(|| filename.clone());

    // Upload to R2
    let upload_request = crate::storage::UploadRequest {
        user_id: auth.user_id,
        filename: filename.clone(),
        mime_type: mime_type.clone(),
        data,
        metadata: None,
    };

    let upload_response = storage.upload(upload_request).await?;

    // Create track record
    let input = CreateTrackInput {
        title: track_name,
        r2_key: upload_response.key,
        artist: None,
        album: None,
        genre: None,
        bpm: None,
        key: None,
        duration_seconds: None, // Will be set after analysis
        waveform_r2_key: None,
        thumbnail_r2_key: None,
        file_format: Some(mime_type),
        sample_rate: None,
        bit_depth: None,
        channels: None,
        is_reference: Some(true),
        is_user_upload: Some(true),
        source: None,
        source_url: None,
        metadata: None,
    };

    let track = ReferenceTrackRepo::create(&state.db, auth.user_id, input).await?;

    Ok(Json(track))
}

/// Stream a track (get signed download URL or proxy)
async fn stream_track(
    State(state): State<Arc<AppState>>,
    Extension(auth): Extension<AuthContext>,
    Path(id): Path<Uuid>,
) -> AppResult<Json<SignedUrlResponse>> {
    // Verify ownership
    let track = ReferenceTrackRepo::find_by_id_for_user(&state.db, id, auth.user_id)
        .await?
        .ok_or_else(|| AppError::NotFound("Track not found".to_string()))?;

    let storage = state
        .storage
        .as_ref()
        .ok_or_else(|| AppError::Config("Storage not configured".to_string()))?;

    // Generate signed download URL
    let response = storage.generate_signed_download_url(&track.r2_key).await?;

    Ok(Json(response))
}

// =============================================================================
// Analysis handlers
// =============================================================================

/// Get latest analysis for a track
async fn get_analysis(
    State(state): State<Arc<AppState>>,
    Extension(auth): Extension<AuthContext>,
    Path(id): Path<Uuid>,
) -> AppResult<Json<Option<TrackAnalysis>>> {
    // Verify ownership
    let _track = ReferenceTrackRepo::find_by_id_for_user(&state.db, id, auth.user_id)
        .await?
        .ok_or_else(|| AppError::NotFound("Track not found".to_string()))?;

    let analysis = TrackAnalysisRepo::get_latest(&state.db, id, None).await?;

    Ok(Json(analysis))
}

/// Start an analysis (creates pending job)
async fn start_analysis(
    State(state): State<Arc<AppState>>,
    Extension(auth): Extension<AuthContext>,
    Path(id): Path<Uuid>,
    Json(request): Json<StartAnalysisRequest>,
) -> AppResult<Json<TrackAnalysis>> {
    // Verify ownership
    let _track = ReferenceTrackRepo::find_by_id_for_user(&state.db, id, auth.user_id)
        .await?
        .ok_or_else(|| AppError::NotFound("Track not found".to_string()))?;

    let analysis_type = request.analysis_type.unwrap_or_else(|| "full".to_string());

    // Create analysis record (job stub - actual processing would be async)
    let analysis = TrackAnalysisRepo::create(&state.db, id, &analysis_type).await?;

    // In a real implementation, we would queue a job here
    // For now, we just mark it as pending and it would be processed by a worker
    TrackAnalysisRepo::mark_started(&state.db, analysis.id).await?;

    // Stub: immediately complete with dummy results
    // In production, a background worker would do this
    let results = serde_json::json!({
        "status": "stub",
        "message": "Analysis processing is a stub in v1"
    });
    TrackAnalysisRepo::update_status(
        &state.db,
        analysis.id,
        "completed",
        Some(results),
        None,
    )
    .await?;

    // Fetch updated analysis
    let analysis = TrackAnalysisRepo::get_latest(&state.db, id, Some(&analysis_type))
        .await?
        .ok_or_else(|| AppError::Internal("Analysis not found after creation".to_string()))?;

    Ok(Json(analysis))
}

// =============================================================================
// Annotation handlers
// =============================================================================

/// Wrapper for annotations list response (frontend expects { annotations: [...] })
#[derive(Debug, Serialize)]
struct AnnotationsResponse {
    annotations: Vec<TrackAnnotation>,
}

/// List annotations for a track
async fn list_annotations(
    State(state): State<Arc<AppState>>,
    Extension(auth): Extension<AuthContext>,
    Path(id): Path<Uuid>,
) -> AppResult<Json<AnnotationsResponse>> {
    // Verify track exists and user has access
    let _track = ReferenceTrackRepo::find_by_id_for_user(&state.db, id, auth.user_id)
        .await?
        .ok_or_else(|| AppError::NotFound("Track not found".to_string()))?;

    let annotations = TrackAnnotationRepo::list_for_track(&state.db, id, auth.user_id).await?;

    Ok(Json(AnnotationsResponse { annotations }))
}

/// Create an annotation
async fn create_annotation(
    State(state): State<Arc<AppState>>,
    Extension(auth): Extension<AuthContext>,
    Path(track_id): Path<Uuid>,
    Json(request): Json<CreateAnnotationRequest>,
) -> AppResult<Json<TrackAnnotation>> {
    // Verify track ownership
    let _track = ReferenceTrackRepo::find_by_id_for_user(&state.db, track_id, auth.user_id)
        .await?
        .ok_or_else(|| AppError::NotFound("Track not found".to_string()))?;

    // Validate times
    if request.start_time_seconds < 0.0 {
        return Err(AppError::Validation(
            "start_time_seconds must be non-negative".to_string(),
        ));
    }
    if let Some(end) = request.end_time_seconds {
        if end <= request.start_time_seconds {
            return Err(AppError::Validation(
                "end_time_seconds must be greater than start_time_seconds".to_string(),
            ));
        }
    }

    let input = CreateAnnotationInput {
        start_time_seconds: request.start_time_seconds,
        end_time_seconds: request.end_time_seconds,
        annotation_type: request.annotation_type,
        title: request.title,
        content: request.content,
        color: request.color,
        tags: request.tags,
        is_private: request.is_private,
    };

    let annotation = TrackAnnotationRepo::create(&state.db, track_id, auth.user_id, input).await?;

    Ok(Json(annotation))
}

/// Get an annotation by ID
async fn get_annotation(
    State(state): State<Arc<AppState>>,
    Extension(auth): Extension<AuthContext>,
    Path(id): Path<Uuid>,
) -> AppResult<Json<TrackAnnotation>> {
    let annotation = TrackAnnotationRepo::find_by_id_for_user(&state.db, id, auth.user_id)
        .await?
        .ok_or_else(|| AppError::NotFound("Annotation not found".to_string()))?;

    Ok(Json(annotation))
}

/// Update an annotation
async fn update_annotation(
    State(state): State<Arc<AppState>>,
    Extension(auth): Extension<AuthContext>,
    Path(id): Path<Uuid>,
    Json(request): Json<UpdateAnnotationRequest>,
) -> AppResult<Json<TrackAnnotation>> {
    // Validate times if provided
    if let (Some(start), Some(end)) = (request.start_time_seconds, request.end_time_seconds) {
        if end <= start {
            return Err(AppError::Validation(
                "end_time_seconds must be greater than start_time_seconds".to_string(),
            ));
        }
    }

    let input = UpdateAnnotationInput {
        start_time_seconds: request.start_time_seconds,
        end_time_seconds: request.end_time_seconds,
        annotation_type: request.annotation_type,
        title: request.title,
        content: request.content,
        color: request.color,
        tags: request.tags,
        is_private: request.is_private,
    };

    let annotation = TrackAnnotationRepo::update(&state.db, id, auth.user_id, input)
        .await?
        .ok_or_else(|| AppError::NotFound("Annotation not found".to_string()))?;

    Ok(Json(annotation))
}

/// Delete an annotation
async fn delete_annotation(
    State(state): State<Arc<AppState>>,
    Extension(auth): Extension<AuthContext>,
    Path(id): Path<Uuid>,
) -> AppResult<Json<serde_json::Value>> {
    let deleted = TrackAnnotationRepo::delete(&state.db, id, auth.user_id).await?;

    if !deleted {
        return Err(AppError::NotFound("Annotation not found".to_string()));
    }

    Ok(Json(serde_json::json!({ "success": true })))
}

// =============================================================================
// Region handlers
// =============================================================================

/// Wrapper for regions list response (frontend expects { regions: [...] })
#[derive(Debug, Serialize)]
struct RegionsResponse {
    regions: Vec<TrackRegion>,
}

/// List regions for a track
async fn list_regions(
    State(state): State<Arc<AppState>>,
    Extension(auth): Extension<AuthContext>,
    Path(id): Path<Uuid>,
) -> AppResult<Json<RegionsResponse>> {
    // Verify track ownership
    let _track = ReferenceTrackRepo::find_by_id_for_user(&state.db, id, auth.user_id)
        .await?
        .ok_or_else(|| AppError::NotFound("Track not found".to_string()))?;

    let regions = TrackRegionRepo::list_for_track(&state.db, id, auth.user_id).await?;

    Ok(Json(RegionsResponse { regions }))
}

/// Create a region
async fn create_region(
    State(state): State<Arc<AppState>>,
    Extension(auth): Extension<AuthContext>,
    Path(track_id): Path<Uuid>,
    Json(request): Json<CreateRegionRequest>,
) -> AppResult<Json<TrackRegion>> {
    // Verify track ownership
    let _track = ReferenceTrackRepo::find_by_id_for_user(&state.db, track_id, auth.user_id)
        .await?
        .ok_or_else(|| AppError::NotFound("Track not found".to_string()))?;

    // Validate times
    if request.start_time_seconds < 0.0 {
        return Err(AppError::Validation(
            "start_time_seconds must be non-negative".to_string(),
        ));
    }
    if request.end_time_seconds <= request.start_time_seconds {
        return Err(AppError::Validation(
            "end_time_seconds must be greater than start_time_seconds".to_string(),
        ));
    }

    let input = CreateRegionInput {
        name: request.name,
        start_time_seconds: request.start_time_seconds,
        end_time_seconds: request.end_time_seconds,
        color: request.color,
        region_type: request.region_type,
        notes: request.notes,
        is_favorite: request.is_favorite,
    };

    let region = TrackRegionRepo::create(&state.db, track_id, auth.user_id, input).await?;

    Ok(Json(region))
}

/// Get a region by ID
async fn get_region(
    State(state): State<Arc<AppState>>,
    Extension(auth): Extension<AuthContext>,
    Path(id): Path<Uuid>,
) -> AppResult<Json<TrackRegion>> {
    let region = TrackRegionRepo::find_by_id_for_user(&state.db, id, auth.user_id)
        .await?
        .ok_or_else(|| AppError::NotFound("Region not found".to_string()))?;

    Ok(Json(region))
}

/// Update a region
async fn update_region(
    State(state): State<Arc<AppState>>,
    Extension(auth): Extension<AuthContext>,
    Path(id): Path<Uuid>,
    Json(request): Json<UpdateRegionRequest>,
) -> AppResult<Json<TrackRegion>> {
    // Validate times if provided
    if let (Some(start), Some(end)) = (request.start_time_seconds, request.end_time_seconds) {
        if end <= start {
            return Err(AppError::Validation(
                "end_time_seconds must be greater than start_time_seconds".to_string(),
            ));
        }
    }

    let input = UpdateRegionInput {
        name: request.name,
        start_time_seconds: request.start_time_seconds,
        end_time_seconds: request.end_time_seconds,
        color: request.color,
        region_type: request.region_type,
        notes: request.notes,
        loop_count: request.loop_count,
        is_favorite: request.is_favorite,
    };

    let region = TrackRegionRepo::update(&state.db, id, auth.user_id, input)
        .await?
        .ok_or_else(|| AppError::NotFound("Region not found".to_string()))?;

    Ok(Json(region))
}

/// Delete a region
async fn delete_region(
    State(state): State<Arc<AppState>>,
    Extension(auth): Extension<AuthContext>,
    Path(id): Path<Uuid>,
) -> AppResult<Json<serde_json::Value>> {
    let deleted = TrackRegionRepo::delete(&state.db, id, auth.user_id).await?;

    if !deleted {
        return Err(AppError::NotFound("Region not found".to_string()));
    }

    Ok(Json(serde_json::json!({ "success": true })))
}

// =============================================================================
// Helpers
// =============================================================================

fn get_extension_from_mime(mime: &str) -> &'static str {
    match mime {
        "audio/mpeg" | "audio/mp3" => "mp3",
        "audio/wav" | "audio/wave" | "audio/x-wav" => "wav",
        "audio/ogg" => "ogg",
        "audio/flac" => "flac",
        "audio/aac" => "aac",
        "audio/m4a" | "audio/x-m4a" => "m4a",
        _ => "bin",
    }
}
