"Database substrate migration plan. Documents the Postgres migration strategy."

# Database Substrate Plan

**Date:** January 6, 2026  
**Branch:** `refactor/stack-split`  
**Phase:** 11 - Database Migration  
**Purpose:** Plan the D1 → Postgres migration for identity/auth/RBAC/audit substrate

---

## Overview

This document outlines the migration strategy for the database substrate layer. The substrate provides the foundation for:

1. **Identity** - User accounts and profiles
2. **Authentication** - OAuth accounts and sessions
3. **Authorization** - RBAC roles and entitlements
4. **Audit** - Security event logging

---

## Decision Reference

| DEC-ID | Decision | Impact |
|--------|----------|--------|
| DEC-001 | Force re-auth at cutover | No session migration; clean slate for sessions table |
| DEC-004 | DB-backed roles | Full RBAC system instead of env-based admin check |

---

## Migration Strategy

### Phase 1: Auth Substrate (Current)

**Migration:** `0001_auth_substrate.sql`

| Table | Status | D1 Source | Changes |
|-------|--------|-----------|---------|
| `users` | ✅ Created | `users` | TEXT→UUID, added constraints |
| `accounts` | ✅ Created | `accounts` | Added provider constraints |
| `sessions` | ✅ Created | `sessions` | Enhanced with metadata |
| `verification_tokens` | ✅ Created | `verification_tokens` | Minimal changes |
| `authenticators` | ✅ Created | `authenticators` | Minimal changes |
| `roles` | ✅ Created | NEW | RBAC roles |
| `entitlements` | ✅ Created | NEW | RBAC permissions |
| `role_entitlements` | ✅ Created | NEW | Role→Permission mapping |
| `user_roles` | ✅ Created | NEW | User→Role mapping |
| `audit_log` | ✅ Created | NEW (replaces empty `admin_audit_log`) | Full audit system |
| `activity_events` | ✅ Created | `activity_events` | Added xp/coin columns |

---

### Phase 2: Gamification Substrate (Next)

**Planned Migration:** `0002_gamification.sql`

| Table | D1 Source | Priority |
|-------|-----------|----------|
| `user_wallet` | `user_wallet` | High |
| `user_progress` | `user_progress` | High |
| `user_skills` | `user_skills` | Medium |
| `skill_definitions` | `skill_definitions` | Medium |
| `user_achievements` | `user_achievements` | Medium |
| `achievement_definitions` | `achievement_definitions` | Medium |
| `points_ledger` | `points_ledger` | Low |
| `user_streaks` | `user_streaks` | Medium |

---

### Phase 3: Content Substrate

**Planned Migration:** `0003_content.sql`

| Table | D1 Source | Priority |
|-------|-----------|----------|
| `universal_quests` | `universal_quests` | High |
| `user_quest_progress` | `user_quest_progress` | High |
| `quests` | `quests` | Medium |
| `exercises` | `exercises` | Medium |
| `workouts` | `workouts` | Medium |

---

### Phase 4: User Data Substrate

**Planned Migration:** `0004_user_data.sql`

| Table | D1 Source | Priority |
|-------|-----------|----------|
| `user_settings` | `user_settings` | High |
| `user_interests` | `user_interests` | Medium |
| `user_ui_modules` | `user_ui_modules` | Low |
| `daily_plans` | `daily_plans` | Medium |
| `calendar_events` | `calendar_events` | Medium |
| `habits` | `habits` | Medium |
| `habit_logs` | `habit_logs` | Medium |
| `goals` | `goals` | Medium |
| `goal_milestones` | `goal_milestones` | Medium |

---

## Schema Translation Rules

### Type Mapping

| D1 (SQLite) | Postgres | Notes |
|-------------|----------|-------|
| `TEXT PRIMARY KEY` | `UUID DEFAULT gen_random_uuid()` | Native UUIDs |
| `INTEGER` (boolean) | `BOOLEAN` | Native booleans |
| `TEXT` (datetime) | `TIMESTAMPTZ` | Timezone-aware |
| `TEXT` (JSON) | `JSONB` | Indexed JSON |
| `INTEGER` | `INTEGER` / `BIGINT` | Based on range |
| `TEXT` | `TEXT` | Same |

### Naming Conventions

| D1 | Postgres | Reason |
|----|----------|--------|
| `camelCase` columns | `snake_case` | Postgres convention |
| `userId` | `user_id` | Consistency |
| No constraints | `CHECK` constraints | Data integrity |
| No indexes | Strategic indexes | Performance |

---

## Schema Exceptions

Per `schema_exceptions.md` policy, the following deviations are documented:

### EXC-SCHEMA-001: Users ID Type

| Field | Value |
|-------|-------|
| **Table** | `users` |
| **Change** | `id TEXT` → `id UUID` |
| **Rationale** | Native UUID type is more efficient, prevents collisions |
| **Parity Proven** | UUID→TEXT conversion in application layer if needed |

### EXC-SCHEMA-002: Sessions Enhanced

| Field | Value |
|-------|-------|
| **Table** | `sessions` |
| **Change** | Added `ip_address`, `user_agent`, `rotated_from` columns |
| **Rationale** | Security auditing and session rotation tracking |
| **Parity Proven** | New columns are optional (nullable) |

### EXC-SCHEMA-003: RBAC System

| Field | Value |
|-------|-------|
| **Tables** | `roles`, `entitlements`, `role_entitlements`, `user_roles` |
| **Change** | New tables for RBAC (per DEC-004=B) |
| **Rationale** | DB-backed roles instead of env var check |
| **Parity Proven** | Legacy `role` column retained for compatibility |

### EXC-SCHEMA-004: Audit Log

| Field | Value |
|-------|-------|
| **Table** | `audit_log` |
| **Change** | Replaces empty `admin_audit_log` with full audit system |
| **Rationale** | D1 table was never used; new system provides security monitoring |
| **Parity Proven** | N/A - new feature |

---

## Data Migration Strategy

### Per DEC-001=A: Force Re-Auth

**Sessions:** No data migration required. All users will re-authenticate at cutover.

**Users:** 
1. Export users from D1
2. Transform to new schema (TEXT→UUID)
3. Import to Postgres
4. Assign default 'user' role

**Accounts:**
1. Export accounts from D1
2. Link to new user UUIDs
3. Import to Postgres

### RBAC Bootstrap

After user migration:

```sql
-- Assign 'user' role to all existing users
INSERT INTO user_roles (user_id, role_id, granted_at)
SELECT u.id, r.id, NOW()
FROM users u, roles r
WHERE r.name = 'user';

-- Identify admins from legacy role column
INSERT INTO user_roles (user_id, role_id, granted_at)
SELECT u.id, r.id, NOW()
FROM users u, roles r
WHERE u.role = 'admin' AND r.name = 'admin'
ON CONFLICT DO NOTHING;
```

---

## Validation Checklist

### Migration Validation

| Check | Command | Expected |
|-------|---------|----------|
| Migration applies | `psql -f 0001_auth_substrate.sql` | No errors |
| Down migration works | `psql -f 0001_auth_substrate.down.sql` | No errors |
| Can re-apply | `psql -f 0001_auth_substrate.sql` | No errors |
| Tables created | `\dt` | 12 tables |
| Indexes created | `\di` | 15+ indexes |
| Functions created | `\df` | 3 functions |
| Views created | `\dv` | 2 views |

### Functional Validation

| Check | Query | Expected |
|-------|-------|----------|
| Create user | `INSERT INTO users (email, name)...` | UUID returned |
| Create session | `INSERT INTO sessions (user_id, token, expires_at)...` | Success |
| Assign role | `INSERT INTO user_roles...` | Success |
| Check entitlements | `SELECT * FROM user_with_roles WHERE id = $1` | Arrays populated |
| Cleanup sessions | `SELECT cleanup_expired_sessions()` | Count returned |

---

## Local Development Testing

### Start Docker Postgres

```bash
cd app/backend
docker compose up -d postgres
```

### Run Migration

```bash
psql postgres://ignition:ignition_dev@localhost:5432/ignition \
  -f app/database/migrations/0001_auth_substrate.sql
```

### Verify Tables

```bash
psql postgres://ignition:ignition_dev@localhost:5432/ignition \
  -c "\dt"
```

### Run Down Migration

```bash
psql postgres://ignition:ignition_dev@localhost:5432/ignition \
  -f app/database/migrations/0001_auth_substrate.down.sql
```

---

## Integration with Backend

### SQLx Configuration

Add to `app/backend/crates/api/`:

```toml
# Cargo.toml
sqlx = { version = "0.8", features = ["runtime-tokio", "postgres", "uuid", "chrono", "json"] }
```

### Model Types

```rust
// src/db/models/user.rs
#[derive(sqlx::FromRow)]
pub struct User {
    pub id: Uuid,
    pub email: String,
    pub name: String,
    pub email_verified: Option<DateTime<Utc>>,
    pub image: Option<String>,
    pub role: String,
    pub approved: bool,
    pub age_verified: bool,
    pub tos_accepted: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
```

### Query Examples

```rust
// Find user by email
let user = sqlx::query_as!(
    User,
    "SELECT * FROM users WHERE email = $1",
    email
)
.fetch_optional(&pool)
.await?;

// Check user entitlements
let entitlements: Vec<String> = sqlx::query_scalar!(
    r#"
    SELECT e.name
    FROM user_roles ur
    JOIN role_entitlements re ON ur.role_id = re.role_id
    JOIN entitlements e ON re.entitlement_id = e.id
    WHERE ur.user_id = $1
      AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
    "#,
    user_id
)
.fetch_all(&pool)
.await?;
```

---

## Next Steps

1. ✅ Auth substrate migration created
2. → Test migration locally with Docker Postgres
3. → Create `0002_gamification.sql` migration
4. → Implement SQLx models in backend
5. → Create data migration scripts for cutover

---

## References

- [schema.md](../app/database/schema.md) - Schema documentation
- [DECISIONS.md](./DECISIONS.md) - Migration decisions
- [security_model.md](./security_model.md) - Session/auth design
- [d1_usage_inventory.md](./d1_usage_inventory.md) - D1 source schema
- [schema_exceptions.md](./schema_exceptions.md) - Schema deviations

