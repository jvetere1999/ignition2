//! Integration tests for the API
//!
//! These tests use the database and verify that multiple components work together.
//! Each test runs in its own transaction and is automatically rolled back.

pub mod auth_tests;
pub mod habits_tests;
pub mod quests_tests;
pub mod goals_tests;
pub mod gamification_tests;
pub mod storage_tests;
pub mod frames_tests;
pub mod focus_tests;
pub mod reference_tests;
pub mod template_tests;
