use axum::{
    extract::{Query, State},
    routing::get,
    Json, Router,
};
use std::sync::Arc;

use crate::{
    db::models::User, db::search_models::*, db::search_repos::SearchIndexRepository,
    error::AppError, state::AppState,
};
use axum::extract::Extension;

// =============================================================================
// Search Index Routes
// =============================================================================

/// Create the search routes
pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/", get(search_ideas_and_infobase))
        .route("/status", get(get_search_status))
}

// =============================================================================
// Route Handlers
// =============================================================================

/// GET /api/search - Search ideas and infobase
///
/// Query Parameters:
/// - q: search query (required)
/// - type: content type filter ('idea', 'infobase', or omit for both)
/// - limit: max results (default: 50, max: 200)
/// - offset: pagination offset (default: 0)
///
/// Response: SearchResponse with results
async fn search_ideas_and_infobase(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<User>,
    Query(params): Query<SearchQuery>,
) -> Result<Json<SearchResponse>, AppError> {
    if params.q.is_empty() {
        return Ok(Json(SearchResponse {
            success: false,
            results: vec![],
            total_count: 0,
            query_time_ms: 0,
            client_indexed: false,
        }));
    }

    // Get all indexable content for tokenization
    let content = SearchIndexRepository::get_all_indexable_content(&state.db, user.id)
        .await
        .map_err(|e| AppError::Database(format!("Failed to fetch content: {}", e)))?;

    let start_time = std::time::Instant::now();

    // Search through content with scoring
    let mut results: Vec<(SearchResult, f32)> = content
        .iter()
        .filter(|c| c.status == ContentStatus::Active)
        .filter_map(|content| {
            // Filter by content type if specified
            if let Some(content_type) = params.content_type {
                if content.content_type != content_type {
                    return None;
                }
            }

            // For now, return mock results since actual decryption happens client-side
            // The server returns encrypted content; client decrypts and searches locally
            let score = calculate_relevance(&params.q, content);

            if score > 0.0 {
                Some((
                    SearchResult {
                        id: content.id.clone(),
                        content_type: content.content_type,
                        title: get_title_for_content(&content),
                        preview: truncate_preview(&content.encrypted_text, 150),
                        highlights: vec![],
                        relevance_score: score,
                        created_at: content.created_at,
                        updated_at: content.updated_at,
                        tags: content.tags.clone(),
                    },
                    score,
                ))
            } else {
                None
            }
        })
        .collect();

    // Sort by relevance score (descending)
    results.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));

    // Apply pagination
    let offset = params.offset() as usize;
    let limit = params.limit() as usize;
    let total_count = results.len() as u32;

    let paginated_results: Vec<SearchResult> = results
        .into_iter()
        .skip(offset)
        .take(limit)
        .map(|(result, _)| result)
        .collect();

    let query_time_ms = start_time.elapsed().as_millis() as u32;

    Ok(Json(SearchResponse {
        success: true,
        results: paginated_results,
        total_count,
        query_time_ms,
        client_indexed: false, // Server-side search fallback
    }))
}

/// GET /api/search/status - Get search index status
async fn get_search_status(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<User>,
) -> Result<Json<SearchStatusResponse>, AppError> {
    let content_count = SearchIndexRepository::get_content_count(&state.db, user.id)
        .await
        .map_err(|e| AppError::Database(format!("Failed to get content count: {}", e)))?;

    let metadata = SearchIndexRepository::get_index_metadata(&state.db, user.id)
        .await
        .map_err(|e| AppError::Database(format!("Failed to get index metadata: {}", e)))?;

    let (items_indexed, last_indexed_at) = metadata
        .map(|m| (m.items_indexed, m.last_indexed_at))
        .unwrap_or((0, None));

    Ok(Json(SearchStatusResponse {
        indexed: items_indexed > 0,
        items_indexed,
        last_indexed_at,
        vault_locked: false, // Client-side state, server doesn't track
    }))
}

// =============================================================================
// Helper Functions
// =============================================================================

/// Calculate relevance score for content vs query
fn calculate_relevance(query: &str, content: &SearchableContent) -> f32 {
    let query_lower = query.to_lowercase();
    let query_parts: Vec<&str> = query_lower.split_whitespace().collect();

    let mut score = 0.0;

    // Check if content ID contains query (simple heuristic)
    if content.id.to_lowercase().contains(&query_lower) {
        score += 5.0;
    }

    // Check tags
    for tag in &content.tags {
        if tag.to_lowercase().contains(&query_lower) {
            score += 3.0;
        }
    }

    // Single-word queries are more specific
    if query_parts.len() == 1 {
        score += 1.0;
    }

    score
}

/// Get display title for content
fn get_title_for_content(content: &SearchableContent) -> String {
    match content.content_type {
        ContentType::Idea => {
            format!("Idea ({})", chrono::Local::now().format("%b %d"))
        }
        ContentType::Infobase => {
            // Extract first tag if available
            if let Some(tag) = content.tags.first() {
                format!("Note in {}", tag)
            } else {
                "Knowledge Base Entry".to_string()
            }
        }
    }
}

/// Truncate text to specified length
fn truncate_preview(text: &str, max_len: usize) -> String {
    if text.len() > max_len {
        format!("{}...", &text[..max_len])
    } else {
        text.to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_truncate_preview() {
        let text = "This is a long piece of text";
        let truncated = truncate_preview(text, 10);
        assert_eq!(truncated, "This is a ...");
    }

    #[test]
    fn test_search_query_defaults() {
        let query = SearchQuery {
            q: "test".to_string(),
            content_type: None,
            limit: None,
            offset: None,
        };

        assert_eq!(query.limit(), 50);
        assert_eq!(query.offset(), 0);
    }
}
