//! Learn repository
//!
//! Database operations for learning system.

use chrono::{DateTime, Utc};
use sqlx::{FromRow, PgPool};
use uuid::Uuid;

use crate::error::AppError;

use super::learn_models::*;

// ============================================================================
// TOPIC REPOSITORY
// ============================================================================

pub struct LearnRepo;

impl LearnRepo {
    /// List all topics with user progress
    pub async fn list_topics(pool: &PgPool, user_id: Uuid) -> Result<TopicsListResponse, AppError> {
        #[derive(FromRow)]
        struct TopicRow {
            id: Uuid,
            key: String,
            name: String,
            description: Option<String>,
            category: Option<String>,
            icon: Option<String>,
            lesson_count: Option<i64>,
            completed_count: Option<i64>,
        }

        let topics = sqlx::query_as::<_, TopicRow>(
            r#"
            SELECT t.id, t.key, t.name, t.description, t.category, t.icon,
                   COUNT(DISTINCT l.id) as lesson_count,
                   COUNT(DISTINCT CASE WHEN p.status = 'completed' THEN l.id END) as completed_count
            FROM learn_topics t
            LEFT JOIN learn_lessons l ON l.topic_id = t.id
            LEFT JOIN user_lesson_progress p ON p.lesson_id = l.id AND p.user_id = $1
            GROUP BY t.id, t.key, t.name, t.description, t.category, t.icon
            ORDER BY t.sort_order
            "#,
        )
        .bind(user_id)
        .fetch_all(pool)
        .await?;

        let total = topics.len() as i64;

        Ok(TopicsListResponse {
            topics: topics
                .into_iter()
                .map(|t| TopicResponse {
                    id: t.id,
                    key: t.key,
                    name: t.name,
                    description: t.description,
                    category: t.category.unwrap_or_default(),
                    icon: t.icon,
                    lesson_count: t.lesson_count.unwrap_or(0),
                    completed_count: t.completed_count.unwrap_or(0),
                })
                .collect(),
            total,
        })
    }

    /// List lessons for a topic with user progress
    pub async fn list_lessons(
        pool: &PgPool,
        user_id: Uuid,
        topic_id: Uuid,
    ) -> Result<LessonsListResponse, AppError> {
        #[derive(FromRow)]
        struct LessonRow {
            id: Uuid,
            topic_id: Uuid,
            key: String,
            title: String,
            description: Option<String>,
            duration_minutes: Option<i32>,
            difficulty: Option<String>,
            xp_reward: i32,
            coin_reward: i32,
            has_quiz: Option<bool>,
            has_audio: Option<bool>,
            status: Option<String>,
        }

        let lessons = sqlx::query_as::<_, LessonRow>(
            r#"
            SELECT l.id, l.topic_id, l.key, l.title, l.description,
                   l.duration_minutes, l.difficulty, l.xp_reward, l.coin_reward,
                   l.quiz_json IS NOT NULL as has_quiz,
                   l.audio_r2_key IS NOT NULL as has_audio,
                   COALESCE(p.status, 'not_started') as status
            FROM learn_lessons l
            LEFT JOIN user_lesson_progress p ON p.lesson_id = l.id AND p.user_id = $1
            WHERE l.topic_id = $2
            ORDER BY l.sort_order
            "#,
        )
        .bind(user_id)
        .bind(topic_id)
        .fetch_all(pool)
        .await?;

        let total = lessons.len() as i64;

        Ok(LessonsListResponse {
            lessons: lessons
                .into_iter()
                .map(|l| LessonResponse {
                    id: l.id,
                    topic_id: l.topic_id,
                    key: l.key,
                    title: l.title,
                    description: l.description,
                    duration_minutes: l.duration_minutes.unwrap_or(0),
                    difficulty: l.difficulty.unwrap_or_default(),
                    xp_reward: l.xp_reward,
                    coin_reward: l.coin_reward,
                    status: l.status.unwrap_or_else(|| "not_started".to_string()),
                    has_quiz: l.has_quiz.unwrap_or(false),
                    has_audio: l.has_audio.unwrap_or(false),
                })
                .collect(),
            total,
        })
    }

    /// Get lesson content
    pub async fn get_lesson_content(
        pool: &PgPool,
        user_id: Uuid,
        lesson_id: Uuid,
    ) -> Result<Option<LessonContentResponse>, AppError> {
        #[derive(FromRow)]
        struct LessonContentRow {
            id: Uuid,
            title: String,
            content_markdown: Option<String>,
            quiz_json: Option<serde_json::Value>,
            audio_r2_key: Option<String>,
            status: Option<String>,
            started_at: Option<chrono::DateTime<chrono::Utc>>,
            completed_at: Option<chrono::DateTime<chrono::Utc>>,
            quiz_score: Option<i32>,
            attempts: Option<i32>,
        }

        let lesson = sqlx::query_as::<_, LessonContentRow>(
            r#"
            SELECT l.id, l.title, l.content_markdown, l.quiz_json, l.audio_r2_key,
                   p.status, p.started_at, p.completed_at, p.quiz_score, p.attempts
            FROM learn_lessons l
            LEFT JOIN user_lesson_progress p ON p.lesson_id = l.id AND p.user_id = $1
            WHERE l.id = $2
            "#,
        )
        .bind(user_id)
        .bind(lesson_id)
        .fetch_optional(pool)
        .await?;

        Ok(lesson.map(|l| LessonContentResponse {
            id: l.id,
            title: l.title,
            content_markdown: l.content_markdown,
            quiz_json: l.quiz_json,
            audio_url: l
                .audio_r2_key
                .map(|k| format!("/api/blobs/{}/download-url", k)),
            progress: LessonProgressInfo {
                status: l.status.unwrap_or_else(|| "not_started".to_string()),
                started_at: l.started_at,
                completed_at: l.completed_at,
                quiz_score: l.quiz_score,
                attempts: l.attempts.unwrap_or(0),
            },
        }))
    }

    /// Start a lesson
    pub async fn start_lesson(
        pool: &PgPool,
        user_id: Uuid,
        lesson_id: Uuid,
    ) -> Result<LessonProgressInfo, AppError> {
        // Check if lesson exists
        let exists: Option<Uuid> = sqlx::query_scalar("SELECT id FROM learn_lessons WHERE id = $1")
            .bind(lesson_id)
            .fetch_optional(pool)
            .await?;

        if exists.is_none() {
            return Err(AppError::NotFound("Lesson not found".to_string()));
        }

        // Upsert progress
        #[derive(FromRow)]
        struct ProgressRow {
            status: String,
            started_at: Option<chrono::DateTime<chrono::Utc>>,
            completed_at: Option<chrono::DateTime<chrono::Utc>>,
            quiz_score: Option<i32>,
            attempts: i32,
        }

        let progress = sqlx::query_as::<_, ProgressRow>(
            r#"
            INSERT INTO user_lesson_progress (user_id, lesson_id, status, started_at)
            VALUES ($1, $2, 'in_progress', NOW())
            ON CONFLICT (user_id, lesson_id)
            DO UPDATE SET status = 'in_progress', started_at = COALESCE(user_lesson_progress.started_at, NOW())
            RETURNING status, started_at, completed_at, quiz_score, attempts
            "#,
        )
        .bind(user_id)
        .bind(lesson_id)
        .fetch_one(pool)
        .await?;

        Ok(LessonProgressInfo {
            status: progress.status,
            started_at: progress.started_at,
            completed_at: progress.completed_at,
            quiz_score: progress.quiz_score,
            attempts: progress.attempts,
        })
    }

    /// Complete a lesson
    pub async fn complete_lesson(
        pool: &PgPool,
        user_id: Uuid,
        req: &CompleteLessonRequest,
    ) -> Result<CompleteLessonResult, AppError> {
        // Get lesson
        #[derive(FromRow)]
        struct LessonRewards {
            id: Uuid,
            xp_reward: i32,
            coin_reward: i32,
        }

        let lesson = sqlx::query_as::<_, LessonRewards>(
            "SELECT id, xp_reward, coin_reward FROM learn_lessons WHERE id = $1",
        )
        .bind(req.lesson_id)
        .fetch_optional(pool)
        .await?;

        let lesson = lesson.ok_or_else(|| AppError::NotFound("Lesson not found".to_string()))?;

        // Check if already completed
        #[derive(FromRow)]
        struct CompletedCheck {
            completed_at: Option<chrono::DateTime<chrono::Utc>>,
        }

        let existing = sqlx::query_as::<_, CompletedCheck>(
            "SELECT completed_at FROM user_lesson_progress WHERE user_id = $1 AND lesson_id = $2",
        )
        .bind(user_id)
        .bind(req.lesson_id)
        .fetch_optional(pool)
        .await?;

        let is_first_completion = existing.map_or(true, |e| e.completed_at.is_none());

        // Upsert progress
        sqlx::query(
            r#"
            INSERT INTO user_lesson_progress (user_id, lesson_id, status, started_at, completed_at, quiz_score, attempts)
            VALUES ($1, $2, 'completed', NOW(), NOW(), $3, 1)
            ON CONFLICT (user_id, lesson_id)
            DO UPDATE SET
                status = 'completed',
                completed_at = COALESCE(user_lesson_progress.completed_at, NOW()),
                quiz_score = COALESCE($3, user_lesson_progress.quiz_score),
                attempts = user_lesson_progress.attempts + 1
            "#,
        )
        .bind(user_id)
        .bind(req.lesson_id)
        .bind(req.quiz_score)
        .execute(pool)
        .await?;

        // Award XP/coins only on first completion
        let (xp_awarded, coins_awarded) = if is_first_completion {
            (lesson.xp_reward, lesson.coin_reward)
        } else {
            (0, 0)
        };

        Ok(CompleteLessonResult {
            lesson_id: req.lesson_id,
            xp_awarded,
            coins_awarded,
            is_first_completion,
            quiz_score: req.quiz_score,
        })
    }

    /// List drills for a topic with user stats
    pub async fn list_drills(
        pool: &PgPool,
        user_id: Uuid,
        topic_id: Uuid,
    ) -> Result<DrillsListResponse, AppError> {
        #[derive(FromRow)]
        struct DrillRow {
            id: Uuid,
            topic_id: Uuid,
            key: String,
            title: String,
            description: Option<String>,
            drill_type: String,
            difficulty: Option<String>,
            duration_seconds: Option<i32>,
            xp_reward: i32,
            best_score: Option<i32>,
            current_streak: Option<i32>,
        }

        let drills = sqlx::query_as::<_, DrillRow>(
            r#"
            SELECT d.id, d.topic_id, d.key, d.title, d.description,
                   d.drill_type, d.difficulty, d.duration_seconds, d.xp_reward,
                   s.best_score, s.current_streak
            FROM learn_drills d
            LEFT JOIN user_drill_stats s ON s.drill_id = d.id AND s.user_id = $1
            WHERE d.topic_id = $2
            ORDER BY d.sort_order
            "#,
        )
        .bind(user_id)
        .bind(topic_id)
        .fetch_all(pool)
        .await?;

        let total = drills.len() as i64;

        Ok(DrillsListResponse {
            drills: drills
                .into_iter()
                .map(|d| DrillResponse {
                    id: d.id,
                    topic_id: d.topic_id,
                    key: d.key,
                    title: d.title,
                    description: d.description,
                    drill_type: d.drill_type,
                    difficulty: d.difficulty.unwrap_or_default(),
                    duration_seconds: d.duration_seconds.unwrap_or(0),
                    xp_reward: d.xp_reward,
                    best_score: d.best_score,
                    current_streak: d.current_streak.unwrap_or(0),
                })
                .collect(),
            total,
        })
    }

    /// Submit drill result
    pub async fn submit_drill(
        pool: &PgPool,
        user_id: Uuid,
        req: &SubmitDrillRequest,
    ) -> Result<DrillResultResponse, AppError> {
        // Get drill
        #[derive(FromRow)]
        struct DrillInfo {
            id: Uuid,
            xp_reward: i32,
        }

        let drill =
            sqlx::query_as::<_, DrillInfo>("SELECT id, xp_reward FROM learn_drills WHERE id = $1")
                .bind(req.drill_id)
                .fetch_optional(pool)
                .await?;

        let drill = drill.ok_or_else(|| AppError::NotFound("Drill not found".to_string()))?;

        // Get existing stats
        #[derive(FromRow)]
        struct StatsRow {
            best_score: Option<i32>,
            current_streak: Option<i32>,
        }

        let existing = sqlx::query_as::<_, StatsRow>(
            "SELECT best_score, current_streak FROM user_drill_stats WHERE user_id = $1 AND drill_id = $2",
        )
        .bind(user_id)
        .bind(req.drill_id)
        .fetch_optional(pool)
        .await?;

        let is_new_best = existing
            .as_ref()
            .map_or(true, |e| e.best_score.map_or(true, |b| req.score > b));

        // Check if streak continues (practiced yesterday or today)
        let streak_continued = true; // Simplified - would check last_attempt_at

        let new_streak = if streak_continued {
            existing
                .as_ref()
                .map_or(1, |e| e.current_streak.unwrap_or(0) + 1)
        } else {
            1
        };

        // Upsert stats
        sqlx::query(
            r#"
            INSERT INTO user_drill_stats (user_id, drill_id, total_attempts, correct_answers, best_score,
                                          current_streak, last_attempt_at, total_time_seconds)
            VALUES ($1, $2, 1, $3, $4, $5, NOW(), $6)
            ON CONFLICT (user_id, drill_id)
            DO UPDATE SET
                total_attempts = user_drill_stats.total_attempts + 1,
                correct_answers = user_drill_stats.correct_answers + $3,
                best_score = GREATEST(user_drill_stats.best_score, $4),
                current_streak = $5,
                last_attempt_at = NOW(),
                total_time_seconds = user_drill_stats.total_time_seconds + $6
            "#,
        )
        .bind(user_id)
        .bind(req.drill_id)
        .bind(req.correct_count)
        .bind(req.score)
        .bind(new_streak)
        .bind(req.time_seconds)
        .execute(pool)
        .await?;

        // Award XP based on performance
        let xp_awarded = if req.score >= 80 {
            drill.xp_reward
        } else if req.score >= 60 {
            drill.xp_reward / 2
        } else {
            1
        };

        Ok(DrillResultResponse {
            drill_id: req.drill_id,
            score: req.score,
            xp_awarded,
            is_new_best,
            streak_continued,
            new_streak,
        })
    }

    /// Get items due for review (spaced repetition)
    pub async fn get_review_items(
        pool: &PgPool,
        user_id: Uuid,
    ) -> Result<ReviewItemsResponse, AppError> {
        let cards = Self::get_flashcards_due(pool, user_id).await?;
        let total_due = Self::count_flashcards_due(pool, user_id).await?;

        Ok(ReviewItemsResponse { cards, total_due })
    }

    /// Get learning progress summary
    pub async fn get_progress_summary(
        pool: &PgPool,
        user_id: Uuid,
    ) -> Result<LearnProgressSummary, AppError> {
        #[derive(FromRow)]
        struct StatsRow {
            topics_started: Option<i64>,
            lessons_completed: Option<i64>,
        }

        let stats = sqlx::query_as::<_, StatsRow>(
            r#"
            SELECT
                COUNT(DISTINCT l.topic_id) as topics_started,
                COUNT(*) FILTER (WHERE p.status = 'completed') as lessons_completed
            FROM user_lesson_progress p
            JOIN learn_lessons l ON p.lesson_id = l.id
            WHERE p.user_id = $1
            "#,
        )
        .bind(user_id)
        .fetch_one(pool)
        .await?;

        let total_lessons: Option<i64> = sqlx::query_scalar("SELECT COUNT(*) FROM learn_lessons")
            .fetch_one(pool)
            .await?;

        let drills_practiced: Option<i64> = sqlx::query_scalar(
            "SELECT COUNT(DISTINCT drill_id) FROM user_drill_stats WHERE user_id = $1",
        )
        .bind(user_id)
        .fetch_one(pool)
        .await?;

        Ok(LearnProgressSummary {
            topics_started: stats.topics_started.unwrap_or(0),
            lessons_completed: stats.lessons_completed.unwrap_or(0),
            total_lessons: total_lessons.unwrap_or(0),
            drills_practiced: drills_practiced.unwrap_or(0),
            total_xp_earned: 0,     // Would sum from lesson/drill completions
            current_streak_days: 0, // Would calculate from daily activity
        })
    }

    /// Determine the next lesson to continue (first non-completed, ordered by topic/lesson sort)
    pub async fn get_continue_item(
        pool: &PgPool,
        user_id: Uuid,
    ) -> Result<Option<ContinueItem>, AppError> {
        #[derive(FromRow)]
        struct Row {
            topic_id: Uuid,
            topic_name: String,
            lesson_id: Uuid,
            lesson_title: String,
            status: String,
            completed_count: Option<f64>,
            lesson_count: Option<f64>,
        }

        let row = sqlx::query_as::<_, Row>(
            r#"
            WITH topic_progress AS (
                SELECT l.topic_id,
                       COUNT(*)::float AS lesson_count,
                       COUNT(*) FILTER (WHERE COALESCE(p.status, 'not_started') = 'completed')::float AS completed_count
                FROM learn_lessons l
                LEFT JOIN user_lesson_progress p ON p.lesson_id = l.id AND p.user_id = $1
                GROUP BY l.topic_id
            )
            SELECT t.id AS topic_id,
                   t.name AS topic_name,
                   l.id AS lesson_id,
                   l.title AS lesson_title,
                   COALESCE(p.status, 'not_started') AS status,
                   tp.completed_count,
                   tp.lesson_count
            FROM learn_topics t
            JOIN learn_lessons l ON l.topic_id = t.id
            LEFT JOIN user_lesson_progress p ON p.lesson_id = l.id AND p.user_id = $1
            LEFT JOIN topic_progress tp ON tp.topic_id = t.id
            WHERE COALESCE(p.status, 'not_started') <> 'completed'
            ORDER BY t.sort_order, l.sort_order
            LIMIT 1
            "#,
        )
        .bind(user_id)
        .fetch_optional(pool)
        .await?;

        Ok(row.map(|r| ContinueItem {
            topic_id: r.topic_id,
            topic_name: r.topic_name,
            lesson_id: r.lesson_id,
            lesson_title: r.lesson_title,
            status: r.status,
            progress_pct: if let (Some(done), Some(total)) = (r.completed_count, r.lesson_count) {
                if total > 0.0 {
                    (done / total * 100.0).clamp(0.0, 100.0)
                } else {
                    0.0
                }
            } else {
                0.0
            },
        }))
    }

    /// Identify weak areas from flashcard lapses (highest lapses first)
    pub async fn get_weak_areas(pool: &PgPool, user_id: Uuid) -> Result<Vec<WeakArea>, AppError> {
        #[derive(FromRow)]
        struct Row {
            concept_id: Option<String>,
            term: String,
            lesson_id: Option<Uuid>,
            lesson_title: Option<String>,
            lapses: Option<i32>,
        }

        let rows = sqlx::query_as::<_, Row>(
            r#"
            SELECT f.concept_id,
                   f.front AS term,
                   f.lesson_id,
                   l.title AS lesson_title,
                   p.lapses
            FROM learn_flashcards f
            LEFT JOIN user_flashcard_progress p ON p.flashcard_id = f.id AND p.user_id = $1
            LEFT JOIN learn_lessons l ON l.id = f.lesson_id
            WHERE f.is_active = true
              AND COALESCE(p.lapses, 0) > 0
            ORDER BY p.lapses DESC, f.created_at ASC
            LIMIT 3
            "#,
        )
        .bind(user_id)
        .fetch_all(pool)
        .await?;

        Ok(rows
            .into_iter()
            .map(|r| WeakArea {
                concept_id: r.concept_id,
                term: r.term,
                suggested_lesson_id: r.lesson_id,
                suggested_lesson_title: r.lesson_title,
                lapses: r.lapses.unwrap_or(0),
            })
            .collect())
    }

    /// Recent learning activity (lessons started/completed)
    pub async fn get_recent_activity(
        pool: &PgPool,
        user_id: Uuid,
    ) -> Result<Vec<ActivityItem>, AppError> {
        #[derive(FromRow)]
        struct Row {
            title: String,
            completed_at: Option<chrono::DateTime<chrono::Utc>>,
            started_at: Option<chrono::DateTime<chrono::Utc>>,
            status: Option<String>,
        }

        let rows = sqlx::query_as::<_, Row>(
            r#"
            SELECT l.title,
                   p.completed_at,
                   p.started_at,
                   p.status
            FROM user_lesson_progress p
            JOIN learn_lessons l ON l.id = p.lesson_id
            WHERE p.user_id = $1
              AND (p.completed_at IS NOT NULL OR p.started_at IS NOT NULL)
            ORDER BY COALESCE(p.completed_at, p.started_at) DESC
            LIMIT 5
            "#,
        )
        .bind(user_id)
        .fetch_all(pool)
        .await?;

        Ok(rows
            .into_iter()
            .filter_map(|r| {
                let ts = r.completed_at.or(r.started_at)?;
                Some(ActivityItem {
                    item_type: r.status.unwrap_or_else(|| "started".to_string()),
                    title: r.title,
                    completed_at: ts,
                })
            })
            .collect())
    }

    // ============================================
    // Flashcard Review
    // ============================================

    async fn count_flashcards_due(pool: &PgPool, user_id: Uuid) -> Result<i64, AppError> {
        let count = sqlx::query_scalar::<_, i64>(
            r#"
            SELECT COUNT(*)
            FROM learn_flashcards f
            LEFT JOIN user_flashcard_progress p
              ON p.flashcard_id = f.id AND p.user_id = $1
            WHERE f.is_active = true
              AND (p.due_at IS NULL OR p.due_at <= NOW())
            "#,
        )
        .bind(user_id)
        .fetch_one(pool)
        .await?;

        Ok(count)
    }

    async fn get_flashcards_due(
        pool: &PgPool,
        user_id: Uuid,
    ) -> Result<Vec<ReviewCardResponse>, AppError> {
        #[derive(FromRow)]
        struct CardRow {
            id: Uuid,
            front: String,
            back: String,
            concept_id: Option<String>,
            card_type: String,
            due_at: DateTime<Utc>,
            interval_days: f64,
            ease_factor: f64,
            lapses: i32,
        }

        let cards = sqlx::query_as::<_, CardRow>(
            r#"
            SELECT
                f.id,
                f.front,
                f.back,
                f.concept_id,
                f.card_type,
                COALESCE(p.due_at, NOW()) as due_at,
                COALESCE(p.interval_days, 1) as interval_days,
                COALESCE(p.ease_factor, 2.5) as ease_factor,
                COALESCE(p.lapses, 0) as lapses
            FROM learn_flashcards f
            LEFT JOIN user_flashcard_progress p
              ON p.flashcard_id = f.id AND p.user_id = $1
            WHERE f.is_active = true
              AND (p.due_at IS NULL OR p.due_at <= NOW())
            ORDER BY COALESCE(p.due_at, NOW()) ASC
            LIMIT 30
            "#,
        )
        .bind(user_id)
        .fetch_all(pool)
        .await?;

        Ok(cards
            .into_iter()
            .map(|c| ReviewCardResponse {
                id: c.id,
                front: c.front,
                back: c.back,
                concept_id: c.concept_id,
                card_type: c.card_type,
                due_at: c.due_at,
                interval_days: c.interval_days,
                ease_factor: c.ease_factor,
                lapses: c.lapses,
            })
            .collect())
    }

    fn compute_next_review(
        progress: &ReviewCardResponse,
        grade: i32,
    ) -> (f64, f64, i32, DateTime<Utc>) {
        let mut interval = progress.interval_days;
        let mut ease = progress.ease_factor;
        let mut lapses = progress.lapses;

        match grade {
            0 => {
                interval = 1.0;
                lapses += 1;
                ease = (ease - 0.2).max(1.3);
            }
            1 => {
                interval = (interval * 1.2).max(1.0);
                ease = (ease - 0.15).max(1.3);
            }
            2 => {
                interval = if interval < 1.0 { 1.0 } else { interval * ease };
            }
            _ => {
                interval = interval * ease * 1.3;
                ease += 0.15;
            }
        }

        let mut due_at = Utc::now();
        due_at = due_at + chrono::Duration::days(interval.round() as i64);

        (interval, ease, lapses, due_at)
    }

    pub async fn submit_review(
        pool: &PgPool,
        user_id: Uuid,
        card_id: Uuid,
        grade: i32,
    ) -> Result<ReviewSubmitResult, AppError> {
        let card = sqlx::query_as::<_, LearnFlashcard>(
            r#"
            SELECT id, topic_id, lesson_id, front, back, card_type, concept_id, tags, is_active, created_at, updated_at
            FROM learn_flashcards
            WHERE id = $1 AND is_active = true
            "#,
        )
        .bind(card_id)
        .fetch_optional(pool)
        .await?
        .ok_or_else(|| AppError::NotFound("Card not found".to_string()))?;

        let existing = sqlx::query_as::<_, UserFlashcardProgress>(
            r#"
            SELECT id, user_id, flashcard_id, due_at, interval_days, ease_factor, lapses,
                   last_reviewed_at, created_at, updated_at
            FROM user_flashcard_progress
            WHERE user_id = $1 AND flashcard_id = $2
            "#,
        )
        .bind(user_id)
        .bind(card_id)
        .fetch_optional(pool)
        .await?;

        let base = ReviewCardResponse {
            id: card.id,
            front: card.front,
            back: card.back,
            concept_id: card.concept_id,
            card_type: card.card_type,
            due_at: existing.as_ref().map(|p| p.due_at).unwrap_or_else(Utc::now),
            interval_days: existing.as_ref().map(|p| p.interval_days).unwrap_or(1.0),
            ease_factor: existing.as_ref().map(|p| p.ease_factor).unwrap_or(2.5),
            lapses: existing.as_ref().map(|p| p.lapses).unwrap_or(0),
        };

        let (interval, ease, lapses, due_at) = Self::compute_next_review(&base, grade);

        let progress = sqlx::query_as::<_, UserFlashcardProgress>(
            r#"
            INSERT INTO user_flashcard_progress
              (user_id, flashcard_id, due_at, interval_days, ease_factor, lapses, last_reviewed_at, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW(), NOW())
            ON CONFLICT (user_id, flashcard_id)
            DO UPDATE SET
              due_at = $3,
              interval_days = $4,
              ease_factor = $5,
              lapses = $6,
              last_reviewed_at = NOW(),
              updated_at = NOW()
            RETURNING id, user_id, flashcard_id, due_at, interval_days, ease_factor, lapses,
                      last_reviewed_at, created_at, updated_at
            "#,
        )
        .bind(user_id)
        .bind(card_id)
        .bind(due_at)
        .bind(interval)
        .bind(ease)
        .bind(lapses)
        .fetch_one(pool)
        .await?;

        sqlx::query(
            r#"
            INSERT INTO user_flashcard_reviews
              (user_id, flashcard_id, grade, interval_days, ease_factor, lapses, reviewed_at)
            VALUES ($1, $2, $3, $4, $5, $6, NOW())
            "#,
        )
        .bind(user_id)
        .bind(card_id)
        .bind(grade)
        .bind(progress.interval_days)
        .bind(progress.ease_factor)
        .bind(progress.lapses)
        .execute(pool)
        .await?;

        Ok(ReviewSubmitResult {
            card: ReviewCardResponse {
                id: progress.flashcard_id,
                front: base.front,
                back: base.back,
                concept_id: base.concept_id,
                card_type: base.card_type,
                due_at: progress.due_at,
                interval_days: progress.interval_days,
                ease_factor: progress.ease_factor,
                lapses: progress.lapses,
            },
        })
    }

    pub async fn get_review_analytics(
        pool: &PgPool,
        user_id: Uuid,
    ) -> Result<ReviewAnalyticsResponse, AppError> {
        #[derive(FromRow)]
        struct ReviewAnalyticsRow {
            total_reviews: i64,
            reviews_last_7_days: i64,
            reviews_last_30_days: i64,
            retention_rate: f64,
            avg_ease_factor: f64,
            avg_interval_days: f64,
            total_lapses: i64,
            last_reviewed_at: Option<DateTime<Utc>>,
            again_count: i64,
            hard_count: i64,
            good_count: i64,
            easy_count: i64,
        }

        let row = sqlx::query_as::<_, ReviewAnalyticsRow>(
            r#"
            SELECT
              COUNT(*)::bigint AS total_reviews,
              COUNT(*) FILTER (WHERE reviewed_at >= NOW() - INTERVAL '7 days')::bigint AS reviews_last_7_days,
              COUNT(*) FILTER (WHERE reviewed_at >= NOW() - INTERVAL '30 days')::bigint AS reviews_last_30_days,
              COALESCE(AVG(CASE WHEN grade >= 2 THEN 1.0 ELSE 0.0 END), 0.0)::float8 AS retention_rate,
              COALESCE(AVG(ease_factor), 0.0)::float8 AS avg_ease_factor,
              COALESCE(AVG(interval_days), 0.0)::float8 AS avg_interval_days,
              COALESCE(SUM(lapses), 0)::bigint AS total_lapses,
              MAX(reviewed_at) AS last_reviewed_at,
              COUNT(*) FILTER (WHERE grade = 0)::bigint AS again_count,
              COUNT(*) FILTER (WHERE grade = 1)::bigint AS hard_count,
              COUNT(*) FILTER (WHERE grade = 2)::bigint AS good_count,
              COUNT(*) FILTER (WHERE grade = 3)::bigint AS easy_count
            FROM user_flashcard_reviews
            WHERE user_id = $1
            "#,
        )
        .bind(user_id)
        .fetch_one(pool)
        .await?;

        Ok(ReviewAnalyticsResponse {
            total_reviews: row.total_reviews,
            reviews_last_7_days: row.reviews_last_7_days,
            reviews_last_30_days: row.reviews_last_30_days,
            retention_rate: row.retention_rate,
            avg_ease_factor: row.avg_ease_factor,
            avg_interval_days: row.avg_interval_days,
            total_lapses: row.total_lapses,
            last_reviewed_at: row.last_reviewed_at,
            grades: ReviewGradeCounts {
                again: row.again_count,
                hard: row.hard_count,
                good: row.good_count,
                easy: row.easy_count,
            },
        })
    }

    // ============================================
    // Glossary
    // ============================================

    pub async fn list_glossary(
        pool: &PgPool,
        query: Option<&str>,
        category: Option<&str>,
    ) -> Result<Vec<GlossaryEntryResponse>, AppError> {
        #[derive(FromRow)]
        struct GlossaryRow {
            id: Uuid,
            term: String,
            definition: String,
            category: String,
            aliases: Option<Vec<String>>,
            related_concepts: Option<Vec<String>>,
        }

        let mut sql = String::from(
            r#"
            SELECT id, term, definition, category, aliases, related_concepts
            FROM glossary_entries
            WHERE is_active = true
            "#,
        );

        if category.is_some() {
            sql.push_str(" AND category = $1");
        }

        if query.is_some() {
            if category.is_some() {
                sql.push_str(" AND (term ILIKE $2 OR definition ILIKE $2)");
            } else {
                sql.push_str(" AND (term ILIKE $1 OR definition ILIKE $1)");
            }
        }

        sql.push_str(" ORDER BY sort_order, term");

        let mut q = sqlx::query_as::<_, GlossaryRow>(&sql);
        if let Some(cat) = category {
            q = q.bind(cat);
        }
        if let Some(term) = query {
            let pattern = format!("%{}%", term);
            q = q.bind(pattern);
        }

        let rows = q.fetch_all(pool).await?;

        Ok(rows
            .into_iter()
            .map(|r| GlossaryEntryResponse {
                id: r.id,
                term: r.term,
                definition: r.definition,
                category: r.category,
                aliases: r.aliases,
                related_concepts: r.related_concepts,
            })
            .collect())
    }

    // ============================================
    // Recipes
    // ============================================

    pub async fn list_recipes(
        pool: &PgPool,
        user_id: Uuid,
    ) -> Result<Vec<RecipeTemplateResponse>, AppError> {
        let rows = sqlx::query_as::<_, RecipeTemplate>(
            r#"
            SELECT id, user_id, title, synth, target_type, descriptors, mono, cpu_budget,
                   macro_count, recipe_json, created_at, updated_at
            FROM recipe_templates
            WHERE user_id = $1
            ORDER BY created_at DESC
            "#,
        )
        .bind(user_id)
        .fetch_all(pool)
        .await?;

        Ok(rows
            .into_iter()
            .map(|r| RecipeTemplateResponse {
                id: r.id,
                title: r.title,
                synth: r.synth,
                target_type: r.target_type,
                descriptors: r.descriptors,
                mono: r.mono,
                cpu_budget: r.cpu_budget,
                macro_count: r.macro_count,
                recipe_json: r.recipe_json,
                created_at: r.created_at,
            })
            .collect())
    }

    pub async fn create_recipe(
        pool: &PgPool,
        user_id: Uuid,
        req: &CreateRecipeTemplateRequest,
    ) -> Result<RecipeTemplateResponse, AppError> {
        let row = sqlx::query_as::<_, RecipeTemplate>(
            r#"
            INSERT INTO recipe_templates
              (user_id, title, synth, target_type, descriptors, mono, cpu_budget, macro_count, recipe_json, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
            RETURNING id, user_id, title, synth, target_type, descriptors, mono, cpu_budget,
                      macro_count, recipe_json, created_at, updated_at
            "#,
        )
        .bind(user_id)
        .bind(&req.title)
        .bind(&req.synth)
        .bind(&req.target_type)
        .bind(&req.descriptors)
        .bind(req.mono)
        .bind(&req.cpu_budget)
        .bind(req.macro_count)
        .bind(&req.recipe_json)
        .fetch_one(pool)
        .await?;

        Ok(RecipeTemplateResponse {
            id: row.id,
            title: row.title,
            synth: row.synth,
            target_type: row.target_type,
            descriptors: row.descriptors,
            mono: row.mono,
            cpu_budget: row.cpu_budget,
            macro_count: row.macro_count,
            recipe_json: row.recipe_json,
            created_at: row.created_at,
        })
    }

    pub async fn delete_recipe(pool: &PgPool, user_id: Uuid, id: Uuid) -> Result<bool, AppError> {
        let result = sqlx::query("DELETE FROM recipe_templates WHERE id = $1 AND user_id = $2")
            .bind(id)
            .bind(user_id)
            .execute(pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }

    // ============================================
    // Journal
    // ============================================

    pub async fn list_journal_entries(
        pool: &PgPool,
        user_id: Uuid,
    ) -> Result<Vec<JournalEntryResponse>, AppError> {
        let rows = sqlx::query_as::<_, JournalEntry>(
            r#"
            SELECT id, user_id, synth, patch_name, tags, notes, what_learned,
                   what_broke, preset_reference, created_at, updated_at
            FROM journal_entries
            WHERE user_id = $1
            ORDER BY created_at DESC
            "#,
        )
        .bind(user_id)
        .fetch_all(pool)
        .await?;

        Ok(rows
            .into_iter()
            .map(|e| JournalEntryResponse {
                id: e.id,
                synth: e.synth,
                patch_name: e.patch_name,
                tags: e.tags,
                notes: e.notes,
                what_learned: e.what_learned,
                what_broke: e.what_broke,
                preset_reference: e.preset_reference,
                created_at: e.created_at,
                updated_at: e.updated_at,
            })
            .collect())
    }

    pub async fn create_journal_entry(
        pool: &PgPool,
        user_id: Uuid,
        req: &CreateJournalEntryRequest,
    ) -> Result<JournalEntryResponse, AppError> {
        let row = sqlx::query_as::<_, JournalEntry>(
            r#"
            INSERT INTO journal_entries
              (user_id, synth, patch_name, tags, notes, what_learned, what_broke, preset_reference, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
            RETURNING id, user_id, synth, patch_name, tags, notes, what_learned,
                      what_broke, preset_reference, created_at, updated_at
            "#,
        )
        .bind(user_id)
        .bind(&req.synth)
        .bind(&req.patch_name)
        .bind(&req.tags)
        .bind(&req.notes)
        .bind(&req.what_learned)
        .bind(&req.what_broke)
        .bind(&req.preset_reference)
        .fetch_one(pool)
        .await?;

        Ok(JournalEntryResponse {
            id: row.id,
            synth: row.synth,
            patch_name: row.patch_name,
            tags: row.tags,
            notes: row.notes,
            what_learned: row.what_learned,
            what_broke: row.what_broke,
            preset_reference: row.preset_reference,
            created_at: row.created_at,
            updated_at: row.updated_at,
        })
    }

    pub async fn update_journal_entry(
        pool: &PgPool,
        user_id: Uuid,
        id: Uuid,
        req: &UpdateJournalEntryRequest,
    ) -> Result<JournalEntryResponse, AppError> {
        let existing = sqlx::query_as::<_, JournalEntry>(
            r#"
            SELECT id, user_id, synth, patch_name, tags, notes, what_learned,
                   what_broke, preset_reference, created_at, updated_at
            FROM journal_entries
            WHERE id = $1 AND user_id = $2
            "#,
        )
        .bind(id)
        .bind(user_id)
        .fetch_optional(pool)
        .await?
        .ok_or_else(|| AppError::NotFound("Journal entry not found".to_string()))?;

        let synth = req.synth.as_deref().unwrap_or(&existing.synth);
        let patch_name = req.patch_name.as_deref().unwrap_or(&existing.patch_name);
        let tags = req.tags.clone().or(existing.tags.clone());
        let notes = req.notes.as_ref().or(existing.notes.as_ref());
        let what_learned = req.what_learned.as_ref().or(existing.what_learned.as_ref());
        let what_broke = req.what_broke.as_ref().or(existing.what_broke.as_ref());
        let preset_reference = req
            .preset_reference
            .as_ref()
            .or(existing.preset_reference.as_ref());

        let row = sqlx::query_as::<_, JournalEntry>(
            r#"
            UPDATE journal_entries
            SET synth = $3,
                patch_name = $4,
                tags = $5,
                notes = $6,
                what_learned = $7,
                what_broke = $8,
                preset_reference = $9,
                updated_at = NOW()
            WHERE id = $1 AND user_id = $2
            RETURNING id, user_id, synth, patch_name, tags, notes, what_learned,
                      what_broke, preset_reference, created_at, updated_at
            "#,
        )
        .bind(id)
        .bind(user_id)
        .bind(synth)
        .bind(patch_name)
        .bind(tags)
        .bind(notes)
        .bind(what_learned)
        .bind(what_broke)
        .bind(preset_reference)
        .fetch_one(pool)
        .await?;

        Ok(JournalEntryResponse {
            id: row.id,
            synth: row.synth,
            patch_name: row.patch_name,
            tags: row.tags,
            notes: row.notes,
            what_learned: row.what_learned,
            what_broke: row.what_broke,
            preset_reference: row.preset_reference,
            created_at: row.created_at,
            updated_at: row.updated_at,
        })
    }

    pub async fn delete_journal_entry(
        pool: &PgPool,
        user_id: Uuid,
        id: Uuid,
    ) -> Result<bool, AppError> {
        let result = sqlx::query("DELETE FROM journal_entries WHERE id = $1 AND user_id = $2")
            .bind(id)
            .bind(user_id)
            .execute(pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }
}

// ============================================================================
// TESTS
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_difficulty_as_str() {
        assert_eq!(Difficulty::Beginner.as_str(), "beginner");
        assert_eq!(Difficulty::Intermediate.as_str(), "intermediate");
        assert_eq!(Difficulty::Advanced.as_str(), "advanced");
    }
}
