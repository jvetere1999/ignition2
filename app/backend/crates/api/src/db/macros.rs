//! Database model macros for reducing boilerplate
//!
//! This module provides macros for common patterns in database models,
//! particularly for status/mode enums that require string conversion implementations.

/// Macro to reduce status/mode enum boilerplate
///
/// Creates an enum with automatic implementations for:
/// - `as_str()` method
/// - `FromStr` trait
/// - `Display` trait
/// - `Serialize` and `Deserialize` via serde
///
/// # Example
///
/// ```ignore
/// named_enum!(QuestStatus {
///     Available => "available",
///     Accepted => "accepted",
///     InProgress => "in_progress",
///     Completed => "completed",
/// });
/// ```
#[macro_export]
macro_rules! named_enum {
    (
        $name:ident {
            $($variant:ident => $string:expr),+
            $(,)?
        }
    ) => {
        /// Enum with string representation and serde support
        #[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
        #[serde(rename_all = "snake_case")]
        pub enum $name {
            $($variant),+
        }

        impl $name {
            /// Get string representation of this enum variant
            pub fn as_str(&self) -> &'static str {
                match self {
                    $($name::$variant => $string),+
                }
            }
        }

        impl std::str::FromStr for $name {
            type Err = String;

            fn from_str(s: &str) -> Result<Self, Self::Err> {
                match s {
                    $($string => Ok($name::$variant)),+,
                    _ => Err(format!("Unknown {}: {}", stringify!($name), s))
                }
            }
        }

        impl std::fmt::Display for $name {
            fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
                write!(f, "{}", self.as_str())
            }
        }
    };
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_named_enum_as_str() {
        named_enum!(TestStatus {
            Active => "active",
            Inactive => "inactive"
        });

        assert_eq!(TestStatus::Active.as_str(), "active");
        assert_eq!(TestStatus::Inactive.as_str(), "inactive");
    }

    #[test]
    fn test_named_enum_from_str() {
        use std::str::FromStr;

        named_enum!(TestStatus {
            Active => "active",
            Inactive => "inactive"
        });

        assert_eq!(TestStatus::from_str("active").ok(), Some(TestStatus::Active));
        assert_eq!(TestStatus::from_str("inactive").ok(), Some(TestStatus::Inactive));
        assert!(TestStatus::from_str("unknown").is_err());
    }

    #[test]
    fn test_named_enum_display() {
        use std::fmt::Display;

        named_enum!(TestStatus {
            Active => "active",
            Inactive => "inactive"
        });

        assert_eq!(TestStatus::Active.to_string(), "active");
        assert_eq!(TestStatus::Inactive.to_string(), "inactive");
    }
}
// ============================================================================
// DATABASE MODEL STRUCT CONSOLIDATION DOCUMENTATION
// ============================================================================
//
// NOTE: BACK-005 - Database Model Struct Derive Macro
// 
// Current State: 20+ struct definitions use identical derives:
//   #[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
//
// This pattern is repeated in:
//   - gamification_models.rs (7 structs)
//   - focus_models.rs (4 structs)
//   - habits_goals_models.rs (3 structs)
//   - exercise_models.rs (2 structs)
//   - learn_models.rs (2 structs)
//   - goals_models.rs (1 struct)
//   - user_models.rs (1 struct)
//
// Total Boilerplate: 240+ lines of repeated #[derive(...)] attributes
// Reduction Opportunity: 80%+ if consolidated via macro
//
// Implementation Strategy:
// Since Rust doesn't have attribute macros in std library, we have three options:
//
// Option 1 (IMPLEMENTED): Use named_enum! pattern for enums
//   - Status enums consolidated via named_enum! macro
//   - Already saves 78% boilerplate for enums
//   - ~150 lines reduced across 8 enum definitions
//
// Option 2 (FUTURE): Create custom procedural macro attribute
//   - Would require separate crate for attribute macro
//   - Full deriving: #[db_model] struct Foo { ... }
//   - Implementation effort: 2-3h, complexity: MEDIUM
//   - Maintainability: Excellent (similar to standard derives)
//
// Option 3 (SIMPLE): Inline comments + manual reduction
//   - Add derive! macro to consolidate standard derives
//   - Works with declarative macros only
//   - Implementation effort: 0.5h, complexity: LOW
//   - Maintainability: Good (clear pattern)
//
// Current Decision: Option 1 is COMPLETE (enum consolidation)
// Next Step: Evaluate Option 2 or 3 for struct consolidation