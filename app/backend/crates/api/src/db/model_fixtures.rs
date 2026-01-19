//! Database Model Factory & Fixtures
//!
//! Factory functions for creating test models and fixtures.
//! Provides convenient builders for common entity types.

use chrono::Utc;
use uuid::Uuid;

use super::*;

/// Builder pattern for creating test User models
pub struct UserBuilder {
    id: Uuid,
    email: String,
    username: String,
    verified: bool,
    created_at: chrono::DateTime<Utc>,
}

impl UserBuilder {
    /// Create a new user builder with defaults
    pub fn new() -> Self {
        Self {
            id: Uuid::new_v4(),
            email: format!("user{}@test.com", Uuid::new_v4().simple()),
            username: format!("user_{}", Uuid::new_v4().simple()),
            verified: false,
            created_at: Utc::now(),
        }
    }

    /// Set custom ID
    pub fn id(mut self, id: Uuid) -> Self {
        self.id = id;
        self
    }

    /// Set custom email
    pub fn email(mut self, email: impl Into<String>) -> Self {
        self.email = email.into();
        self
    }

    /// Set custom username
    pub fn username(mut self, username: impl Into<String>) -> Self {
        self.username = username.into();
        self
    }

    /// Mark as verified
    pub fn verified(mut self, verified: bool) -> Self {
        self.verified = verified;
        self
    }

    /// Build the user model
    pub fn build(self) -> UserProfile {
        UserProfile {
            id: self.id,
            email: self.email,
            username: self.username,
            avatar: None,
            bio: None,
            verified: self.verified,
            level: 1,
            total_xp: 0,
            current_streak: 0,
            longest_streak: 0,
            created_at: self.created_at,
            updated_at: Utc::now(),
        }
    }
}

impl Default for UserBuilder {
    fn default() -> Self {
        Self::new()
    }
}

/// Builder for Habit models
pub struct HabitBuilder {
    id: Uuid,
    user_id: Uuid,
    name: String,
    description: Option<String>,
    frequency: String,
    target: i32,
}

impl HabitBuilder {
    pub fn new(user_id: Uuid) -> Self {
        Self {
            id: Uuid::new_v4(),
            user_id,
            name: "Test Habit".to_string(),
            description: None,
            frequency: "daily".to_string(),
            target: 1,
        }
    }

    pub fn name(mut self, name: impl Into<String>) -> Self {
        self.name = name.into();
        self
    }

    pub fn frequency(mut self, frequency: impl Into<String>) -> Self {
        self.frequency = frequency.into();
        self
    }

    pub fn target(mut self, target: i32) -> Self {
        self.target = target;
        self
    }

    pub fn build(self) -> Habit {
        Habit {
            id: self.id,
            user_id: self.user_id,
            name: self.name,
            description: self.description,
            frequency: self.frequency,
            target: self.target,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        }
    }
}

/// Builder for Quest models
pub struct QuestBuilder {
    id: Uuid,
    title: String,
    description: String,
    reward_xp: i32,
    status: String,
}

impl QuestBuilder {
    pub fn new() -> Self {
        Self {
            id: Uuid::new_v4(),
            title: "Test Quest".to_string(),
            description: "A test quest".to_string(),
            reward_xp: 100,
            status: "active".to_string(),
        }
    }

    pub fn title(mut self, title: impl Into<String>) -> Self {
        self.title = title.into();
        self
    }

    pub fn reward_xp(mut self, xp: i32) -> Self {
        self.reward_xp = xp;
        self
    }

    pub fn build(self) -> Quest {
        Quest {
            id: self.id,
            title: self.title,
            description: self.description,
            reward_xp: self.reward_xp,
            status: self.status,
            created_at: Utc::now(),
        }
    }
}

impl Default for QuestBuilder {
    fn default() -> Self {
        Self::new()
    }
}

/// Test fixture helper - creates complete test data set
pub struct TestFixtures;

impl TestFixtures {
    /// Create a test user with all defaults
    pub fn user() -> UserProfile {
        UserBuilder::new().build()
    }

    /// Create a test user with custom email
    pub fn user_with_email(email: &str) -> UserProfile {
        UserBuilder::new().email(email).build()
    }

    /// Create a verified test user
    pub fn verified_user() -> UserProfile {
        UserBuilder::new().verified(true).build()
    }

    /// Create multiple test users
    pub fn users(count: usize) -> Vec<UserProfile> {
        (0..count).map(|_| UserBuilder::new().build()).collect()
    }

    /// Create a test habit
    pub fn habit(user_id: Uuid) -> Habit {
        HabitBuilder::new(user_id).build()
    }

    /// Create multiple test habits
    pub fn habits(user_id: Uuid, count: usize) -> Vec<Habit> {
        (0..count)
            .map(|i| {
                HabitBuilder::new(user_id)
                    .name(format!("Habit {}", i))
                    .build()
            })
            .collect()
    }

    /// Create a test quest
    pub fn quest() -> Quest {
        QuestBuilder::new().build()
    }

    /// Create multiple test quests
    pub fn quests(count: usize) -> Vec<Quest> {
        (0..count).map(|i| {
            QuestBuilder::new()
                .title(format!("Quest {}", i))
                .reward_xp(50 + (i as i32) * 10)
                .build()
        }).collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_user_builder_defaults() {
        let user = UserBuilder::new().build();
        assert!(!user.email.is_empty());
        assert!(!user.username.is_empty());
        assert!(!user.verified);
        assert_eq!(user.level, 1);
    }

    #[test]
    fn test_user_builder_custom() {
        let user = UserBuilder::new()
            .email("custom@test.com")
            .username("customuser")
            .verified(true)
            .build();

        assert_eq!(user.email, "custom@test.com");
        assert_eq!(user.username, "customuser");
        assert!(user.verified);
    }

    #[test]
    fn test_habit_builder() {
        let user_id = Uuid::new_v4();
        let habit = HabitBuilder::new(user_id)
            .name("Morning Exercise")
            .frequency("daily")
            .target(30)
            .build();

        assert_eq!(habit.user_id, user_id);
        assert_eq!(habit.name, "Morning Exercise");
        assert_eq!(habit.target, 30);
    }

    #[test]
    fn test_quest_builder() {
        let quest = QuestBuilder::new()
            .title("Complete 5 Habits")
            .reward_xp(250)
            .build();

        assert_eq!(quest.title, "Complete 5 Habits");
        assert_eq!(quest.reward_xp, 250);
    }

    #[test]
    fn test_fixtures_batch_creation() {
        let users = TestFixtures::users(5);
        assert_eq!(users.len(), 5);
        assert!(users.iter().all(|u| !u.email.is_empty()));

        let user_id = users[0].id;
        let habits = TestFixtures::habits(user_id, 3);
        assert_eq!(habits.len(), 3);
        assert!(habits.iter().all(|h| h.user_id == user_id));
    }
}
