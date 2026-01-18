//! Test database cleanup utilities
//!
//! Helpers for manual cleanup of test data.
//! Note: Usually not needed as sqlx::test wraps tests in transactions
//! that are automatically rolled back.

use sqlx::PgPool;
use uuid::Uuid;

/// Manually delete a user (for explicit cleanup if needed)
///
/// # Note
/// Typically not needed as sqlx::test provides automatic transaction rollback.
/// Use only if explicit cleanup is required for your test.
#[allow(dead_code)]
pub async fn cleanup_user(pool: &PgPool, user_id: Uuid) {
    let _ = sqlx::query("DELETE FROM users WHERE id = $1")
        .bind(user_id)
        .execute(pool)
        .await;
}

/// Clear all test data from database
///
/// # Warning
/// Use only in cleanup functions, never in production!
/// This deletes ALL data from the database.
#[allow(dead_code)]
pub async fn cleanup_all_test_data(pool: &PgPool) {
    // Clear tables in reverse dependency order
    let tables = vec![
        "gamification_progress",
        "audit_logs",
        "goal_progress",
        "goals",
        "habit_logs",
        "habit_achievements",
        "habits",
        "quests",
        "storage_objects",
        "oauth_states",
        "sessions",
        "users",
    ];

    for table in tables {
        let _ = sqlx::query(&format!("DELETE FROM {}", table))
            .execute(pool)
            .await;
    }
}
