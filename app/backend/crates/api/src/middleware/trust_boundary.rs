//! Trust Boundary Markers for E2EE & Cryptographic Code
//!
//! This module provides markers to annotate code according to trust boundaries:
//! - `server_trusted`: Business logic executed server-side; can read plaintext user data
//! - `client_private`: Cryptographic operations; client-side only, never transmits plaintext across boundary
//! - `e2ee_boundary`: Data flows in/out of encryption; requires validation & audit logging
//!
//! These markers are used by the trust-boundary-linter CI check to ensure no unmarked
//! cryptographic functions are merged. They serve as documentation and enforce a clear
//! security perimeter.
//!
//! # Examples
//!
//! ```ignore
//! // Server-side business logic - can work with plaintext
//! #[server_trusted]
//! async fn get_user_vault(pool: &PgPool, user_id: Uuid) -> Result<Vault, Error> {
//!     sqlx::query_as("SELECT * FROM vaults WHERE user_id = $1")
//!         .bind(user_id)
//!         .fetch_one(pool)
//!         .await
//! }
//!
//! // Client-side crypto - never transmits plaintext
//! #[client_private]
//! fn derive_vault_key(passphrase: &str, salt: &[u8]) -> Vec<u8> {
//!     // PBKDF2 or similar
//! }
//!
//! // E2EE boundary - data crossing encryption/decryption
//! #[e2ee_boundary]
//! async fn decrypt_vault_content(state: &AppState, ...) -> Result<PlaintextContent, Error> {
//!     // Verify signature, decrypt, validate plaintext structure
//! }
//! ```

/// Marker for server-side business logic that can work with plaintext user data
///
/// Use this to mark functions that:
/// - Execute on the server (not client)
/// - Can safely read plaintext without transmitting it (database queries)
/// - Perform business logic, not cryptography
///
/// Functions marked with `#[server_trusted]` are allowed to:
/// - Log non-sensitive data
/// - Work with plaintext temporarily
/// - Call database queries
///
/// DO NOT use for cryptographic operations - use `#[client_private]` or `#[e2ee_boundary]` instead.
#[macro_export]
macro_rules! server_trusted {
    () => {
        // Marker macro - expands to nothing at compile time
        // Used by trust-boundary-linter for static analysis
    };
}

/// Marker for client-side cryptographic operations
///
/// Use this to mark functions that:
/// - Perform encryption, decryption, key derivation
/// - NEVER transmit plaintext or keys across the network
/// - Execute only on the client (or in E2EE-safe server code)
///
/// Functions marked with `#[client_private]` must:
/// - Never log plaintext, ciphertext, or key material
/// - Always return either ciphertext or derived keys, never plaintext
/// - Use constant-time operations where possible
/// - Have peer-reviewed crypto implementation
///
/// Example: PBKDF2 key derivation, AES-256-GCM encryption, bcrypt password hashing
#[macro_export]
macro_rules! client_private {
    () => {
        // Marker macro - expands to nothing at compile time
        // Used by trust-boundary-linter for static analysis
    };
}

/// Marker for E2EE data boundary crossings
///
/// Use this to mark functions that:
/// - Decrypt data (plaintext enters server boundary)
/// - Validate decrypted data structure & integrity
/// - Perform business logic on decrypted data
/// - Encrypt data (plaintext leaves server boundary)
///
/// Functions marked with `#[e2ee_boundary]` must:
/// - Validate all inputs (format, size, signature)
/// - Audit log the operation (what was decrypted, by whom, when)
/// - Never leak plaintext to external logs or services
/// - Use consistent error messages (don't reveal decryption failure reason)
///
/// E2EE boundary functions are the most security-critical and require:
/// - Code review by two crypto-aware reviewers
/// - Security audit before deployment
/// - E2E test coverage
/// - Telemetry monitoring (decrypt failures, validation errors)
#[macro_export]
macro_rules! e2ee_boundary {
    () => {
        // Marker macro - expands to nothing at compile time
        // Used by trust-boundary-linter for static analysis
    };
}

#[cfg(test)]
mod tests {
    #[test]
    fn test_trust_boundary_markers_compile() {
        // Verify macros expand correctly (no-op at compile time)
        server_trusted!();
        client_private!();
        e2ee_boundary!();
    }
}
