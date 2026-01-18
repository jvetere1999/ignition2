//! Test database fixtures
//!
//! Provides helper functions to create test data.
//! All functions are async and work with the database pool.

use sqlx::PgPool;
use uuid::Uuid;

use crate::db::gamification_models::AwardPointsInput;
use crate::db::gamification_repos::GamificationRepo;
use crate::db::goals_models::CreateGoalRequest;
use crate::db::goals_repos::GoalsRepo;
use crate::db::habits_goals_models::CreateHabitRequest;
use crate::db::habits_goals_repos::HabitsRepo;
use crate::db::quests_models::CreateQuestRequest;
use crate::db::quests_repos::QuestsRepo;
use crate::db::users_models::CreateUserInput;
use crate::db::users_repos::UsersRepo;

/// Create a test user with minimal setup
///
/// Returns the user ID for use in other fixture functions.
///
/// # Example
/// ```ignore
/// let user_id = create_test_user(&pool).await;
/// ```
pub async fn create_test_user(pool: &PgPool) -> Uuid {
    let email = format!("test-user-{}@test.local", uuid::Uuid::new_v4());

    let user = UsersRepo::create(
        pool,
        &CreateUserInput {
            email: email.clone(),
            password_hash: "test_hash".to_string(),
        },
    )
    .await
    .expect("Failed to create test user");

    user.id
}

/// Create a test habit for a given user
///
/// # Arguments
/// * `pool` - Database connection pool
/// * `user_id` - Owner of the habit
///
/// # Returns
/// The created habit's ID
pub async fn create_test_habit(pool: &PgPool, user_id: Uuid) -> Uuid {
    let habit = HabitsRepo::create(
        pool,
        user_id,
        &CreateHabitRequest {
            name: format!("Test Habit {}", uuid::Uuid::new_v4()),
            description: None,
            frequency: "daily".to_string(),
            target_count: 1,
            custom_days: None,
            icon: None,
            color: None,
        },
    )
    .await
    .expect("Failed to create test habit");

    habit.id
}

/// Create a test quest for a given user
///
/// # Arguments
/// * `pool` - Database connection pool
/// * `user_id` - Owner of the quest
///
/// # Returns
/// The created quest's ID
pub async fn create_test_quest(pool: &PgPool, user_id: Uuid) -> Uuid {
    let quest = QuestsRepo::create(
        pool,
        user_id,
        &CreateQuestRequest {
            title: format!("Test Quest {}", uuid::Uuid::new_v4()),
            description: Some("Test quest for integration tests".to_string()),
            category: "adventure".to_string(),
            difficulty: "easy".to_string(),
            xp_reward: Some(10),
            coin_reward: Some(5),
            target: Some(1),
            is_repeatable: Some(false),
            repeat_frequency: None,
        },
    )
    .await
    .expect("Failed to create test quest");

    quest.id
}

/// Create a test goal for a given user
///
/// # Arguments
/// * `pool` - Database connection pool
/// * `user_id` - Owner of the goal
///
/// # Returns
/// The created goal's ID
pub async fn create_test_goal(pool: &PgPool, user_id: Uuid) -> Uuid {
    let goal = GoalsRepo::create(
        pool,
        user_id,
        &CreateGoalRequest {
            name: format!("Test Goal {}", uuid::Uuid::new_v4()),
            description: None,
            target_value: Some(100),
            current_value: Some(0),
            goal_type: Some("growth".to_string()),
            start_date: None,
            target_date: None,
            category: Some("general".to_string()),
            icon: None,
            color: None,
        },
    )
    .await
    .expect("Failed to create test goal");

    goal.id
}

/// Award points to a user for testing gamification
///
/// # Arguments
/// * `pool` - Database connection pool
/// * `user_id` - User to award points to
/// * `xp` - XP amount
/// * `coins` - Coin amount
pub async fn award_test_points(pool: &PgPool, user_id: Uuid, xp: i32, coins: i32) {
    GamificationRepo::award_points(
        pool,
        &AwardPointsInput {
            user_id,
            xp,
            coins,
            reason: "test_award".to_string(),
        },
    )
    .await
    .expect("Failed to award test points");
}
