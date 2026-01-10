"Security model for the split architecture. Based on chosen decisions."

# Security Model

**Date:** January 6, 2026  
**Branch:** `refactor/stack-split`  
**Phase:** 07 - Structure Plan  
**Source:** DECISIONS.md, auth_inventory.md, copilot-instructions.md

---

## Overview

This document defines the security model for the Rust backend and split frontend architecture. All decisions are based on owner-approved choices in DECISIONS.md.

---

## Decision Reference

| Decision | Chosen | Impact |
|----------|--------|--------|
| DEC-001 | **A** (Force re-auth) | No session migration; clean break at cutover |
| DEC-002 | **A** (Origin verification) | CSRF via Origin/Referer check |
| DEC-004 | **B** (DB-backed roles) | Admin role stored in users table |

---

## Cookie Strategy (Locked)

Per copilot-instructions:

| Attribute | Value | Reason |
|-----------|-------|--------|
| `Domain` | `ecent.online` | Shared across subdomains |
| `SameSite` | `None` | Cross-origin requests (frontend → API) |
| `Secure` | `true` | Required for SameSite=None |
| `HttpOnly` | `true` | Prevent XSS access |
| `Path` | `/` | All routes |
| `Max-Age` | `2592000` | 30 days |

### Session Cookie

```
Set-Cookie: session=<token>; Domain=ecent.online; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=2592000
```

---

## CSRF Protection (DEC-002=A)

Per DEC-002, CSRF protection uses strict Origin/Referer verification.

### Implementation Rules

**For state-changing methods (POST, PUT, PATCH, DELETE):**

1. **Origin header MUST exist** AND match allowlist:
   - `https://ignition.ecent.online`
   - `https://admin.ignition.ecent.online`
   - Local dev: `http://localhost:3000`, `http://localhost:3001`

2. **If Origin is missing**, fall back to Referer (same allowlist)

3. **If neither exists or matches**, reject with 403 Forbidden

**For safe methods (GET, HEAD, OPTIONS):**
- No CSRF check required
- Still apply auth/session rules

### Middleware Implementation

```rust
// app/backend/src/middleware/csrf.rs

pub async fn csrf_check(
    req: Request,
    next: Next,
) -> Result<Response, AppError> {
    // Skip CSRF for safe methods
    if req.method().is_safe() {
        return Ok(next.run(req).await);
    }
    
    let origin = req.headers().get("Origin");
    let referer = req.headers().get("Referer");
    
    let allowed = [
        "https://ignition.ecent.online",
        "https://admin.ignition.ecent.online",
        // Dev origins only in development mode
    ];
    
    let is_valid = origin
        .and_then(|o| o.to_str().ok())
        .map(|o| allowed.iter().any(|a| o.starts_with(a)))
        .unwrap_or_else(|| {
            // Fall back to Referer
            referer
                .and_then(|r| r.to_str().ok())
                .map(|r| allowed.iter().any(|a| r.starts_with(a)))
                .unwrap_or(false)
        });
    
    if !is_valid {
        return Err(AppError::CsrfViolation);
    }
    
    Ok(next.run(req).await)
}
```

---

## Session Management (DEC-001=A)

Per DEC-001, sessions are managed with force re-authentication at cutover.

### Session Table Schema

```sql
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_agent TEXT,
    ip_address TEXT
);

CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);
```

### Session Lifecycle

| Event | Action |
|-------|--------|
| Login | Create new session, rotate token |
| Request | Validate session, update `last_activity_at` |
| Privilege change | Rotate session token (fixation prevention) |
| Logout | Delete session |
| Expiry | Delete expired sessions (background job) |

### Session Rotation

Rotate session token on:
- Initial login
- OAuth re-authentication
- Role change (e.g., granted admin)

```rust
pub async fn rotate_session(session_id: Uuid, pool: &PgPool) -> Result<String, AppError> {
    let new_token = generate_secure_token();
    
    sqlx::query!(
        "UPDATE sessions SET token = $1, created_at = NOW() WHERE id = $2",
        new_token, session_id
    )
    .execute(pool)
    .await?;
    
    Ok(new_token)
}
```

---

## Authentication Flow

### OAuth Flow (Google/Azure)

```
┌─────────┐     ┌─────────────┐     ┌──────────┐     ┌──────────┐
│ Browser │     │  Frontend   │     │ Backend  │     │ Provider │
└────┬────┘     └──────┬──────┘     └────┬─────┘     └────┬─────┘
     │                 │                 │                │
     │ Click Login     │                 │                │
     ├────────────────►│                 │                │
     │                 │                 │                │
     │ Redirect to     │                 │                │
     │ /auth/login/google                │                │
     ├─────────────────────────────────►│                │
     │                 │                 │                │
     │                 │    302 to OAuth │                │
     │◄─────────────────────────────────┤                │
     │                 │                 │                │
     │ OAuth flow      │                 │                │
     ├─────────────────────────────────────────────────►│
     │                 │                 │                │
     │ Callback with code                │                │
     │◄────────────────────────────────────────────────┤
     │                 │                 │                │
     │ /auth/callback/google?code=...   │                │
     ├─────────────────────────────────►│                │
     │                 │                 │                │
     │                 │                 │ Exchange code  │
     │                 │                 ├───────────────►│
     │                 │                 │                │
     │                 │                 │ Tokens         │
     │                 │                 │◄───────────────┤
     │                 │                 │                │
     │ Set-Cookie: session=xxx          │                │
     │ Redirect to /today                │                │
     │◄─────────────────────────────────┤                │
     │                 │                 │                │
```

---

## Authorization (DEC-004=B)

Per DEC-004, admin authorization uses database-backed roles.

### User Table Schema

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    name TEXT,
    image TEXT,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    email_verified TIMESTAMPTZ,
    tos_accepted_at TIMESTAMPTZ,
    age_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Role Checking Middleware

```rust
pub fn require_role(required: UserRole) -> impl Fn(Request, Next) -> ... {
    move |req, next| async move {
        let user = req.extensions().get::<UserContext>()
            .ok_or(AppError::Unauthorized)?;
        
        if user.role < required {
            return Err(AppError::Forbidden);
        }
        
        next.run(req).await
    }
}

// Usage in route definition
.route("/admin/*", get(admin_handler).layer(require_role(UserRole::Admin)))
```

---

## Request Authentication Flow

```rust
pub async fn auth_middleware(
    mut req: Request,
    next: Next,
) -> Result<Response, AppError> {
    // Extract session cookie
    let session_token = req.headers()
        .get_all("Cookie")
        .iter()
        .find_map(|c| extract_session_cookie(c));
    
    let Some(token) = session_token else {
        return Err(AppError::Unauthorized);
    };
    
    // Validate session
    let session = sqlx::query_as!(Session,
        "SELECT * FROM sessions WHERE token = $1 AND expires_at > NOW()",
        token
    )
    .fetch_optional(&pool)
    .await?
    .ok_or(AppError::SessionExpired)?;
    
    // Load user with role
    let user = sqlx::query_as!(User,
        "SELECT * FROM users WHERE id = $1",
        session.user_id
    )
    .fetch_one(&pool)
    .await?;
    
    // Create user context
    let context = UserContext {
        user_id: user.id,
        email: user.email,
        role: user.role.parse()?,
        session_id: session.id,
    };
    
    // Attach to request
    req.extensions_mut().insert(context);
    
    // Update last activity
    sqlx::query!(
        "UPDATE sessions SET last_activity_at = NOW() WHERE id = $1",
        session.id
    )
    .execute(&pool)
    .await?;
    
    Ok(next.run(req).await)
}
```

---

## Secrets Management

Per copilot-instructions: Secrets via Azure Key Vault.

### Secret List

| Secret | Purpose | Environment |
|--------|---------|-------------|
| `DATABASE_URL` | PostgreSQL connection | All |
| `AUTH_SECRET` | Session signing | All |
| `GOOGLE_CLIENT_ID` | Google OAuth | All |
| `GOOGLE_CLIENT_SECRET` | Google OAuth | All |
| `AZURE_AD_CLIENT_ID` | Azure OAuth | All |
| `AZURE_AD_CLIENT_SECRET` | Azure OAuth | All |
| `AZURE_AD_TENANT_ID` | Azure OAuth | All |
| `R2_ACCESS_KEY_ID` | R2 S3 access | All |
| `R2_SECRET_ACCESS_KEY` | R2 S3 access | All |
| `R2_BUCKET_NAME` | R2 bucket | All |
| `R2_ENDPOINT` | R2 endpoint URL | All |

### Secret Loading

```rust
// app/backend/src/config.rs

pub struct Config {
    pub database_url: Secret<String>,
    pub auth_secret: Secret<String>,
    // ... other secrets
}

impl Config {
    pub async fn load() -> Result<Self, ConfigError> {
        // In production: load from Azure Key Vault
        // In development: load from environment
        
        if is_production() {
            Self::load_from_key_vault().await
        } else {
            Self::load_from_env()
        }
    }
}
```

---

## Local Dev Auth Bypass

Per `local_dev_auth_bypass.md`:

| Condition | Required Value |
|-----------|----------------|
| `AUTH_DEV_BYPASS` | `"true"` |
| `NODE_ENV` | `"development"` |
| Host | `localhost` or `127.0.0.1` |

**Hard fail:** If bypass is attempted in production, reject with 403 even if flag is set.

---

## Security Monitoring

### Audit Log Table

```sql
CREATE TABLE admin_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES users(id),
    action TEXT NOT NULL,
    target_type TEXT, -- 'user', 'quest', 'skill', etc.
    target_id UUID,
    details JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_admin ON admin_audit_log(admin_id);
CREATE INDEX idx_audit_action ON admin_audit_log(action);
CREATE INDEX idx_audit_created ON admin_audit_log(created_at);
```

### Logged Actions

| Action | Description |
|--------|-------------|
| `user.delete` | Admin deleted a user |
| `backup.create` | Admin created backup |
| `restore.execute` | Admin restored from backup |
| `quest.update` | Admin modified quest |
| `skill.update` | Admin modified skill |
| `content.update` | Admin modified content |

---

## Security Headers

| Header | Value |
|--------|-------|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `X-XSS-Protection` | `1; mode=block` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |

---

## References

- [DECISIONS.md](./DECISIONS.md) - DEC-001, DEC-002, DEC-004
- [auth_inventory.md](./auth_inventory.md) - Current auth implementation
- [local_dev_auth_bypass.md](./local_dev_auth_bypass.md) - Dev bypass spec
- [routing_and_domains.md](./routing_and_domains.md) - Domain configuration

