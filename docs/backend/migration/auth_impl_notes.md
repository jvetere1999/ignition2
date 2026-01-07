"Auth implementation notes for the Rust backend."

# Auth Implementation Notes

**Date:** January 6, 2026  
**Branch:** `refactor/stack-split`  
**Phase:** Auth/Session Implementation  
**Purpose:** Document auth/session/RBAC implementation details

---

## Overview

This document describes the authentication, session management, and RBAC implementation in the Rust backend.

---

## Decision Implementation

| Decision | Implementation |
|----------|----------------|
| DEC-001=A (Force re-auth) | Sessions table in Postgres; no D1 migration |
| DEC-002=A (Origin verification) | CSRF middleware checks Origin/Referer |
| DEC-004=B (DB-backed roles) | RBAC tables with roles, entitlements, user_roles |

---

## File Structure

```
app/backend/crates/api/src/
├── db/
│   ├── mod.rs           # Database module
│   ├── models.rs        # User, Session, Account, etc.
│   └── repos.rs         # UserRepo, SessionRepo, AccountRepo, etc.
├── services/
│   ├── mod.rs           # Services module
│   ├── auth.rs          # AuthService, DevBypassAuth
│   └── oauth.rs         # GoogleOAuth, AzureOAuth
├── middleware/
│   ├── auth.rs          # Session extraction, require_auth, require_admin
│   ├── csrf.rs          # Origin/Referer verification
│   └── cors.rs          # CORS configuration
├── routes/
│   └── auth.rs          # /auth/* endpoints
└── tests/
    └── auth_tests.rs    # Integration tests
```

---

## Cookie Strategy

Per copilot-instructions, session cookies use:

```
Set-Cookie: session=<token>; Domain=ecent.online; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=2592000
```

| Attribute | Value | Reason |
|-----------|-------|--------|
| Domain | `ecent.online` | Shared across subdomains |
| Path | `/` | All routes |
| HttpOnly | `true` | Prevent XSS access |
| Secure | `true` | Required for SameSite=None |
| SameSite | `None` | Cross-origin requests (frontend → API) |
| Max-Age | `2592000` | 30 days |

---

## OAuth Flow

### Providers

| Provider | Auth URL | Token URL | User Info |
|----------|----------|-----------|-----------|
| Google | accounts.google.com | oauth2.googleapis.com | openidconnect.googleapis.com |
| Azure | login.microsoftonline.com | login.microsoftonline.com | graph.microsoft.com |

### Flow Sequence

1. User clicks "Sign in with Google/Microsoft"
2. Frontend redirects to `/auth/signin/{provider}`
3. Backend generates PKCE challenge and state
4. Backend redirects to OAuth provider
5. User authenticates with provider
6. Provider redirects to `/auth/callback/{provider}?code=...&state=...`
7. Backend validates state, exchanges code for tokens
8. Backend fetches user info from provider
9. Backend creates/updates user and links account
10. Backend creates session and sets cookie
11. Backend redirects to `/today`

### Account Linking Policy

When authenticating:

1. **Account exists**: Use existing user, create session
2. **Email exists, no account**: Link new provider to existing user
3. **Neither exists**: Create new user and account

This allows users to sign in with either Google or Azure and access the same account if they use the same email.

---

## Session Management

### Session Lifecycle

| Event | Action |
|-------|--------|
| Login | Create new session with secure token |
| Request | Validate session, update `last_activity_at` |
| Privilege change | Rotate session token |
| Logout | Delete session |
| Expiry | Cleanup job deletes expired sessions |

### Session Rotation

Session token is rotated on:
- Age verification (COPPA compliance)
- TOS acceptance
- Role changes

This prevents session fixation attacks.

### Token Generation

Tokens are 32 bytes of cryptographically secure random data, base64url encoded:

```rust
use base64::Engine;
use rand::RngCore;

let mut bytes = [0u8; 32];
rand::thread_rng().fill_bytes(&mut bytes);
base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(bytes)
```

---

## CSRF Protection

### Implementation

Per DEC-002=A, CSRF uses Origin/Referer verification:

1. For POST/PUT/PATCH/DELETE requests:
   - Check Origin header against allowlist
   - If no Origin, check Referer header
   - Reject if neither matches
2. For GET/HEAD/OPTIONS: No CSRF check

### Allowed Origins

**Production:**
- `https://ignition.ecent.online`
- `https://admin.ignition.ecent.online`

**Development:**
- `http://localhost:3000`
- `http://localhost:3001`
- `http://127.0.0.1:3000`
- `http://127.0.0.1:3001`

---

## RBAC Implementation

### Tables

| Table | Purpose |
|-------|---------|
| `roles` | Role definitions (user, admin, moderator) |
| `entitlements` | Granular permissions |
| `role_entitlements` | Maps roles to entitlements |
| `user_roles` | Maps users to roles |

### Entitlements

| Entitlement | Description |
|-------------|-------------|
| `admin:access` | Access admin console |
| `admin:users` | Manage users |
| `admin:content` | Manage content |
| `admin:backup` | Create/restore backups |
| `users:read` | Read user profiles |
| `users:write` | Update user profiles |
| `quests:read` | Read quests |
| `quests:write` | Create/edit quests |
| `feedback:read` | Read feedback |
| `feedback:admin` | Manage feedback |

### Checking Entitlements

```rust
// In middleware
if !auth_context.has_entitlement("admin:access") {
    return Err(AppError::Forbidden);
}

// Using require_entitlement middleware
.layer(require_entitlement("admin:users"))
```

---

## Dev Bypass

For local development, auth can be bypassed when ALL conditions are met:

1. `AUTH_DEV_BYPASS=true` environment variable
2. `NODE_ENV=development`
3. Host is `localhost` or `127.0.0.1`

**Hard Fail:** Bypass is rejected in production/staging even if env var is set.

### Dev User

| Field | Value |
|-------|-------|
| ID | `00000000-0000-0000-0000-000000000001` |
| Email | `dev@localhost` |
| Name | `Local Dev User` |
| Role | `admin` |

---

## Audit Logging

Security events are logged to the `audit_log` table:

| Event Type | Description |
|------------|-------------|
| `login` | User logged in |
| `logout` | User logged out |
| `login_failed` | Failed login attempt |
| `session_rotated` | Session token was rotated |
| `user_created` | New user account created |
| `account_linked` | OAuth account linked to user |
| `role_change` | User role was changed |

---

## Test Coverage

### Unit Tests

| Test | Location |
|------|----------|
| Cookie format | `middleware/auth.rs` |
| Dev bypass logic | `middleware/auth.rs` |
| Safe methods check | `middleware/csrf.rs` |

### Integration Tests

| Test | File |
|------|------|
| Dev bypass rejected in production | `tests/auth_tests.rs` |
| Dev bypass rejected for non-localhost | `tests/auth_tests.rs` |
| Session cookie format | `tests/auth_tests.rs` |
| Logout cookie format | `tests/auth_tests.rs` |

### Playwright Tests (Planned)

1. **OAuth login flow (with dev bypass)**
   - Navigate to login page
   - Click provider button
   - Verify redirect and session cookie

2. **Session persistence**
   - Login
   - Refresh page
   - Verify still authenticated

3. **Admin access denied for non-admin**
   - Login as regular user
   - Navigate to /admin
   - Verify 403/redirect

4. **Real OAuth flow** (documented, manual verification)
   - Full Google OAuth flow
   - Full Azure OAuth flow

---

## Security Checklist

| Check | Status |
|-------|--------|
| HttpOnly cookies | ✅ |
| Secure cookies | ✅ |
| SameSite=None with CSRF | ✅ |
| CSRF Origin verification | ✅ |
| Session rotation | ✅ |
| Audit logging | ✅ |
| DB-backed RBAC | ✅ |
| Dev bypass guardrails | ✅ |
| PKCE for OAuth | ✅ |

---

## Pending Items

| Item | Status | Blocker |
|------|--------|---------|
| Real OAuth testing | Pending | LATER-004 (OAuth redirect URIs) |
| Azure Key Vault integration | Pending | LATER-002 |
| Redis for OAuth state | Pending | Currently using in-memory |
| Playwright e2e tests | Pending | Frontend API client integration |

---

## References

- [security_model.md](./security_model.md) - Security design
- [DECISIONS.md](./DECISIONS.md) - Migration decisions
- [local_dev_auth_bypass.md](./local_dev_auth_bypass.md) - Dev bypass spec
- [d1_usage_inventory.md](./d1_usage_inventory.md) - Source auth implementation

