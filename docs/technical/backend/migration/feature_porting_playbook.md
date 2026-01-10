"Feature porting playbook for mechanical, low-hand-coding conversion of features to new backend."

# Feature Porting Playbook

**Date:** January 7, 2026  
**Branch:** `refactor/stack-split`  
**Phase:** Feature Porting  
**Purpose:** Enable low-hand-coding mechanical conversion of each feature domain

---

## Overview

This playbook defines the **mechanical process** for porting each feature from the legacy Next.js API routes to the new Rust backend. The goal is to minimize hand-coding through:

1. Consistent patterns across all features
2. Reusable templates and code generation
3. One feature per PR/batch
4. Validation after each feature

---

## Feature Porting Lifecycle

```
┌──────────────────────────────────────────────────────────────────────┐
│                    Feature Porting Lifecycle                          │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  1. SCHEMA MIGRATION                                                  │
│     └─► Create Postgres migration in app/database/migrations/         │
│                                                                       │
│  2. DATABASE REPOSITORY                                               │
│     └─► Implement CRUD in app/backend/crates/api/src/db/repos/        │
│                                                                       │
│  3. SHARED TYPES                                                      │
│     └─► Add TypeScript types to shared/api-types/src/<domain>.ts      │
│                                                                       │
│  4. BACKEND ROUTES                                                    │
│     └─► Implement handlers in app/backend/crates/api/src/routes/      │
│                                                                       │
│  5. BACKEND TESTS                                                     │
│     └─► Add integration tests in app/backend/crates/api/src/tests/    │
│                                                                       │
│  6. FRONTEND SWAP                                                     │
│     └─► Update frontend to call new API endpoints                     │
│                                                                       │
│  7. VALIDATION                                                        │
│     └─► Run all tests, verify parity, update checklist                │
│                                                                       │
│  8. DEPRECATE                                                         │
│     └─► Move legacy code to deprecated/ after validation              │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Required Artifacts Per Feature

For each feature, the following artifacts must be created:

### 1. Schema Migration

| Artifact | Location | Template |
|----------|----------|----------|
| Up migration | `app/database/migrations/NNNN_<feature>.sql` | See below |
| Down migration | `app/database/migrations/NNNN_<feature>.down.sql` | See below |

**Template:**
```sql
-- app/database/migrations/NNNN_focus.sql
-- Focus sessions schema

CREATE TABLE IF NOT EXISTS focus_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mode VARCHAR(20) NOT NULL DEFAULT 'focus',
    duration_seconds INTEGER NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    xp_earned INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_focus_sessions_user ON focus_sessions(user_id);
CREATE INDEX idx_focus_sessions_status ON focus_sessions(user_id, status);
```

---

### 2. Database Repository

| Artifact | Location | Template |
|----------|----------|----------|
| Repository | `app/backend/crates/api/src/db/repos/<feature>.rs` | See below |
| Model | `app/backend/crates/api/src/db/models/<feature>.rs` | See below |

**Template (Model):**
```rust
// app/backend/crates/api/src/db/models/focus.rs
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct FocusSession {
    pub id: Uuid,
    pub user_id: Uuid,
    pub mode: String,
    pub duration_seconds: i32,
    pub started_at: DateTime<Utc>,
    pub ended_at: Option<DateTime<Utc>>,
    pub status: String,
    pub xp_earned: Option<i32>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
```

**Template (Repository):**
```rust
// app/backend/crates/api/src/db/repos/focus.rs
use sqlx::PgPool;
use uuid::Uuid;
use crate::db::models::FocusSession;
use crate::error::AppError;

pub struct FocusRepo;

impl FocusRepo {
    pub async fn list_by_user(pool: &PgPool, user_id: Uuid) -> Result<Vec<FocusSession>, AppError> {
        sqlx::query_as!(
            FocusSession,
            "SELECT * FROM focus_sessions WHERE user_id = $1 ORDER BY created_at DESC",
            user_id
        )
        .fetch_all(pool)
        .await
        .map_err(|e| AppError::Database(e.to_string()))
    }

    pub async fn create(pool: &PgPool, user_id: Uuid, mode: &str, duration: i32) -> Result<FocusSession, AppError> {
        sqlx::query_as!(
            FocusSession,
            r#"
            INSERT INTO focus_sessions (user_id, mode, duration_seconds)
            VALUES ($1, $2, $3)
            RETURNING *
            "#,
            user_id,
            mode,
            duration
        )
        .fetch_one(pool)
        .await
        .map_err(|e| AppError::Database(e.to_string()))
    }
    
    // ... additional CRUD methods
}
```

---

### 3. Shared Types

| Artifact | Location | Template |
|----------|----------|----------|
| Domain types | `shared/api-types/src/<domain>.ts` | See existing patterns |
| Export | `shared/api-types/src/index.ts` | Add exports |

**Template:**
```typescript
// shared/api-types/src/focus.ts
import type { UUID, ISOTimestamp } from './common.js';

export type FocusMode = 'focus' | 'break' | 'long_break';
export type FocusSessionStatus = 'active' | 'completed' | 'abandoned';

export interface FocusSession {
  id: UUID;
  user_id: UUID;
  mode: FocusMode;
  duration_seconds: number;
  started_at: ISOTimestamp;
  ended_at?: ISOTimestamp;
  status: FocusSessionStatus;
  xp_earned?: number;
  created_at: ISOTimestamp;
  updated_at: ISOTimestamp;
}

export interface CreateFocusRequest {
  mode: FocusMode;
  duration_minutes: number;
}
```

---

### 4. Backend Routes

| Artifact | Location | Template |
|----------|----------|----------|
| Route handler | `app/backend/crates/api/src/routes/<domain>.rs` | See below |
| Route registration | `app/backend/crates/api/src/routes/mod.rs` | Add module |

**Template:**
```rust
// app/backend/crates/api/src/routes/focus.rs
use std::sync::Arc;
use axum::{
    extract::{Path, State},
    routing::{get, post},
    Extension, Json, Router,
};
use uuid::Uuid;

use crate::db::repos::FocusRepo;
use crate::error::{AppError, AppResult};
use crate::middleware::auth::AuthContext;
use crate::state::AppState;

pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/", get(list_sessions).post(create_session))
        .route("/active", get(get_active))
        .route("/:id", get(get_session))
        .route("/:id/complete", post(complete_session))
        .route("/:id/abandon", post(abandon_session))
}

async fn list_sessions(
    State(state): State<Arc<AppState>>,
    Extension(auth): Extension<AuthContext>,
) -> AppResult<Json<Vec<FocusSession>>> {
    let sessions = FocusRepo::list_by_user(&state.db, auth.user_id).await?;
    Ok(Json(sessions))
}

// ... additional handlers
```

---

### 5. Backend Tests

| Artifact | Location | Template |
|----------|----------|----------|
| Integration tests | `app/backend/crates/api/src/tests/<domain>_tests.rs` | See below |
| Test registration | `app/backend/crates/api/src/tests/mod.rs` | Add module |

**Template:**
```rust
// app/backend/crates/api/src/tests/focus_tests.rs
#[cfg(test)]
mod tests {
    #[test]
    fn test_create_focus_session_requires_auth() {
        // Without auth, should return 401
    }

    #[test]
    fn test_create_focus_session_success() {
        // With auth, should create session
    }

    #[test]
    fn test_list_sessions_returns_user_sessions_only() {
        // User A cannot see User B's sessions (IDOR prevention)
    }

    #[test]
    fn test_complete_session_awards_xp() {
        // Completing a session should award XP
    }
}
```

---

### 6. Frontend Swap

| Artifact | Location | Template |
|----------|----------|----------|
| API client update | `app/frontend/src/lib/api/<domain>.ts` | See below |
| Remove Next.js route | Move to `deprecated/` | After validation |

**Template:**
```typescript
// app/frontend/src/lib/api/focus.ts
import type { FocusSession, CreateFocusRequest } from '@ignition/api-types';
import { apiGet, apiPost } from './client';

export async function listFocusSessions(): Promise<FocusSession[]> {
  return apiGet<FocusSession[]>('/api/focus');
}

export async function createFocusSession(request: CreateFocusRequest): Promise<FocusSession> {
  return apiPost<FocusSession, CreateFocusRequest>('/api/focus', request);
}

export async function getActiveSession(): Promise<FocusSession | null> {
  const result = await apiGet<{ session: FocusSession | null }>('/api/focus/active');
  return result.session;
}
```

---

### 7. Validation Checklist

After completing a feature:

- [ ] Schema migration applies cleanly
- [ ] `cargo clippy -- -D warnings` passes (0 warnings)
- [ ] `cargo test` passes (all tests)
- [ ] Shared types typecheck (`npm run typecheck` in shared/api-types)
- [ ] Frontend typecheck passes
- [ ] Manual smoke test of feature
- [ ] Update `feature_parity_checklist.md`

---

### 8. Deprecation

After validation:

```bash
# Move legacy route to deprecated/
mv src/app/api/focus deprecated/src/app/api/focus

# Update deprecated_mirror_policy.md if needed
```

---

## Feature Porting Order

Based on dependencies and complexity:

### Wave 1: Foundation (No Cross-Dependencies)

| Priority | Feature | Tables | Complexity | Dependencies |
|----------|---------|--------|------------|--------------|
| 1.1 | **Gamification** | user_progress, user_wallet, points_ledger | Medium | None |
| 1.2 | **Focus** | focus_sessions, focus_pause_state | Medium | Gamification (XP) |
| 1.3 | **Habits** | habits, habit_logs, user_streaks | Low | Gamification |
| 1.4 | **Goals** | goals, goal_milestones | Low | None |

### Wave 2: Core Features

| Priority | Feature | Tables | Complexity | Dependencies |
|----------|---------|--------|------------|--------------|
| 2.1 | **Quests** | quests, universal_quests, user_quest_progress | Medium | Gamification |
| 2.2 | **Calendar** | calendar_events | Low | None |
| 2.3 | **Daily Plan** | daily_plans | Low | None |
| 2.4 | **Feedback** | feedback | Low | None |

### Wave 3: Complex Features

| Priority | Feature | Tables | Complexity | Dependencies |
|----------|---------|--------|------------|--------------|
| 3.1 | **Exercise** | 8 tables | High | Gamification |
| 3.2 | **Books** | books, reading_sessions | Medium | Gamification |
| 3.3 | **Programs** | training_programs, program_weeks, program_workouts | Medium | Exercise |
| 3.4 | **Market** | market_items, user_purchases | Medium | Gamification |

### Wave 4: Specialized Features

| Priority | Feature | Tables | Complexity | Dependencies |
|----------|---------|--------|------------|--------------|
| 4.1 | **Learn** | 6 tables | High | Gamification |
| 4.2 | **Reference** | reference_tracks, track_analysis_cache | Medium | R2 (done) |
| 4.3 | **Onboarding** | 3 tables | Medium | Settings |
| 4.4 | **Infobase** | infobase_entries | Low | None |
| 4.5 | **Ideas** | ideas | Low | None |

### Wave 5: Admin Features

| Priority | Feature | Tables | Complexity | Dependencies |
|----------|---------|--------|------------|--------------|
| 5.1 | **Admin Users** | users, accounts, sessions | Medium | Auth (done) |
| 5.2 | **Admin Stats** | Various aggregates | Medium | All features |
| 5.3 | **Admin Content** | Various content tables | Medium | None |
| 5.4 | **Backup/Restore** | All tables | High | All features |

---

## Per-Feature Porting Checklist Template

Copy this template for each feature PR:

```markdown
## Feature: [FEATURE_NAME]

### Pre-Flight
- [ ] Feature parity checklist updated (status: In Progress)
- [ ] Dependencies identified and completed
- [ ] Legacy code reviewed for edge cases

### Artifacts Created
- [ ] Schema migration: `app/database/migrations/NNNN_<feature>.sql`
- [ ] Down migration: `app/database/migrations/NNNN_<feature>.down.sql`
- [ ] DB model: `app/backend/crates/api/src/db/models/<feature>.rs`
- [ ] DB repo: `app/backend/crates/api/src/db/repos/<feature>.rs`
- [ ] Shared types: `shared/api-types/src/<feature>.ts`
- [ ] Backend routes: `app/backend/crates/api/src/routes/<feature>.rs`
- [ ] Backend tests: `app/backend/crates/api/src/tests/<feature>_tests.rs`
- [ ] Frontend API client: `app/frontend/src/lib/api/<feature>.ts`

### Validation
- [ ] Migration applies: `cargo sqlx migrate run`
- [ ] Backend compiles: `cargo check`
- [ ] Backend clippy: `cargo clippy -- -D warnings` (0 warnings)
- [ ] Backend tests: `cargo test` (all pass)
- [ ] Shared types: `npm run typecheck` (0 errors)
- [ ] Frontend typecheck: `npm run typecheck` (0 errors)
- [ ] E2E smoke test: [describe test]

### Post-Merge
- [ ] Feature parity checklist updated (status: Done)
- [ ] Legacy code moved to deprecated/
- [ ] PHASE_GATE.md updated
```

---

## Mechanical Transformation Patterns

### D1 → Postgres Query Patterns

| D1 (SQLite) | Postgres |
|-------------|----------|
| `db.prepare(sql).bind(...).first()` | `sqlx::query_as!().fetch_optional()` |
| `db.prepare(sql).bind(...).all()` | `sqlx::query_as!().fetch_all()` |
| `db.prepare(sql).bind(...).run()` | `sqlx::query!().execute()` |
| `db.batch([...])` | Transaction with multiple queries |
| `?` placeholder | `$1, $2, $3` placeholders |
| `INTEGER` boolean | `BOOLEAN` |
| `TEXT` timestamp | `TIMESTAMPTZ` |
| `datetime('now')` | `now()` |
| `INSERT OR IGNORE` | `ON CONFLICT DO NOTHING` |

### Type Mappings

| TypeScript (D1) | Rust (Postgres) | Notes |
|-----------------|-----------------|-------|
| `string` (UUID) | `Uuid` | Use `uuid::Uuid` |
| `string` (ISO date) | `DateTime<Utc>` | Use `chrono` |
| `number` (integer) | `i32` or `i64` | Check range |
| `number` (float) | `f64` | |
| `boolean` | `bool` | |
| `string \| null` | `Option<String>` | |
| JSON object | `serde_json::Value` | Or typed struct |

---

## File Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| Migration | `NNNN_<feature>.sql` | `0002_gamification.sql` |
| Model | `<feature>.rs` | `focus.rs` |
| Repo | `<feature>.rs` | `focus.rs` |
| Route | `<feature>.rs` | `focus.rs` |
| Test | `<feature>_tests.rs` | `focus_tests.rs` |
| Shared types | `<feature>.ts` | `focus.ts` |
| Frontend API | `<feature>.ts` | `focus.ts` |

---

## Commit Message Format

```
feat(<domain>): port <feature> to Rust backend

- Add schema migration NNNN_<feature>.sql
- Add DB model and repository
- Add shared types to @ignition/api-types
- Implement route handlers
- Add integration tests
- Update frontend API client

Closes #XXX
```

---

## References

- [api_endpoint_inventory.md](./api_endpoint_inventory.md) - All endpoints
- [d1_usage_inventory.md](./d1_usage_inventory.md) - D1 tables and patterns
- [module_boundaries.md](./module_boundaries.md) - Backend structure
- [api_contract_strategy.md](./api_contract_strategy.md) - Type strategy
- [feature_parity_checklist.md](./feature_parity_checklist.md) - Status tracking
- [schema_exceptions.md](./schema_exceptions.md) - Schema optimization policy

