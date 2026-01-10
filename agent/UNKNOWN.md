# UNKNOWN.md — Unknown Facts Registry

**Created:** January 9, 2026  
**Purpose:** Track facts that could not be determined from codebase inspection

---

## Active Unknowns

### UNKNOWN-001: Production Database Host

| Attribute | Value |
|-----------|-------|
| **Question** | What PostgreSQL host is used in production? |
| **Options** | Neon.tech, Fly Postgres, Supabase, Railway, self-hosted |
| **Impact** | Connection behavior, pooling, SSL requirements, search_path defaults |
| **Where Looked** |
| - `app/backend/fly.toml` — Only env vars, no secrets |
| - `app/backend/.env.example` — Template only |
| - `deploy/production/.env.example` — Template only |
| - `docs/deploy/CLOUDFLARE_CONTAINERS_TROUBLESHOOTING.md` — Mentions Neon as option |
| - `deploy/README.md` — References `flyctl secrets set DATABASE_URL` |
| **Evidence** | `DATABASE_URL` is a Fly.io secret, not in codebase |
| **Resolution Required** | Check Fly.io dashboard or ask maintainer |

---

### UNKNOWN-002: Current Migration State in Production

| Attribute | Value |
|-----------|-------|
| **Question** | What is the current schema version in production? |
| **Impact** | Determines if recent migrations have been applied |
| **Where Looked** |
| - No access to production database |
| - Migrations run on startup per `state.rs` |
| **Evidence** | `_sqlx_migrations` table tracks applied versions |
| **Resolution Required** | Query production: `SELECT version FROM _sqlx_migrations ORDER BY version DESC LIMIT 1;` |

---

### UNKNOWN-003: Migration Application Success

| Attribute | Value |
|-----------|-------|
| **Question** | Have all 14 substrate migrations (0001-0014) been successfully applied? |
| **Impact** | Missing migrations = missing tables = 500 errors |
| **Where Looked** |
| - `app/backend/migrations/` — 14 `.sql` files exist |
| - `app/backend/crates/api/src/state.rs` — Migrations run on startup |
| **Evidence** | Startup logs would show "Applied X new migration(s)" or errors |
| **Resolution Required** | Check Fly.io logs: `fly logs --app ignition-api` |

---

### UNKNOWN-004: Error Logs from Recent Runtime Errors

| Attribute | Value |
|-----------|-------|
| **Question** | What specific DB error messages are occurring in production? |
| **Impact** | Need exact error text to diagnose (e.g., "relation does not exist", "column not found") |
| **Where Looked** |
| - No access to production logs |
| - `docs/SCHEMA_DIFF_REPORT.md` — Historical D1 errors (obsolete) |
| **Evidence** | Error mapping in `error.rs` logs via `tracing::error!` |
| **Resolution Required** | `fly logs --app ignition-api | grep -i error` |

---

### UNKNOWN-005: Fly.io Database Attachment

| Attribute | Value |
|-----------|-------|
| **Question** | Is Fly Postgres attached to the app, or is an external DB used? |
| **Impact** | Fly Postgres has specific connection string format; external requires public access |
| **Where Looked** |
| - `fly.toml` — No `[postgres]` block |
| - `deploy/README.md` — Mentions both Fly Postgres and external options |
| **Evidence** | No `fly.toml` attachment config |
| **Resolution Required** | `fly postgres list --app ignition-api` or check dashboard |

---

### UNKNOWN-006: R2 Storage Configuration in Production

| Attribute | Value |
|-----------|-------|
| **Question** | Are R2 storage secrets properly configured in production? |
| **Impact** | Storage operations would fail if misconfigured |
| **Where Looked** |
| - `app/backend/crates/api/src/state.rs#L73-L84` — Storage is optional, logs warning if unavailable |
| **Evidence** | Code handles missing storage gracefully |
| **Resolution Required** | Check Fly.io secrets: `fly secrets list --app ignition-api` |

---

## Resolved Unknowns

(None yet)

---

## How to Resolve

1. **For UNKNOWN-001, UNKNOWN-005:** Check Fly.io dashboard or run `fly secrets list`
2. **For UNKNOWN-002, UNKNOWN-003:** Query production DB or check startup logs
3. **For UNKNOWN-004:** Run `fly logs --app ignition-api` and capture errors
4. **For UNKNOWN-006:** Verify R2 secrets exist in Fly.io

When resolved, move entries to "Resolved Unknowns" with resolution date and evidence.
