//! Storage module
//!
//! Backend-only R2/S3 storage access.
//! Frontend never receives credentials - all access is through backend APIs.

pub mod client;
pub mod types;

pub use client::StorageClient;
pub use types::*;
