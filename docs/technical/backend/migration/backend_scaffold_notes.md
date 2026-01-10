"Backend scaffold implementation notes."

# Backend Scaffold Notes

**Date:** January 6, 2026  
**Branch:** `refactor/stack-split`  
**Phase:** 08 - Backend Scaffold

---

## Overview

This document captures implementation decisions and notes for the Rust backend scaffold.

---

## Technology Stack

| Component | Choice | Version | Rationale |
|-----------|--------|---------|-----------|
| Language | Rust | 1.83 | Stable, performant, memory-safe |
| Web Framework | Axum | 0.8 | Modern, Tower-based, ergonomic |
| Middleware | Tower | 0.5 | Composable, async, well-tested |
| Database | SQLx | 0.8 | Compile-time checked, async |
| S3 Client | aws-sdk-s3 | 1.65 | Official AWS SDK, R2 compatible |
| Serialization | Serde | 1.0 | De-facto standard |
| Async Runtime | Tokio | 1.42 | Industry standard |
| Logging | Tracing | 0.1 | Structured, spans, async-aware |

---

## Workspace Structure

```
app/backend/
├── Cargo.toml              # Workspace root
├── rust-toolchain.toml     # Rust version pinning
├── Dockerfile              # Production container
├── docker-compose.yml      # Local services
├── .env.example            # Environment template
└── crates/
    └── api/                # Main API binary
```

**Why single crate initially?**

Starting with a single `api` crate keeps the scaffold simple. Additional crates (e.g., `common`, `db-models`) can be extracted later when:
1. Code is duplicated across modules
2. Build times become a concern
3. Library extraction is needed

---

## Route Organization

Routes follow the pattern from `module_boundaries.md`:

```
/                    → API info
/health              → Health check (no auth)
/auth/*              → Authentication (OAuth stubs)
/api/*               → Business logic (requires auth)
/admin/*             → Admin features (requires admin role)
```

### Stub Strategy

All feature routes are stubs returning:
```json
{
  "data": [],
  "message": "Stub endpoint - feature migration pending"
}
```

This allows:
1. Frontend can test API connectivity
2. Route structure is validated
3. Middleware chains work correctly
4. No business logic to maintain until migration

---

## Middleware Stack

The middleware stack is applied in this order (bottom-to-top execution):

```
Request
  ↓
SetRequestIdLayer      # Generate X-Request-ID
  ↓
PropagateRequestIdLayer # Forward X-Request-ID
  ↓
TraceLayer             # Request logging
  ↓
CorsLayer              # CORS headers
  ↓
ExtractSession         # Parse session cookie
  ↓
CsrfCheck              # Verify Origin/Referer
  ↓
RequireAuth/Admin      # Authorization
  ↓
Handler
```

---

## Security Implementation

### Cookie Strategy

Per `security_model.md`:

```rust
format!(
    "session={}; Domain={}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age={}",
    token, domain, ttl_seconds
)
```

### CSRF Protection (DEC-002=A)

Implemented in `middleware/csrf.rs`:

1. Skip for safe methods (GET, HEAD, OPTIONS)
2. Check Origin header against allowlist
3. Fall back to Referer if Origin missing
4. Reject with 403 if neither matches

### Session Extraction

Implemented in `middleware/auth.rs`:

1. Extract `session` cookie
2. Look up in database (TODO)
3. Inject `AuthContext` into request extensions

### Role-Based Access (DEC-004=B)

Admin routes use `require_admin` middleware:

1. Check `AuthContext` present
2. Check `role == "admin"`
3. Reject with 403 if not admin

---

## Configuration

Configuration loaded via `config` crate with layering:

1. Defaults in code
2. `config/default.toml` (if exists)
3. `config/{environment}.toml` (if exists)
4. Environment variables (highest priority)

### Environment Variable Format

Nested config maps to `_` separated env vars:
- `server.port` → `SERVER_PORT`
- `auth.cookie_domain` → `AUTH_COOKIE_DOMAIN`

---

## Database

Using SQLx with PostgreSQL 17:

- Connection pool with configurable size
- Prepared statements (SQL injection safe)
- Compile-time query checking (when enabled)
- Async operations via Tokio

### Migration Strategy

Migrations will live in `app/database/` and be translated from D1 schema per `schema_exceptions.md`.

---

## Storage

Using AWS SDK S3 client for R2 compatibility:

- MinIO for local development
- Cloudflare R2 for production
- Signed URLs for frontend access

---

## Local Development

```bash
# Start services
docker compose up -d

# Copy environment
cp .env.example .env

# Run server
cargo run --package ignition-api
```

Server runs at `http://localhost:8080`.

---

## Testing Strategy

### Unit Tests

In-module tests for pure logic:
```rust
#[cfg(test)]
mod tests {
    use super::*;
    // ...
}
```

### Integration Tests

Using `axum-test` crate:
```rust
#[tokio::test]
async fn test_health_check() {
    let app = build_router(state);
    let response = app.get("/health").await;
    assert_eq!(response.status(), 200);
}
```

---

## Known Limitations (Scaffold Phase)

1. **OAuth not implemented** - Stubs only, waiting for LATER-004
2. **Database queries minimal** - Only health check
3. **No migrations** - Waiting for Phase 11
4. **No R2 integration** - Waiting for Phase 14
5. **Business logic missing** - Stubs only

---

## Next Steps

1. ✅ Scaffold complete
2. → Phase 11: Database migrations
3. → Phase 14: R2 integration
4. → Feature migration: Port business logic from Next.js API routes

---

## References

- [security_model.md](./security_model.md) - Security decisions
- [module_boundaries.md](./module_boundaries.md) - Module structure
- [api_endpoint_inventory.md](./api_endpoint_inventory.md) - Endpoints to port
- [DECISIONS.md](./DECISIONS.md) - Owner decisions
- [PHASE_GATE.md](./PHASE_GATE.md) - Phase status

