//! Learn models
//!
//! Models for learning system (topics, lessons, drills, progress).

use crate::named_enum;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

// ============================================================================
// ENUMS
// ============================================================================

named_enum!(LessonStatus {
    NotStarted => "not_started",
    InProgress => "in_progress",
    Completed => "completed"
});

named_enum!(Difficulty {
    Beginner => "beginner",
    Intermediate => "intermediate",
    Advanced => "advanced"
});

// ============================================================================
// DATABASE MODELS
// ============================================================================

/// Learning topic
#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct LearnTopic {
    pub id: Uuid,
    pub key: String,
    pub name: String,
    pub description: Option<String>,
    pub category: String,
    pub icon: Option<String>,
    pub sort_order: i32,
    pub created_at: DateTime<Utc>,
}

/// Learning lesson
#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct LearnLesson {
    pub id: Uuid,
    pub topic_id: Uuid,
    pub key: String,
    pub title: String,
    pub description: Option<String>,
    pub content_markdown: Option<String>,
    pub duration_minutes: i32,
    pub difficulty: String,
    pub quiz_json: Option<serde_json::Value>,
    pub xp_reward: i32,
    pub coin_reward: i32,
    pub skill_key: Option<String>,
    pub skill_star_reward: Option<i32>,
    pub audio_r2_key: Option<String>,
    pub sort_order: i32,
    pub created_at: DateTime<Utc>,
}

/// Learning drill
#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct LearnDrill {
    pub id: Uuid,
    pub topic_id: Uuid,
    pub key: String,
    pub title: String,
    pub description: Option<String>,
    pub drill_type: String,
    pub config_json: serde_json::Value,
    pub difficulty: String,
    pub duration_seconds: i32,
    pub xp_reward: i32,
    pub sort_order: i32,
    pub created_at: DateTime<Utc>,
}

/// User lesson progress
#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct UserLessonProgress {
    pub id: Uuid,
    pub user_id: Uuid,
    pub lesson_id: Uuid,
    pub status: String,
    pub started_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
    pub quiz_score: Option<i32>,
    pub attempts: i32,
}

/// User drill stats
#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct UserDrillStats {
    pub id: Uuid,
    pub user_id: Uuid,
    pub drill_id: Uuid,
    pub total_attempts: i32,
    pub correct_answers: i32,
    pub best_score: Option<i32>,
    pub average_score: Option<f64>,
    pub current_streak: i32,
    pub best_streak: i32,
    pub last_attempt_at: Option<DateTime<Utc>>,
    pub total_time_seconds: i32,
}

/// Learning flashcard (global)
#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct LearnFlashcard {
    pub id: Uuid,
    pub topic_id: Option<Uuid>,
    pub lesson_id: Option<Uuid>,
    pub front: String,
    pub back: String,
    pub card_type: String,
    pub concept_id: Option<String>,
    pub tags: Option<Vec<String>>,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// User flashcard progress (spaced repetition)
#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct UserFlashcardProgress {
    pub id: Uuid,
    pub user_id: Uuid,
    pub flashcard_id: Uuid,
    pub due_at: DateTime<Utc>,
    pub interval_days: f64,
    pub ease_factor: f64,
    pub lapses: i32,
    pub last_reviewed_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// User flashcard review history
#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct UserFlashcardReview {
    pub id: Uuid,
    pub user_id: Uuid,
    pub flashcard_id: Uuid,
    pub grade: i32,
    pub interval_days: f64,
    pub ease_factor: f64,
    pub lapses: i32,
    pub reviewed_at: DateTime<Utc>,
}

/// Glossary entry (global)
#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct GlossaryEntry {
    pub id: Uuid,
    pub term: String,
    pub definition: String,
    pub category: String,
    pub aliases: Option<Vec<String>>,
    pub related_concepts: Option<Vec<String>>,
    pub is_active: bool,
    pub sort_order: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Recipe template (user)
#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct RecipeTemplate {
    pub id: Uuid,
    pub user_id: Uuid,
    pub title: String,
    pub synth: String,
    pub target_type: String,
    pub descriptors: Option<Vec<String>>,
    pub mono: bool,
    pub cpu_budget: String,
    pub macro_count: i32,
    pub recipe_json: serde_json::Value,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

// ============================================================================
// Aggregates for overview
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContinueItem {
    pub topic_id: Uuid,
    pub topic_name: String,
    pub lesson_id: Uuid,
    pub lesson_title: String,
    pub status: String,
    pub progress_pct: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WeakArea {
    pub concept_id: Option<String>,
    pub term: String,
    pub suggested_lesson_id: Option<Uuid>,
    pub suggested_lesson_title: Option<String>,
    pub lapses: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActivityItem {
    pub item_type: String,
    pub title: String,
    pub completed_at: DateTime<Utc>,
}

/// Journal entry (user)
#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct JournalEntry {
    pub id: Uuid,
    pub user_id: Uuid,
    pub synth: String,
    pub patch_name: String,
    pub tags: Option<Vec<String>>,
    pub notes: Option<String>,
    pub what_learned: Option<String>,
    pub what_broke: Option<String>,
    pub preset_reference: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

// ============================================================================
// REQUEST MODELS
// ============================================================================

/// Start lesson request
#[derive(Debug, Deserialize)]
pub struct StartLessonRequest {
    pub lesson_id: Uuid,
}

/// Complete lesson request
#[derive(Debug, Deserialize)]
pub struct CompleteLessonRequest {
    pub lesson_id: Uuid,
    pub quiz_score: Option<i32>,
}

/// Submit drill result request
#[derive(Debug, Deserialize)]
pub struct SubmitDrillRequest {
    pub drill_id: Uuid,
    pub score: i32,
    pub correct_count: i32,
    pub total_count: i32,
    pub time_seconds: i32,
}

/// Review submission request
#[derive(Debug, Deserialize)]
pub struct SubmitReviewRequest {
    pub card_id: Uuid,
    pub grade: i32,
}

/// Create recipe template request
#[derive(Debug, Deserialize)]
pub struct CreateRecipeTemplateRequest {
    pub title: String,
    pub synth: String,
    pub target_type: String,
    pub descriptors: Option<Vec<String>>,
    pub mono: bool,
    pub cpu_budget: String,
    pub macro_count: i32,
    pub recipe_json: serde_json::Value,
}

/// Create journal entry request
#[derive(Debug, Deserialize)]
pub struct CreateJournalEntryRequest {
    pub synth: String,
    pub patch_name: String,
    pub tags: Option<Vec<String>>,
    pub notes: Option<String>,
    pub what_learned: Option<String>,
    pub what_broke: Option<String>,
    pub preset_reference: Option<String>,
}

/// Update journal entry request
#[derive(Debug, Deserialize)]
pub struct UpdateJournalEntryRequest {
    pub synth: Option<String>,
    pub patch_name: Option<String>,
    pub tags: Option<Vec<String>>,
    pub notes: Option<String>,
    pub what_learned: Option<String>,
    pub what_broke: Option<String>,
    pub preset_reference: Option<String>,
}

// ============================================================================
// RESPONSE MODELS
// ============================================================================

/// Topic response with progress
#[derive(Serialize)]
pub struct TopicResponse {
    pub id: Uuid,
    pub key: String,
    pub name: String,
    pub description: Option<String>,
    pub category: String,
    pub icon: Option<String>,
    pub lesson_count: i64,
    pub completed_count: i64,
}

/// Topics list response
#[derive(Serialize)]
pub struct TopicsListResponse {
    pub topics: Vec<TopicResponse>,
    pub total: i64,
}

/// Lesson response with progress
#[derive(Serialize)]
pub struct LessonResponse {
    pub id: Uuid,
    pub topic_id: Uuid,
    pub key: String,
    pub title: String,
    pub description: Option<String>,
    pub duration_minutes: i32,
    pub difficulty: String,
    pub xp_reward: i32,
    pub coin_reward: i32,
    pub status: String,
    pub has_quiz: bool,
    pub has_audio: bool,
}

/// Lessons list response
#[derive(Serialize)]
pub struct LessonsListResponse {
    pub lessons: Vec<LessonResponse>,
    pub total: i64,
}

/// Lesson content response
#[derive(Serialize)]
pub struct LessonContentResponse {
    pub id: Uuid,
    pub title: String,
    pub content_markdown: Option<String>,
    pub quiz_json: Option<serde_json::Value>,
    pub audio_url: Option<String>,
    pub progress: LessonProgressInfo,
}

/// Lesson progress info
#[derive(Serialize)]
pub struct LessonProgressInfo {
    pub status: String,
    pub started_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
    pub quiz_score: Option<i32>,
    pub attempts: i32,
}

/// Complete lesson result
#[derive(Serialize)]
pub struct CompleteLessonResult {
    pub lesson_id: Uuid,
    pub xp_awarded: i32,
    pub coins_awarded: i32,
    pub is_first_completion: bool,
    pub quiz_score: Option<i32>,
}

/// Drill response
#[derive(Serialize)]
pub struct DrillResponse {
    pub id: Uuid,
    pub topic_id: Uuid,
    pub key: String,
    pub title: String,
    pub description: Option<String>,
    pub drill_type: String,
    pub difficulty: String,
    pub duration_seconds: i32,
    pub xp_reward: i32,
    pub best_score: Option<i32>,
    pub current_streak: i32,
}

/// Drills list response
#[derive(Serialize)]
pub struct DrillsListResponse {
    pub drills: Vec<DrillResponse>,
    pub total: i64,
}

/// Drill result response
#[derive(Serialize)]
pub struct DrillResultResponse {
    pub drill_id: Uuid,
    pub score: i32,
    pub xp_awarded: i32,
    pub is_new_best: bool,
    pub streak_continued: bool,
    pub new_streak: i32,
}

/// Flashcard review item
#[derive(Debug, Clone, Serialize)]
pub struct ReviewCardResponse {
    pub id: Uuid,
    pub front: String,
    pub back: String,
    pub concept_id: Option<String>,
    pub card_type: String,
    pub due_at: DateTime<Utc>,
    pub interval_days: f64,
    pub ease_factor: f64,
    pub lapses: i32,
}

/// Review items response
#[derive(Serialize)]
pub struct ReviewItemsResponse {
    pub cards: Vec<ReviewCardResponse>,
    pub total_due: i64,
}

/// Review submission response
#[derive(Serialize)]
pub struct ReviewSubmitResult {
    pub card: ReviewCardResponse,
}

/// Review analytics grade counts
#[derive(Serialize)]
pub struct ReviewGradeCounts {
    pub again: i64,
    pub hard: i64,
    pub good: i64,
    pub easy: i64,
}

/// Review analytics summary
#[derive(Serialize)]
pub struct ReviewAnalyticsResponse {
    pub total_reviews: i64,
    pub reviews_last_7_days: i64,
    pub reviews_last_30_days: i64,
    pub retention_rate: f64,
    pub avg_ease_factor: f64,
    pub avg_interval_days: f64,
    pub total_lapses: i64,
    pub last_reviewed_at: Option<DateTime<Utc>>,
    pub grades: ReviewGradeCounts,
}

/// Learning progress summary
#[derive(Serialize)]
pub struct LearnProgressSummary {
    pub topics_started: i64,
    pub lessons_completed: i64,
    pub total_lessons: i64,
    pub drills_practiced: i64,
    pub total_xp_earned: i64,
    pub current_streak_days: i32,
}

/// Glossary entry response
#[derive(Serialize)]
pub struct GlossaryEntryResponse {
    pub id: Uuid,
    pub term: String,
    pub definition: String,
    pub category: String,
    pub aliases: Option<Vec<String>>,
    pub related_concepts: Option<Vec<String>>,
}

/// Recipe template response
#[derive(Serialize)]
pub struct RecipeTemplateResponse {
    pub id: Uuid,
    pub title: String,
    pub synth: String,
    pub target_type: String,
    pub descriptors: Option<Vec<String>>,
    pub mono: bool,
    pub cpu_budget: String,
    pub macro_count: i32,
    pub recipe_json: serde_json::Value,
    pub created_at: DateTime<Utc>,
}

/// Journal entry response
#[derive(Serialize)]
pub struct JournalEntryResponse {
    pub id: Uuid,
    pub synth: String,
    pub patch_name: String,
    pub tags: Option<Vec<String>>,
    pub notes: Option<String>,
    pub what_learned: Option<String>,
    pub what_broke: Option<String>,
    pub preset_reference: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
