# Trust Boundaries — Architectural Security Boundaries for E2EE

**Document Version:** 1.0  
**Created:** January 18, 2026  
**Status:** Active

---

## Overview

Trust boundaries are security perimeters that separate code according to its role in the encryption/decryption process. They are enforced via:

1. **Code Markers** — Annotations in source code (`server_trusted()`, `client_private()`, `e2ee_boundary()`)
2. **CI Linter** — GitHub Actions workflow that prevents merging unmarked crypto code
3. **Security Reviews** — Mandatory peer review for E2EE boundary crossings
4. **Documentation** — This guide + inline code comments

---

## The Three Trust Boundaries

### 1. `server_trusted` — Server-Side Business Logic

**Definition:** Functions that execute on the server and can work with plaintext data, but don't perform cryptography.

**Allowed:**
- Database queries (SELECT/INSERT/UPDATE)
- Business logic (validation, transformations)
- API parameter processing
- Audit logging

**NOT Allowed:**
- Cryptographic operations
- Logging plaintext from encrypted sources
- Storing plaintext in cache or database

**Example:**
```rust
/// Lock user's vault with specified reason
///
/// # Trust Boundary
/// server_trusted() - Server-side business logic (no crypto)
async fn lock_vault(
    State(state): State<Arc<AppState>>,
    Extension(auth): Extension<AuthContext>,
    Json(req): Json<LockVaultRequest>,
) -> Result<(StatusCode, Json<serde_json::Value>), AppError> {
    // ...
    VaultRepo::lock_vault(&state.db, auth.user_id, reason).await?;
    Ok((StatusCode::OK, Json(json!({"message": "Vault locked"}))))
}
```

**When to Use:**
- API handlers that manage vault state (lock/unlock)
- Queries that return encrypted content (don't decrypt)
- Business logic that validates user input
- Anything that doesn't touch plaintext or keys

---

### 2. `client_private` — Client-Side Cryptographic Operations

**Definition:** Functions that perform encryption, decryption, key derivation, hashing, or signing. Must NEVER transmit plaintext or key material across the network boundary.

**Allowed:**
- Encryption/decryption
- Key derivation (PBKDF2, Argon2)
- Password hashing (bcrypt, scrypt)
- Digital signatures
- Constant-time comparisons

**NOT Allowed:**
- Logging plaintext, ciphertext, or keys (not even hashes of keys)
- Transmitting plaintext to server
- Storing plaintext temporarily where it could be logged
- Using non-cryptographic randomness for keys

**Example:**
```rust
/// Unlock user's vault with passphrase verification
///
/// # Trust Boundary
/// e2ee_boundary() - Passphrase verification (crypto crossing)
async fn unlock_vault(
    State(state): State<Arc<AppState>>,
    Extension(auth): Extension<AuthContext>,
    Json(req): Json<UnlockVaultRequest>,
) -> Result<(StatusCode, Json<UnlockVaultResponse>), AppError> {
    let vault = VaultRepo::get_by_user_id(&state.db, auth.user_id).await?;

    // Verify passphrase using bcrypt (CRITICAL: constant-time comparison)
    let passphrase_valid = bcrypt::verify(&req.passphrase, &vault.passphrase_hash)?;
    
    if !passphrase_valid {
        // Generic error - don't reveal whether vault exists
        return Err(AppError::Unauthorized("Invalid passphrase".to_string()));
    }
    
    VaultRepo::unlock_vault(&state.db, auth.user_id).await?;
    Ok((StatusCode::OK, Json(UnlockVaultResponse { ... })))
}
```

**When to Use:**
- Password verification (bcrypt.verify)
- Key derivation from user input
- Encryption/decryption of content
- Signing/verification operations
- Any function with "encrypt", "decrypt", "hash", "sign" in its name

---

### 3. `e2ee_boundary` — E2EE Data Boundary Crossings

**Definition:** Functions that cross the E2EE boundary — where plaintext enters or leaves the encrypted domain. The most security-critical category.

**Examples of Boundary Crossings:**
1. **Decryption** — Ciphertext enters the function, plaintext exits
2. **Encryption** — Plaintext enters the function, ciphertext exits
3. **Passphrase Verification** — Plaintext passphrase enters, result of verification exits

**Requirements:**
- Mandatory code review by 2 crypto-aware developers
- Security audit before deployment
- E2E test coverage (verify correct behavior)
- Audit logging (what was encrypted/decrypted, by whom, when)
- Telemetry monitoring (track failures, anomalies)
- Consistent error messages (don't leak decryption failure reason)

**Allowed:**
- Decrypt data
- Validate decrypted data structure
- Perform business logic on decrypted data
- Encrypt data
- Return ciphertext or validation result

**NOT Allowed:**
- Log plaintext or decryption keys
- Leak information about decryption failure (use generic error message)
- Store plaintext in temporary variables that could be logged
- Use non-constant-time comparisons (timing attacks)

**Example:**
```rust
/// Reset vault passphrase using recovery code
///
/// # Trust Boundary
/// e2ee_boundary() - Crosses E2EE boundary:
/// 1. Accepts plaintext new passphrase (from unauthenticated user via recovery code)
/// 2. Validates recovery code (single-use, not expired)
/// 3. Hashes new passphrase with bcrypt
/// 4. Updates vault state atomically
/// 5. Audit logs the operation
async fn reset_passphrase_with_code(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<ResetPassphraseRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    // Validate code (security-critical)
    let recovery_code = RecoveryCodesRepo::validate_and_use_code(&state.db, &payload.code)
        .await?
        .ok_or_else(|| AppError::BadRequest("Invalid or already used recovery code".to_string()))?;

    // Hash new passphrase (bcrypt cost 12, constant-time)
    let hashed = bcrypt::hash(&payload.new_passphrase, 12)?;

    // Update vault with new hash (atomic transaction)
    VaultRepo::update_passphrase_hash(&state.db, recovery_code.vault_id, &hashed).await?;

    // Audit log (includes vault_id, recovery_code_id, timestamp)
    tracing::warn!(
        vault_id = %recovery_code.vault_id,
        recovery_code_id = %recovery_code.id,
        "Vault passphrase reset via recovery code"
    );

    Ok(Json(json!({"message": "Passphrase reset successfully"})))
}
```

**When to Use:**
- Passphrase or PIN verification
- Decryption of encrypted content
- Encryption of plaintext before storage
- Recovery flows (recovery codes, backup restores)
- Any function where plaintext enters or exits

---

## Trust Boundary Marker Syntax

### In Rust Code

Use comment markers before the function definition:

```rust
// server_trusted - Server-side business logic
async fn get_user_vault(pool: &PgPool, user_id: Uuid) -> Result<Vault> {
    // ...
}

// client_private - Client-side crypto
fn derive_key(passphrase: &str, salt: &[u8]) -> Vec<u8> {
    // ...
}

// e2ee_boundary - E2EE boundary (decrypt/encrypt)
async fn unlock_vault(state: &AppState, ...) -> Result<UnlockResponse> {
    // ...
}
```

### In CI/CD

The trust-boundary-linter scans for these markers and fails the build if cryptographic functions are found without them.

**To pass the linter:**
- Add a comment like `// server_trusted`, `// client_private`, or `// e2ee_boundary` before the function
- The linter will verify that all functions matching crypto patterns have markers

**To run locally:**
```bash
chmod +x scripts/trust-boundary-linter.sh
scripts/trust-boundary-linter.sh
```

---

## Security Guidelines by Boundary

### `server_trusted` Functions

1. **Can work with plaintext** — Database columns, API parameters
2. **Cannot perform crypto** — No encryption, decryption, or hashing
3. **Log freely** — Non-sensitive data can be logged
4. **Test coverage** — Standard unit test coverage

### `client_private` Functions

1. **Must use secure randomness** — `rand::thread_rng()` or OS randomness
2. **Constant-time operations** — Use `bcrypt::verify`, not string comparison
3. **Never log plaintext/keys** — Strip sensitive data before logging
4. **No timing attacks** — Don't reveal operation timing via error messages

### `e2ee_boundary` Functions

1. **Peer review** — Must be reviewed by 2+ cryptography-aware developers
2. **Security audit** — Formal review before merging to main
3. **E2E tests** — Test complete flow with real encryption
4. **Audit logging** — Log who, when, and what (not plaintext content)
5. **Error consistency** — Generic error messages (don't leak decryption failure)
6. **Monitoring** — Alert on unusually high failure rates

---

## Compliance Checklist

### Before Committing Crypto Code

- [ ] Marked with correct trust boundary (`server_trusted`, `client_private`, or `e2ee_boundary`)
- [ ] Linter passes locally: `scripts/trust-boundary-linter.sh`
- [ ] No plaintext logged (check `tracing::` calls)
- [ ] No credentials in error messages (generic errors only)
- [ ] Constant-time comparisons used (bcrypt, not `==`)

### Before Merging E2EE Code

- [ ] Peer review by 2+ crypto developers ✓
- [ ] E2E test added (full flow tested)
- [ ] Audit logging added
- [ ] Security audit completed
- [ ] No regressions vs. baseline
- [ ] Telemetry set up for monitoring

### Before Deploying to Production

- [ ] All tests passing
- [ ] No linter errors
- [ ] Security audit sign-off
- [ ] Staging deployment validated
- [ ] Rollback plan documented

---

## Examples by Use Case

### Use Case 1: User Logs In

```
Client sends: email, password
Server (server_trusted): Fetch user record from DB ✓
Server (e2ee_boundary): Verify password with bcrypt ✓
Server (server_trusted): Create session token ✓
Server (server_trusted): Log "User X logged in" (no password) ✓
```

### Use Case 2: User Unlocks Vault

```
Client sends: passphrase
Server (e2ee_boundary): Verify passphrase with bcrypt ✓
Server (e2ee_boundary): Mark vault as unlocked ✓
Server (server_trusted): Return vault state ✓
Client: Decrypt vault content locally (client_private) ✓
```

### Use Case 3: User Resets Passphrase via Recovery Code

```
Client sends: recovery_code, new_passphrase
Server (e2ee_boundary): Validate recovery code (single-use) ✓
Server (e2ee_boundary): Hash new passphrase with bcrypt ✓
Server (e2ee_boundary): Update vault passphrase hash ✓
Server (server_trusted): Mark recovery code as used ✓
Server (server_trusted): Audit log "Passphrase reset" (no secrets) ✓
```

---

## Troubleshooting

### Linter Reports "UNMARKED CRYPTO: fn signout"

The function name contains a crypto pattern but isn't actually cryptographic. Add a comment to suppress:

```rust
// server_trusted - Just clearing session (not crypto)
async fn signout(...) { ... }
```

### Linter Fails but I Don't See Error Details

Run with debug output:
```bash
bash -x scripts/trust-boundary-linter.sh 2>&1 | tail -100
```

### How Do I Know If My Function Crosses an E2EE Boundary?

Ask these questions:
1. Does plaintext come in? (user password, vault content)
2. Does plaintext go out? (decrypted value, verification result)
3. Do I perform crypto operations? (bcrypt, AES, PBKDF2)
4. Could this expose sensitive data if misconfigured?

If YES to any, it's probably `e2ee_boundary`.

---

## References

- [DEBUGGING.md](../DEBUGGING.md) — Implementation plan
- [Architecture Guide](../ARCHITECTURE.md) — System design
- [Vault Model](app/backend/crates/api/src/db/vault_models.rs) — Vault data structures
- [Recovery Codes](app/backend/crates/api/src/routes/vault_recovery.rs) — Recovery code implementation

---

**Document:** `docs/architecture/trust-boundaries.md`  
**Last Updated:** January 18, 2026  
**Status:** Active
