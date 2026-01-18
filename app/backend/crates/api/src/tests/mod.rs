//! Test modules
//!
//! Tests are organized by type:
//! - `integration/`: Database + endpoint tests (most tests)
//! - `unit/`: Isolated component tests (no database)
//! - `golden/`: Deterministic behavior tests

#[cfg(test)]
pub mod common;

#[cfg(test)]
pub mod integration;

#[cfg(test)]
pub mod unit;

#[cfg(test)]
pub mod golden;
