/**
 * Analytics Event Tracking
 *
 * Provides centralized event tracking, batching, and metrics collection
 * for application usage analytics and monitoring.
 */

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::time::{SystemTime, UNIX_EPOCH};

/// Event metadata and tracking information
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AnalyticsEvent {
    pub event_type: String,
    pub user_id: Option<String>,
    pub session_id: String,
    pub timestamp: u64,
    pub properties: HashMap<String, String>,
}

impl AnalyticsEvent {
    /// Create new analytics event
    pub fn new(event_type: impl Into<String>, session_id: impl Into<String>) -> Self {
        Self {
            event_type: event_type.into(),
            user_id: None,
            session_id: session_id.into(),
            timestamp: SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs(),
            properties: HashMap::new(),
        }
    }

    /// Set user ID
    pub fn with_user(mut self, user_id: impl Into<String>) -> Self {
        self.user_id = Some(user_id.into());
        self
    }

    /// Add event property
    pub fn with_property(mut self, key: impl Into<String>, value: impl Into<String>) -> Self {
        self.properties.insert(key.into(), value.into());
        self
    }

    /// Add multiple properties
    pub fn with_properties(mut self, props: HashMap<String, String>) -> Self {
        self.properties.extend(props);
        self
    }
}

/// Event tracking metrics
#[derive(Clone, Debug, Default)]
pub struct EventMetrics {
    pub events_tracked: u64,
    pub events_batched: u64,
    pub batches_sent: u64,
    pub failed_sends: u64,
}

/// Analytics event tracker with batching
pub struct EventTracker {
    events: Vec<AnalyticsEvent>,
    batch_size: usize,
    metrics: EventMetrics,
}

impl EventTracker {
    /// Create new event tracker
    pub fn new(batch_size: usize) -> Self {
        Self {
            events: Vec::new(),
            batch_size,
            metrics: EventMetrics::default(),
        }
    }

    /// Track an event
    pub fn track(&mut self, event: AnalyticsEvent) {
        self.events.push(event);
        self.metrics.events_tracked += 1;
    }

    /// Check if batch is ready
    pub fn is_batch_ready(&self) -> bool {
        self.events.len() >= self.batch_size
    }

    /// Get current batch
    pub fn get_batch(&self) -> Vec<AnalyticsEvent> {
        self.events.clone()
    }

    /// Clear events and record batch
    pub fn flush_batch(&mut self) -> Vec<AnalyticsEvent> {
        let batch = std::mem::take(&mut self.events);
        self.metrics.events_batched += batch.len() as u64;
        self.metrics.batches_sent += 1;
        batch
    }

    /// Get metrics
    pub fn metrics(&self) -> &EventMetrics {
        &self.metrics
    }
}

/// Common event types
pub struct EventTypes;

impl EventTypes {
    pub const USER_LOGIN: &'static str = "user.login";
    pub const USER_LOGOUT: &'static str = "user.logout";
    pub const USER_SIGNUP: &'static str = "user.signup";
    pub const HABIT_CREATED: &'static str = "habit.created";
    pub const HABIT_COMPLETED: &'static str = "habit.completed";
    pub const QUEST_STARTED: &'static str = "quest.started";
    pub const QUEST_COMPLETED: &'static str = "quest.completed";
    pub const COINS_EARNED: &'static str = "coins.earned";
    pub const COINS_SPENT: &'static str = "coins.spent";
    pub const LEVEL_UP: &'static str = "level.up";
    pub const ACHIEVEMENT_UNLOCKED: &'static str = "achievement.unlocked";
    pub const PAGE_VIEW: &'static str = "page.view";
    pub const ERROR_OCCURRED: &'static str = "error.occurred";
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_analytics_event_creation() {
        let event = AnalyticsEvent::new("test.event", "session123");
        assert_eq!(event.event_type, "test.event");
        assert_eq!(event.session_id, "session123");
        assert!(event.timestamp > 0);
    }

    #[test]
    fn test_event_tracker_batching() {
        let mut tracker = EventTracker::new(3);
        
        for i in 0..5 {
            let event = AnalyticsEvent::new(format!("event{}", i), "session");
            tracker.track(event);
        }

        assert!(tracker.is_batch_ready());
        assert_eq!(tracker.metrics.events_tracked, 5);
    }

    #[test]
    fn test_event_properties() {
        let event = AnalyticsEvent::new("test", "session")
            .with_user("user123")
            .with_property("action", "click");
        
        assert_eq!(event.user_id, Some("user123".to_string()));
        assert_eq!(event.properties.get("action"), Some(&"click".to_string()));
    }
}
