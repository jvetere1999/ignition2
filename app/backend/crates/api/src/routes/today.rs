//! Today Routes - Dashboard data aggregation
//!
//! Provides the Today page with all data in a single request.
//! Aggregates from: daily_plans, focus_sessions, habits, quests, user_settings, onboarding
//!
//! DESIGN:
//! - Single endpoint to reduce client round-trips
//! - Parallel queries for performance
//! - Returns sensible defaults when data is missing

use std::sync::Arc;

use axum::{
    extract::State,
    routing::get,
    Extension, Json, Router,
};
use serde::Serialize;
use sqlx::PgPool;
use uuid::Uuid;

use crate::error::AppError;
use crate::middleware::auth::AuthContext;
use crate::state::AppState;

/// Create today routes
pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/", get(get_today_data))
}

// ============================================
// Response Types
// ============================================

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TodayResponse {
    pub user_state: UserState,
    pub dynamic_ui_data: Option<DynamicUIData>,
    pub plan_summary: Option<DailyPlanSummary>,
    pub personalization: UserPersonalization,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UserState {
    pub plan_exists: bool,
    pub has_incomplete_plan_items: bool,
    pub returning_after_gap: bool,
    pub first_day: bool,
    pub focus_active: bool,
    pub active_streak: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct QuickPick {
    pub module: String,
    pub route: String,
    pub label: String,
    pub count: i32,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ResumeLast {
    pub module: String,
    pub route: String,
    pub label: String,
    pub last_used: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InterestPrimer {
    #[serde(rename = "type")]
    pub primer_type: String,
    pub route: String,
    pub label: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DynamicUIData {
    pub quick_picks: Vec<QuickPick>,
    pub resume_last: Option<ResumeLast>,
    pub interest_primer: Option<InterestPrimer>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NextItem {
    pub id: String,
    pub title: String,
    pub priority: i32,
    pub action_url: String,
    #[serde(rename = "type")]
    pub item_type: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DailyPlanSummary {
    pub plan_exists: bool,
    pub has_incomplete_plan_items: bool,
    pub next_incomplete_item: Option<NextItem>,
    pub total_count: i32,
    pub completed_count: i32,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UserPersonalization {
    pub interests: Vec<String>,
    pub module_weights: serde_json::Value,
    pub nudge_intensity: String,
    pub focus_duration: i32,
    pub gamification_visible: bool,
    pub onboarding_active: bool,
    pub onboarding_route: Option<String>,
}

// ============================================
// Handler
// ============================================

/// GET /api/today
///
/// Returns all data needed for the Today page in one request.
async fn get_today_data(
    State(state): State<Arc<AppState>>,
    Extension(auth): Extension<AuthContext>,
) -> Result<Json<TodayResponse>, AppError> {
    let user_id = auth.user_id;
    
    // Fetch all data in parallel
    let (user_state, plan_summary, personalization, dynamic_ui) = tokio::try_join!(
        fetch_user_state(&state.db, user_id),
        fetch_plan_summary(&state.db, user_id),
        fetch_personalization(&state.db, user_id),
        fetch_dynamic_ui(&state.db, user_id),
    )?;
    
    Ok(Json(TodayResponse {
        user_state,
        dynamic_ui_data: Some(dynamic_ui),
        plan_summary: Some(plan_summary),
        personalization,
    }))
}

// ============================================
// Data Fetchers
// ============================================

async fn fetch_user_state(pool: &PgPool, user_id: Uuid) -> Result<UserState, AppError> {
    let today = chrono::Utc::now().format("%Y-%m-%d").to_string();
    
    // Check if plan exists for today
    let plan_row = sqlx::query_as::<_, (i64, i32, i32)>(
        r#"
        SELECT 
            COUNT(*) as plan_count,
            COALESCE(SUM(CASE WHEN completed THEN 1 ELSE 0 END), 0)::int as completed,
            COALESCE(COUNT(*), 0)::int as total
        FROM daily_plan_items dpi
        JOIN daily_plans dp ON dp.id = dpi.plan_id
        WHERE dp.user_id = $1 AND dp.date = $2
        "#
    )
    .bind(user_id)
    .bind(&today)
    .fetch_optional(pool)
    .await
    .map_err(|e| AppError::Database(e.to_string()))?
    .unwrap_or((0, 0, 0));
    
    let (plan_count, completed, total) = plan_row;
    let plan_exists = plan_count > 0;
    let has_incomplete = total > completed;
    
    // Check for active focus session
    let focus_active = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT COUNT(*) FROM focus_sessions 
        WHERE user_id = $1 AND status = 'active' 
        AND (expires_at IS NULL OR expires_at > NOW())
        "#
    )
    .bind(user_id)
    .fetch_one(pool)
    .await
    .map_err(|e| AppError::Database(e.to_string()))? > 0;
    
    // Check for active streak (user has logged activity in the last 2 days)
    let active_streak = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT COUNT(*) FROM user_progress 
        WHERE user_id = $1 AND streak_days > 0
        "#
    )
    .bind(user_id)
    .fetch_one(pool)
    .await
    .map_err(|e| AppError::Database(e.to_string()))? > 0;
    
    // Check if first day (user created today)
    let first_day = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT COUNT(*) FROM users 
        WHERE id = $1 AND created_at::date = CURRENT_DATE
        "#
    )
    .bind(user_id)
    .fetch_one(pool)
    .await
    .map_err(|e| AppError::Database(e.to_string()))? > 0;
    
    // Check for returning after gap (last activity > 3 days ago)
    let returning_after_gap = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT COUNT(*) FROM users 
        WHERE id = $1 
        AND last_activity_at IS NOT NULL 
        AND last_activity_at < NOW() - INTERVAL '3 days'
        "#
    )
    .bind(user_id)
    .fetch_one(pool)
    .await
    .map_err(|e| AppError::Database(e.to_string()))? > 0;
    
    Ok(UserState {
        plan_exists,
        has_incomplete_plan_items: has_incomplete,
        returning_after_gap,
        first_day,
        focus_active,
        active_streak,
    })
}

async fn fetch_plan_summary(pool: &PgPool, user_id: Uuid) -> Result<DailyPlanSummary, AppError> {
    let today = chrono::Utc::now().format("%Y-%m-%d").to_string();
    
    // Get plan items for today
    let items = sqlx::query_as::<_, (String, String, i32, String, bool)>(
        r#"
        SELECT 
            dpi.id::text,
            dpi.title,
            dpi.priority,
            dpi.item_type,
            dpi.completed
        FROM daily_plan_items dpi
        JOIN daily_plans dp ON dp.id = dpi.plan_id
        WHERE dp.user_id = $1 AND dp.date = $2
        ORDER BY dpi.priority ASC, dpi.created_at ASC
        "#
    )
    .bind(user_id)
    .bind(&today)
    .fetch_all(pool)
    .await
    .map_err(|e| AppError::Database(e.to_string()))?;
    
    let total_count = items.len() as i32;
    let completed_count = items.iter().filter(|i| i.4).count() as i32;
    let plan_exists = total_count > 0;
    let has_incomplete = total_count > completed_count;
    
    // Find next incomplete item
    let next_incomplete = items.iter()
        .find(|i| !i.4)
        .map(|(id, title, priority, item_type, _)| {
            let action_url = match item_type.as_str() {
                "focus" => "/focus".to_string(),
                "quest" => format!("/quests/{}", id),
                "workout" => "/exercise".to_string(),
                "learning" => "/learn".to_string(),
                "habit" => "/habits".to_string(),
                _ => "/today".to_string(),
            };
            NextItem {
                id: id.clone(),
                title: title.clone(),
                priority: *priority,
                action_url,
                item_type: item_type.clone(),
            }
        });
    
    Ok(DailyPlanSummary {
        plan_exists,
        has_incomplete_plan_items: has_incomplete,
        next_incomplete_item: next_incomplete,
        total_count,
        completed_count,
    })
}

async fn fetch_personalization(pool: &PgPool, user_id: Uuid) -> Result<UserPersonalization, AppError> {
    // Get user settings
    let settings = sqlx::query_as::<_, (String, serde_json::Value)>(
        r#"
        SELECT key, value FROM user_settings 
        WHERE user_id = $1 AND key IN (
            'interests', 'module_weights', 'nudge_intensity', 
            'focus_duration', 'gamification_visible'
        )
        "#
    )
    .bind(user_id)
    .fetch_all(pool)
    .await
    .map_err(|e| AppError::Database(e.to_string()))?;
    
    let settings_map: std::collections::HashMap<String, serde_json::Value> = 
        settings.into_iter().collect();
    
    // Check onboarding status
    let onboarding = sqlx::query_as::<_, (bool, Option<String>)>(
        r#"
        SELECT 
            NOT completed as active,
            current_step
        FROM user_onboarding_state
        WHERE user_id = $1
        "#
    )
    .bind(user_id)
    .fetch_optional(pool)
    .await
    .map_err(|e| AppError::Database(e.to_string()))?;
    
    let (onboarding_active, current_step) = onboarding.unwrap_or((false, None));
    let onboarding_route = if onboarding_active {
        current_step.map(|s| format!("/onboarding/{}", s))
    } else {
        None
    };
    
    Ok(UserPersonalization {
        interests: settings_map.get("interests")
            .and_then(|v| v.as_array())
            .map(|arr| arr.iter().filter_map(|v| v.as_str().map(String::from)).collect())
            .unwrap_or_default(),
        module_weights: settings_map.get("module_weights")
            .cloned()
            .unwrap_or(serde_json::json!({})),
        nudge_intensity: settings_map.get("nudge_intensity")
            .and_then(|v| v.as_str())
            .unwrap_or("standard")
            .to_string(),
        focus_duration: settings_map.get("focus_duration")
            .and_then(|v| v.as_i64())
            .unwrap_or(25) as i32,
        gamification_visible: settings_map.get("gamification_visible")
            .and_then(|v| v.as_bool())
            .unwrap_or(true),
        onboarding_active,
        onboarding_route,
    })
}

async fn fetch_dynamic_ui(pool: &PgPool, user_id: Uuid) -> Result<DynamicUIData, AppError> {
    // Build quick picks from user activity
    let mut quick_picks = Vec::new();
    
    // Check pending habits
    let pending_habits = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT COUNT(*) FROM habits h
        WHERE h.user_id = $1 AND h.archived = false
        AND NOT EXISTS (
            SELECT 1 FROM habit_completions hl 
            WHERE hl.habit_id = h.id 
            AND hl.completed_at::date = CURRENT_DATE
        )
        "#
    )
    .bind(user_id)
    .fetch_one(pool)
    .await
    .map_err(|e| AppError::Database(e.to_string()))?;
    
    if pending_habits > 0 {
        quick_picks.push(QuickPick {
            module: "habits".to_string(),
            route: "/habits".to_string(),
            label: "Check habits".to_string(),
            count: pending_habits as i32,
        });
    }
    
    // Check active quests
    let active_quests = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT COUNT(*) FROM user_quest_progress uqp
        JOIN universal_quests uq ON uq.id = uqp.quest_id
        WHERE uqp.user_id = $1 AND uqp.completed = false
        AND (uq.expires_at IS NULL OR uq.expires_at > NOW())
        "#
    )
    .bind(user_id)
    .fetch_one(pool)
    .await
    .map_err(|e| AppError::Database(e.to_string()))?;
    
    if active_quests > 0 {
        quick_picks.push(QuickPick {
            module: "quests".to_string(),
            route: "/quests".to_string(),
            label: "Continue quests".to_string(),
            count: active_quests as i32,
        });
    }
    
    // Check unread inbox
    let unread_inbox = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM inbox_items WHERE user_id = $1 AND is_read = false"
    )
    .bind(user_id)
    .fetch_one(pool)
    .await
    .map_err(|e| AppError::Database(e.to_string()))?;
    
    if unread_inbox > 0 {
        quick_picks.push(QuickPick {
            module: "inbox".to_string(),
            route: "/inbox".to_string(),
            label: "Check inbox".to_string(),
            count: unread_inbox as i32,
        });
    }
    
    // Get resume last (most recent activity)
    let resume_last = sqlx::query_as::<_, (String, String, String)>(
        r#"
        SELECT 
            'focus' as module,
            '/focus' as route,
            mode as label
        FROM focus_sessions
        WHERE user_id = $1 AND status = 'completed'
        ORDER BY ended_at DESC
        LIMIT 1
        "#
    )
    .bind(user_id)
    .fetch_optional(pool)
    .await
    .map_err(|e| AppError::Database(e.to_string()))?
    .map(|(module, route, label)| ResumeLast {
        module,
        route,
        label: format!("Resume {}", label),
        last_used: chrono::Utc::now().to_rfc3339(),
    });
    
    Ok(DynamicUIData {
        quick_picks,
        resume_last,
        interest_primer: None, // Will be populated based on user interests later
    })
}
