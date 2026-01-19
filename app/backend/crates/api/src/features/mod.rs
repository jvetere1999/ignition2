/**
 * Feature Flags System
 *
 * Provides runtime feature flag configuration for gradual rollouts,
 * A/B testing, and feature management without redeployment.
 */

use std::collections::HashMap;

/// Feature flag configuration
#[derive(Clone, Debug)]
pub struct FeatureFlag {
    pub name: String,
    pub enabled: bool,
    pub rollout_percentage: u32, // 0-100
    pub user_whitelist: Vec<String>,
    pub user_blacklist: Vec<String>,
}

impl FeatureFlag {
    /// Create new feature flag
    pub fn new(name: impl Into<String>) -> Self {
        Self {
            name: name.into(),
            enabled: false,
            rollout_percentage: 0,
            user_whitelist: Vec::new(),
            user_blacklist: Vec::new(),
        }
    }

    /// Enable feature for all users
    pub fn fully_enabled(mut self) -> Self {
        self.enabled = true;
        self.rollout_percentage = 100;
        self
    }

    /// Set rollout percentage (gradual rollout)
    pub fn with_rollout(mut self, percentage: u32) -> Self {
        self.rollout_percentage = percentage.min(100);
        self.enabled = self.rollout_percentage > 0;
        self
    }

    /// Whitelist specific users
    pub fn with_whitelist(mut self, users: Vec<String>) -> Self {
        self.user_whitelist = users;
        self
    }

    /// Blacklist specific users
    pub fn with_blacklist(mut self, users: Vec<String>) -> Self {
        self.user_blacklist = users;
        self
    }

    /// Check if feature is enabled for user
    pub fn is_enabled_for_user(&self, user_id: &str) -> bool {
        // Blacklist takes precedence
        if self.user_blacklist.contains(&user_id.to_string()) {
            return false;
        }

        // Whitelist takes precedence
        if self.user_whitelist.contains(&user_id.to_string()) {
            return true;
        }

        // Check rollout percentage based on user ID hash
        if self.enabled {
            let hash = user_id.chars().fold(0u32, |acc, c| {
                acc.wrapping_mul(31).wrapping_add(c as u32)
            });
            return hash % 100 < self.rollout_percentage;
        }

        false
    }
}

/// Feature flags manager
pub struct FeatureFlagsManager {
    flags: HashMap<String, FeatureFlag>,
}

impl FeatureFlagsManager {
    /// Create new manager
    pub fn new() -> Self {
        Self {
            flags: HashMap::new(),
        }
    }

    /// Register feature flag
    pub fn register(&mut self, flag: FeatureFlag) {
        self.flags.insert(flag.name.clone(), flag);
    }

    /// Check if feature is enabled globally
    pub fn is_enabled(&self, feature_name: &str) -> bool {
        self.flags
            .get(feature_name)
            .map(|f| f.enabled)
            .unwrap_or(false)
    }

    /// Check if feature is enabled for user
    pub fn is_enabled_for_user(&self, feature_name: &str, user_id: &str) -> bool {
        self.flags
            .get(feature_name)
            .map(|f| f.is_enabled_for_user(user_id))
            .unwrap_or(false)
    }

    /// Get flag info
    pub fn get_flag(&self, feature_name: &str) -> Option<&FeatureFlag> {
        self.flags.get(feature_name)
    }

    /// Update flag
    pub fn update(&mut self, flag: FeatureFlag) {
        self.flags.insert(flag.name.clone(), flag);
    }
}

impl Default for FeatureFlagsManager {
    fn default() -> Self {
        Self::new()
    }
}

/// Common feature flags
pub struct Features;

impl Features {
    pub const NEW_DASHBOARD: &'static str = "new_dashboard";
    pub const ADVANCED_ANALYTICS: &'static str = "advanced_analytics";
    pub const BETA_UI: &'static str = "beta_ui";
    pub const EXPERIMENTAL_SYNC: &'static str = "experimental_sync";
    pub const MAINTENANCE_MODE: &'static str = "maintenance_mode";
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_feature_flag_creation() {
        let flag = FeatureFlag::new("test_feature").fully_enabled();
        assert_eq!(flag.name, "test_feature");
        assert!(flag.enabled);
        assert_eq!(flag.rollout_percentage, 100);
    }

    #[test]
    fn test_rollout_percentage() {
        let flag = FeatureFlag::new("rollout").with_rollout(50);
        assert!(flag.enabled);
        assert_eq!(flag.rollout_percentage, 50);
    }

    #[test]
    fn test_user_whitelist() {
        let flag = FeatureFlag::new("whitelist")
            .with_whitelist(vec!["user1".to_string(), "user2".to_string()]);
        
        assert!(flag.is_enabled_for_user("user1"));
        assert!(flag.is_enabled_for_user("user2"));
    }

    #[test]
    fn test_user_blacklist() {
        let flag = FeatureFlag::new("blacklist")
            .fully_enabled()
            .with_blacklist(vec!["user1".to_string()]);
        
        assert!(!flag.is_enabled_for_user("user1"));
    }

    #[test]
    fn test_manager() {
        let mut manager = FeatureFlagsManager::new();
        let flag = FeatureFlag::new("feature1").fully_enabled();
        
        manager.register(flag);
        assert!(manager.is_enabled("feature1"));
        assert!(!manager.is_enabled("feature2"));
    }
}
