//! Test fixtures for database integration tests
//!
//! Provides shared test setup, common fixtures, and helper functions
//! for consistent test initialization across the test suite.

#[cfg(test)]
mod fixtures {
    use crate::db::{
        gamification_repos::UserProgressRepo, habits_goals_models::CreateHabitRequest,
        habits_goals_repos::HabitsRepo, quests_models::CreateQuestRequest,
        quests_repos::QuestsRepo,
    };
    use sqlx::PgPool;
    use uuid::Uuid;

    // ========================================================================
    // USER FIXTURES
    // ========================================================================

    /// Create a test user with initialized progress
    ///
    /// This is the most common fixture used by all test modules.
    /// Ensures user exists with all required dependencies initialized.
    pub async fn create_test_user(pool: &PgPool) -> Uuid {
        let user_id = Uuid::new_v4();
        let email = format!("test-user-{}@example.com", user_id);

        sqlx::query(
            r#"INSERT INTO users (id, email, name, role)
               VALUES ($1, $2, 'Test User', 'user')"#,
        )
        .bind(user_id)
        .bind(&email)
        .execute(pool)
        .await
        .expect("Failed to create test user");

        // Initialize gamification progress (required for point awards, streaks, etc.)
        UserProgressRepo::get_or_create(pool, user_id)
            .await
            .expect("Failed to initialize user progress");

        user_id
    }

    /// Create test user with custom email
    pub async fn create_test_user_with_email(pool: &PgPool, email: &str) -> Uuid {
        let user_id = Uuid::new_v4();

        sqlx::query(
            r#"INSERT INTO users (id, email, name, role)
               VALUES ($1, $2, 'Test User', 'user')"#,
        )
        .bind(user_id)
        .bind(email)
        .execute(pool)
        .await
        .expect("Failed to create test user with email");

        UserProgressRepo::get_or_create(pool, user_id)
            .await
            .expect("Failed to initialize user progress");

        user_id
    }

    // ========================================================================
    // HABIT FIXTURES
    // ========================================================================

    /// Create a default test habit (daily meditation)
    pub async fn create_test_habit(pool: &PgPool, user_id: Uuid) -> Uuid {
        let request = CreateHabitRequest {
            name: "Test Habit".to_string(),
            description: Some("Test habit for unit tests".to_string()),
            frequency: "daily".to_string(),
            target_count: 1,
            custom_days: None,
            icon: Some("📝".to_string()),
            color: Some("#6366F1".to_string()),
        };

        let habit = HabitsRepo::create(pool, user_id, &request)
            .await
            .expect("Failed to create test habit");

        habit.id
    }

    /// Create a test habit with custom name and frequency
    pub async fn create_test_habit_custom(
        pool: &PgPool,
        user_id: Uuid,
        name: &str,
        frequency: &str,
    ) -> Uuid {
        let request = CreateHabitRequest {
            name: name.to_string(),
            description: None,
            frequency: frequency.to_string(),
            target_count: 1,
            custom_days: None,
            icon: None,
            color: None,
        };

        let habit = HabitsRepo::create(pool, user_id, &request)
            .await
            .expect("Failed to create test habit");

        habit.id
    }

    // ========================================================================
    // QUEST FIXTURES
    // ========================================================================

    /// Create a default test quest
    pub async fn create_test_quest(pool: &PgPool, user_id: Uuid) -> Uuid {
        let request = CreateQuestRequest {
            universal_quest_id: None,
            title: "Test Quest".to_string(),
            description: Some("Test quest for unit tests".to_string()),
            xp_reward: 100,
            coin_reward: 50,
        };

        let quest = QuestsRepo::create_user_quest(pool, user_id, &request)
            .await
            .expect("Failed to create test quest");

        quest.id
    }

    // ========================================================================
    // TEST ASSERTIONS
    // ========================================================================

    /// Assert that a user exists
    pub async fn assert_user_exists(pool: &PgPool, user_id: Uuid) {
        let user = sqlx::query("SELECT id FROM users WHERE id = $1")
            .bind(user_id)
            .fetch_optional(pool)
            .await
            .expect("Database query failed")
            .expect("User should exist");

        assert!(!user.is_empty(), "User should exist in database");
    }

    /// Assert that a habit exists and belongs to user
    pub async fn assert_habit_exists(pool: &PgPool, user_id: Uuid, habit_id: Uuid) {
        let habit = sqlx::query("SELECT id FROM habits WHERE id = $1 AND user_id = $2")
            .bind(habit_id)
            .bind(user_id)
            .fetch_optional(pool)
            .await
            .expect("Database query failed")
            .expect("Habit should exist");

        assert!(!habit.is_empty(), "Habit should exist for user");
    }

    /// Assert that a quest exists and belongs to user
    pub async fn assert_quest_exists(pool: &PgPool, user_id: Uuid, quest_id: Uuid) {
        let quest = sqlx::query("SELECT id FROM user_quests WHERE id = $1 AND user_id = $2")
            .bind(quest_id)
            .bind(user_id)
            .fetch_optional(pool)
            .await
            .expect("Database query failed")
            .expect("Quest should exist");

        assert!(!quest.is_empty(), "Quest should exist for user");
    }

    #[cfg(test)]
    mod tests {
        use super::*;

        #[sqlx::test]
        async fn test_create_test_user(pool: PgPool) {
            let user_id = create_test_user(&pool).await;
            assert_user_exists(&pool, user_id).await;
        }

        #[sqlx::test]
        async fn test_create_test_user_with_email(pool: PgPool) {
            let email = "custom@example.com";
            let user_id = create_test_user_with_email(&pool, email).await;

            let row = sqlx::query("SELECT email FROM users WHERE id = $1")
                .bind(user_id)
                .fetch_one(&pool)
                .await
                .expect("User should exist");

            let stored_email: String = row.get("email");
            assert_eq!(stored_email, email);
        }

        #[sqlx::test]
        async fn test_create_test_habit(pool: PgPool) {
            let user_id = create_test_user(&pool).await;
            let habit_id = create_test_habit(&pool, user_id).await;
            assert_habit_exists(&pool, user_id, habit_id).await;
        }
    }
}

// Re-export fixtures for use in test modules
pub use fixtures::*;
