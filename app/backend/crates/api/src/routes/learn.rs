//! Learn routes
//!
//! Routes for learning system (topics, lessons, drills, progress).

use std::sync::Arc;

use crate::db::learn_models::{ActivityItem, ContinueItem, WeakArea};
use axum::{
    extract::{Extension, Path, Query, State},
    routing::{delete, get, post, put},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::db::learn_models::*;
use crate::db::learn_repos::LearnRepo;
use crate::db::models::User;
use crate::error::AppError;
use crate::state::AppState;

/// Create learn routes
pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/", get(get_overview))
        .route("/topics", get(list_topics))
        .route("/topics/{topic_id}/lessons", get(list_lessons))
        .route("/topics/{topic_id}/drills", get(list_drills))
        .route("/lessons/{id}", get(get_lesson))
        .route("/lessons/{id}/start", post(start_lesson))
        .route("/lessons/{id}/complete", post(complete_lesson))
        .route("/drills/{id}/submit", post(submit_drill))
        .route("/review/analytics", get(get_review_analytics))
        .route("/review", get(get_review_items).post(submit_review))
        .route("/progress", get(get_progress))
        .route("/glossary", get(list_glossary))
        .route("/recipes", get(list_recipes).post(create_recipe))
        .route("/recipes/{id}", delete(delete_recipe))
        .route("/journal", get(list_journal).post(create_journal))
        .route("/journal/{id}", put(update_journal).delete(delete_journal))
}

// ============================================================================
// RESPONSE WRAPPERS
// ============================================================================

#[derive(Serialize)]
struct TopicsWrapper {
    topics: Vec<TopicResponse>,
}

#[derive(Serialize)]
struct LessonsWrapper {
    lessons: Vec<LessonResponse>,
}

#[derive(Serialize)]
struct LessonContentWrapper {
    lesson: LessonContentResponse,
}

#[derive(Serialize)]
struct LessonProgressWrapper {
    progress: LessonProgressInfo,
}

#[derive(Serialize)]
struct CompleteLessonWrapper {
    result: CompleteLessonResult,
}

#[derive(Serialize)]
struct DrillsWrapper {
    drills: Vec<DrillResponse>,
}

#[derive(Serialize)]
struct DrillResultWrapper {
    result: DrillResultResponse,
}

#[derive(Serialize)]
struct ReviewWrapper {
    review: ReviewItemsResponse,
}

#[derive(Serialize)]
struct ReviewSubmitWrapper {
    result: ReviewSubmitResult,
}

#[derive(Serialize)]
struct ReviewAnalyticsWrapper {
    analytics: ReviewAnalyticsResponse,
}

#[derive(Serialize)]
struct ProgressWrapper {
    progress: LearnProgressSummary,
}

#[derive(Serialize)]
struct LearnOverview {
    progress: LearnProgressSummary,
    review_count: i64,
    topics: Vec<TopicResponse>,
    continue_item: Option<ContinueItem>,
    weak_areas: Vec<WeakArea>,
    recent_activity: Vec<ActivityItem>,
}

#[derive(Serialize)]
struct OverviewWrapper {
    items: LearnOverview,
}

#[derive(Serialize)]
struct GlossaryWrapper {
    entries: Vec<GlossaryEntryResponse>,
}

#[derive(Serialize)]
struct RecipesWrapper {
    recipes: Vec<RecipeTemplateResponse>,
}

#[derive(Serialize)]
struct RecipeWrapper {
    recipe: RecipeTemplateResponse,
}

#[derive(Serialize)]
struct DeleteWrapper {
    success: bool,
}

#[derive(Serialize)]
struct JournalWrapper {
    entries: Vec<JournalEntryResponse>,
}

#[derive(Serialize)]
struct JournalEntryWrapper {
    entry: JournalEntryResponse,
}

#[derive(Debug, Deserialize)]
struct ReviewSubmitBody {
    card_id: Uuid,
    grade: i32,
}

#[derive(Debug, Deserialize)]
struct GlossaryQuery {
    query: Option<String>,
    category: Option<String>,
}

// ============================================================================
// HANDLERS
// ============================================================================

/// GET /learn
/// Get learning overview
async fn get_overview(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<User>,
) -> Result<Json<OverviewWrapper>, AppError> {
    let progress = LearnRepo::get_progress_summary(&state.db, user.id).await?;
    let topics = LearnRepo::list_topics(&state.db, user.id).await?;
    let review = LearnRepo::get_review_items(&state.db, user.id).await?;
    let continue_item = LearnRepo::get_continue_item(&state.db, user.id).await?;
    let weak_areas = LearnRepo::get_weak_areas(&state.db, user.id).await?;
    let recent_activity = LearnRepo::get_recent_activity(&state.db, user.id).await?;

    Ok(Json(OverviewWrapper {
        items: LearnOverview {
            progress,
            review_count: review.total_due,
            topics: topics.topics,
            continue_item,
            weak_areas,
            recent_activity,
        },
    }))
}

/// GET /learn/topics
/// List all topics with progress
async fn list_topics(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<User>,
) -> Result<Json<TopicsWrapper>, AppError> {
    let result = LearnRepo::list_topics(&state.db, user.id).await?;
    Ok(Json(TopicsWrapper {
        topics: result.topics,
    }))
}

/// GET /learn/topics/:topic_id/lessons
/// List lessons for a topic
async fn list_lessons(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<User>,
    Path(topic_id): Path<Uuid>,
) -> Result<Json<LessonsWrapper>, AppError> {
    let result = LearnRepo::list_lessons(&state.db, user.id, topic_id).await?;
    Ok(Json(LessonsWrapper {
        lessons: result.lessons,
    }))
}

/// GET /learn/topics/:topic_id/drills
/// List drills for a topic
async fn list_drills(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<User>,
    Path(topic_id): Path<Uuid>,
) -> Result<Json<DrillsWrapper>, AppError> {
    let result = LearnRepo::list_drills(&state.db, user.id, topic_id).await?;
    Ok(Json(DrillsWrapper {
        drills: result.drills,
    }))
}

/// GET /learn/lessons/:id
/// Get lesson content
async fn get_lesson(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<User>,
    Path(id): Path<Uuid>,
) -> Result<Json<LessonContentWrapper>, AppError> {
    let lesson = LearnRepo::get_lesson_content(&state.db, user.id, id).await?;
    let lesson = lesson.ok_or_else(|| AppError::NotFound("Lesson not found".to_string()))?;
    Ok(Json(LessonContentWrapper { lesson }))
}

/// POST /learn/lessons/:id/start
/// Start a lesson
async fn start_lesson(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<User>,
    Path(lesson_id): Path<Uuid>,
) -> Result<Json<LessonProgressWrapper>, AppError> {
    let progress = LearnRepo::start_lesson(&state.db, user.id, lesson_id).await?;
    Ok(Json(LessonProgressWrapper { progress }))
}

/// POST /learn/lessons/:id/complete
/// Complete a lesson
async fn complete_lesson(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<User>,
    Path(lesson_id): Path<Uuid>,
    Json(body): Json<CompleteRequest>,
) -> Result<Json<CompleteLessonWrapper>, AppError> {
    let req = CompleteLessonRequest {
        lesson_id,
        quiz_score: body.quiz_score,
    };
    let result = LearnRepo::complete_lesson(&state.db, user.id, &req).await?;
    Ok(Json(CompleteLessonWrapper { result }))
}

#[derive(Deserialize)]
struct CompleteRequest {
    quiz_score: Option<i32>,
}

/// POST /learn/drills/:id/submit
/// Submit drill result
async fn submit_drill(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<User>,
    Path(drill_id): Path<Uuid>,
    Json(body): Json<SubmitRequest>,
) -> Result<Json<DrillResultWrapper>, AppError> {
    let req = SubmitDrillRequest {
        drill_id,
        score: body.score,
        correct_count: body.correct_count,
        total_count: body.total_count,
        time_seconds: body.time_seconds,
    };
    let result = LearnRepo::submit_drill(&state.db, user.id, &req).await?;
    Ok(Json(DrillResultWrapper { result }))
}

#[derive(Deserialize)]
struct SubmitRequest {
    score: i32,
    correct_count: i32,
    total_count: i32,
    time_seconds: i32,
}

/// GET /learn/review
/// Get items due for review
async fn get_review_items(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<User>,
) -> Result<Json<ReviewWrapper>, AppError> {
    let result = LearnRepo::get_review_items(&state.db, user.id).await?;
    Ok(Json(ReviewWrapper { review: result }))
}

/// POST /learn/review
/// Submit a review grade for a card
async fn submit_review(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<User>,
    Json(body): Json<ReviewSubmitBody>,
) -> Result<Json<ReviewSubmitWrapper>, AppError> {
    let result = LearnRepo::submit_review(&state.db, user.id, body.card_id, body.grade).await?;
    Ok(Json(ReviewSubmitWrapper { result }))
}

/// GET /learn/review/analytics
/// Get review analytics summary
async fn get_review_analytics(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<User>,
) -> Result<Json<ReviewAnalyticsWrapper>, AppError> {
    let analytics = LearnRepo::get_review_analytics(&state.db, user.id).await?;
    Ok(Json(ReviewAnalyticsWrapper { analytics }))
}

/// GET /learn/progress
/// Get learning progress summary
async fn get_progress(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<User>,
) -> Result<Json<ProgressWrapper>, AppError> {
    let progress = LearnRepo::get_progress_summary(&state.db, user.id).await?;
    Ok(Json(ProgressWrapper { progress }))
}

/// GET /learn/glossary
/// List glossary entries
async fn list_glossary(
    State(state): State<Arc<AppState>>,
    Query(query): Query<GlossaryQuery>,
) -> Result<Json<GlossaryWrapper>, AppError> {
    let entries =
        LearnRepo::list_glossary(&state.db, query.query.as_deref(), query.category.as_deref())
            .await?;
    Ok(Json(GlossaryWrapper { entries }))
}

/// GET /learn/recipes
/// List saved recipes for user
async fn list_recipes(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<User>,
) -> Result<Json<RecipesWrapper>, AppError> {
    let recipes = LearnRepo::list_recipes(&state.db, user.id).await?;
    Ok(Json(RecipesWrapper { recipes }))
}

/// POST /learn/recipes
/// Save a recipe
async fn create_recipe(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<User>,
    Json(req): Json<CreateRecipeTemplateRequest>,
) -> Result<Json<RecipeWrapper>, AppError> {
    let recipe = LearnRepo::create_recipe(&state.db, user.id, &req).await?;
    Ok(Json(RecipeWrapper { recipe }))
}

/// DELETE /learn/recipes/:id
/// Delete a saved recipe
async fn delete_recipe(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<User>,
    Path(id): Path<Uuid>,
) -> Result<Json<DeleteWrapper>, AppError> {
    let success = LearnRepo::delete_recipe(&state.db, user.id, id).await?;
    Ok(Json(DeleteWrapper { success }))
}

/// GET /learn/journal
/// List journal entries for user
async fn list_journal(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<User>,
) -> Result<Json<JournalWrapper>, AppError> {
    let entries = LearnRepo::list_journal_entries(&state.db, user.id).await?;
    Ok(Json(JournalWrapper { entries }))
}

/// POST /learn/journal
/// Create a journal entry
async fn create_journal(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<User>,
    Json(req): Json<CreateJournalEntryRequest>,
) -> Result<Json<JournalEntryWrapper>, AppError> {
    let entry = LearnRepo::create_journal_entry(&state.db, user.id, &req).await?;
    Ok(Json(JournalEntryWrapper { entry }))
}

/// PUT /learn/journal/:id
/// Update a journal entry
async fn update_journal(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<User>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateJournalEntryRequest>,
) -> Result<Json<JournalEntryWrapper>, AppError> {
    let entry = LearnRepo::update_journal_entry(&state.db, user.id, id, &req).await?;
    Ok(Json(JournalEntryWrapper { entry }))
}

/// DELETE /learn/journal/:id
/// Delete a journal entry
async fn delete_journal(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<User>,
    Path(id): Path<Uuid>,
) -> Result<Json<DeleteWrapper>, AppError> {
    let success = LearnRepo::delete_journal_entry(&state.db, user.id, id).await?;
    Ok(Json(DeleteWrapper { success }))
}
