//! Test constants
//!
//! Shared constants used throughout tests for consistency.

/// Default test email domain
pub const TEST_EMAIL_DOMAIN: &str = "test.local";

/// Default test user email
pub fn test_email(suffix: &str) -> String {
    format!("test-user-{}@{}", suffix, TEST_EMAIL_DOMAIN)
}

/// Default test password hash
pub const TEST_PASSWORD_HASH: &str = "test_hash_value";

/// Default test habit frequency
pub const TEST_HABIT_FREQUENCY: &str = "daily";

/// Default test habit target count
pub const TEST_HABIT_TARGET: i32 = 1;

/// Default test quest difficulty
pub const TEST_QUEST_DIFFICULTY: &str = "easy";

/// Default test quest XP reward
pub const TEST_QUEST_XP: i32 = 10;

/// Default test quest coin reward
pub const TEST_QUEST_COIN: i32 = 5;

/// Default test goal target value
pub const TEST_GOAL_TARGET: i32 = 100;

/// Default test goal initial value
pub const TEST_GOAL_INITIAL: i32 = 0;

/// Test timeout duration in seconds
pub const TEST_TIMEOUT_SECS: u64 = 30;
