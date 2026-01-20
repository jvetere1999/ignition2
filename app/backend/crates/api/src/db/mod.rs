//! Database module
//!
//! Contains models and repositories for database operations.
//!
//! ## Architecture
//!
//! - `core`: Centralized database utilities with observability
//! - `*_models`: Database entity structs (FromRow)
//! - `*_repos`: Repository pattern for CRUD operations
//!
//! ## Import Conventions
//!
//! See [IMPORT_CONVENTIONS.md](../../IMPORT_CONVENTIONS.md) for module import standards.

// PUBLIC MODULES - Core utilities
pub mod core; // Centralized DB utilities with observability
pub mod defaults; // Centralized default values for request types
pub mod macros; // Boilerplate reduction macros for common patterns

// PUBLIC MODULES - Domain-specific models and repositories
pub mod admin_models;
pub mod admin_repos;
pub mod authenticator_models;
pub mod authenticator_repos;
pub mod books_models;
pub mod books_repos;
pub mod crypto_policy_models;
pub mod crypto_policy_repos;
pub mod daw_project_models;
pub mod daw_project_repos;
pub mod exercise_models;
pub mod exercise_repos;
pub mod focus_models;
pub mod focus_repos;
pub mod frames_models;
pub mod frames_repos;
pub mod gamification_models;
pub mod gamification_repos;
#[allow(dead_code)]
pub mod generated; // Schema-generated types - source of truth
pub mod habits_goals_models;
pub mod habits_goals_repos;
pub mod inbox_models;
pub mod inbox_repos;
pub mod learn_models;
pub mod learn_repos;
pub mod market_models;
pub mod market_repos;
pub mod models;
pub mod oauth_models;
pub mod oauth_repos;
pub mod platform_models;
pub mod platform_repos;
pub mod privacy_modes_models;
pub mod privacy_modes_repos;
pub mod quests_models;
pub mod quests_repos;
pub mod recovery_codes_models;
pub mod recovery_codes_repos;
pub mod reference_models;
pub mod reference_repos;
pub mod references_models;
pub mod references_repos;
pub mod repos;
pub mod search_models;
pub mod search_repos;
pub mod template_models;
pub mod template_repos;
pub mod vault_models;
pub mod vault_repos;

// RE-EXPORTS: Convenience for route handlers and services
pub use core::{db_error, QueryContext};
