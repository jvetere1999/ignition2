//! Default values for database request types
//!
//! This module centralizes all default value functions used via `#[serde(default = "...")]`.
//! Consolidating defaults here provides:
//!
//! - **Single Source of Truth**: All defaults in one place
//! - **Consistency**: Easy to verify defaults match business logic
//! - **Discoverability**: One place to check what defaults exist
//! - **Maintenance**: Change defaults without searching multiple files
//!
//! # Usage
//!
//! In model structs, import and reference:
//!
//! ```ignore
//! use crate::db::defaults::*;
//!
//! #[derive(Debug, Deserialize)]
//! pub struct CreateFocusRequest {
//!     #[serde(default = "default_focus_mode")]
//!     pub mode: String,
//!
//!     #[serde(default = "default_focus_duration")]
//!     pub duration_seconds: i32,
//! }
//! ```
//!
//! # Defaults by Feature
//!
//! ## Focus Sessions
//! - `default_focus_mode()` → `"focus"` (25-minute pomodoro default)
//! - `default_focus_duration()` → `1500` seconds (25 minutes)
//!
//! ## Platform Events
//! - `default_event_type()` → `"custom"` (user-generated event)
//! - `default_priority()` → `"medium"` (for ideas, quests)
//! - `default_category()` → `"general"` (for feedback)
//! - `default_idea_category()` → `"general"` (for ideas)

// ============================================================================
// FOCUS SESSION DEFAULTS
// ============================================================================

/// Default focus mode: "focus" (standard Pomodoro work session)
///
/// Used in: CreateFocusRequest
/// Business Logic: Standard 25-minute focused work session
pub fn default_focus_mode() -> String {
    "focus".to_string()
}

/// Default focus duration: 1500 seconds (25 minutes)
///
/// Used in: CreateFocusRequest
/// Business Logic: Standard Pomodoro technique duration
/// Reference: https://en.wikipedia.org/wiki/Pomodoro_Technique
pub fn default_focus_duration() -> i32 {
    1500 // 25 minutes in seconds
}

// ============================================================================
// PLATFORM EVENT DEFAULTS
// ============================================================================

/// Default event type: "custom" (user-generated event)
///
/// Used in: CreateEventRequest
/// Business Logic: User can create custom platform events
/// Options: "quest_completed", "habit_completed", "achievement_earned", "custom"
pub fn default_event_type() -> String {
    "custom".to_string()
}

/// Default priority: "medium" (moderate importance)
///
/// Used in: CreateIdeaRequest, CreateQuestRequest
/// Business Logic: Mid-level priority for new items
/// Options: "low", "medium", "high"
pub fn default_priority() -> String {
    "medium".to_string()
}

/// Default feedback priority: "normal" (standard importance)
///
/// Used in: CreateFeedbackRequest
/// Business Logic: Standard priority for feedback
/// Options: "low", "normal", "high"
pub fn default_feedback_priority() -> String {
    "normal".to_string()
}

/// Default category: "general" (for feedback)
///
/// Used in: CreateFeedbackRequest
/// Business Logic: Uncategorized feedback by default
/// Options: "bug", "feature", "general", "performance"
pub fn default_category() -> String {
    "general".to_string()
}

/// Default infobase category: "Tips" (for knowledge articles)
///
/// Used in: CreateInfobaseEntryRequest
/// Business Logic: Knowledge articles start as tips
/// Options: "Tips", "How-to", "Concept", "Reference"
pub fn default_infobase_category() -> String {
    "Tips".to_string()
}

/// Default idea category: "general" (for ideas)
///
/// Used in: CreateIdeaRequest
/// Business Logic: Ideas start in general category
/// Options: "feature", "learning", "general", "workflow"
pub fn default_idea_category() -> String {
    "general".to_string()
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/// All valid focus modes
pub const VALID_FOCUS_MODES: &[&str] = &["focus", "break", "long_break"];

/// All valid priorities
pub const VALID_PRIORITIES: &[&str] = &["low", "medium", "high"];

/// All valid feedback categories
pub const VALID_CATEGORIES: &[&str] = &["bug", "feature", "general", "performance"];

/// All valid idea categories
pub const VALID_IDEA_CATEGORIES: &[&str] = &["feature", "learning", "general", "workflow"];

/// All valid platform event types
pub const VALID_EVENT_TYPES: &[&str] = &[
    "quest_completed",
    "habit_completed",
    "achievement_earned",
    "custom",
];

// ============================================================================
// CONSTANTS
// ============================================================================

/// Minimum focus duration: 60 seconds (1 minute)
pub const MIN_FOCUS_DURATION: i32 = 60;

/// Maximum focus duration: 3600 seconds (1 hour)
pub const MAX_FOCUS_DURATION: i32 = 3600;

/// Default break duration: 300 seconds (5 minutes)
pub const DEFAULT_BREAK_DURATION: i32 = 300;

/// Default long break duration: 900 seconds (15 minutes)
pub const DEFAULT_LONG_BREAK_DURATION: i32 = 900;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_focus_mode() {
        assert_eq!(default_focus_mode(), "focus");
    }

    #[test]
    fn test_default_focus_duration() {
        assert_eq!(default_focus_duration(), 1500);
        assert!(default_focus_duration() >= MIN_FOCUS_DURATION);
        assert!(default_focus_duration() <= MAX_FOCUS_DURATION);
    }

    #[test]
    fn test_default_event_type() {
        let event_type = default_event_type();
        assert!(VALID_EVENT_TYPES.contains(&event_type.as_str()));
    }

    #[test]
    fn test_default_priority() {
        let priority = default_priority();
        assert!(VALID_PRIORITIES.contains(&priority.as_str()));
    }

    #[test]
    fn test_default_category() {
        let category = default_category();
        assert!(VALID_CATEGORIES.contains(&category.as_str()));
    }

    #[test]
    fn test_default_idea_category() {
        let category = default_idea_category();
        assert!(VALID_IDEA_CATEGORIES.contains(&category.as_str()));
    }

    #[test]
    fn test_all_valid_modes() {
        assert!(VALID_FOCUS_MODES.contains(&default_focus_mode().as_str()));
    }
}
