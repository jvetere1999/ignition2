"Move plan for stack split. Deterministic batches with validation."

# Move Plan

**Date:** January 6, 2026  
**Branch:** `refactor/stack-split`  
**Phase:** 07 - Structure Plan  
**Source:** current_tree.md, api_endpoint_inventory.md, PHASE_GATE.md

---

## Overview

This document defines the deterministic sequence of move/translation batches for the stack split migration. Each batch includes:
- Source → Target mapping
- Expected mechanical changes
- Validation steps
- Rollback procedure

---

## Batch Summary

| Batch | Name | Files | Phase Gate |
|-------|------|-------|------------|
| 01 | Frontend Package Structure | ~10 | 07 |
| 02 | Static Assets | ~20 | 07 |
| 03 | Frontend Components | ~60 | 17 |
| 04 | Frontend Lib (UI-only) | ~30 | 17 |
| 05 | Frontend App Routes | ~50 | 17 |
| 06 | Backend Scaffold | New | 08 |
| 07 | Database Migrations | ~30 | 11 |
| 08 | Backend Auth Module | New | 08 |
| 09 | Backend Repositories | ~15 | 08 |
| 10 | Backend Routes | ~55 | 08 |
| 11 | Backend Storage (R2) | ~5 | 14 |
| 12 | Admin Console | ~30 | 20 |
| 13 | Deprecated Archive | ~100 | Final |

---

## Batch 01: Frontend Package Structure

**Phase Gate:** 07 (Ready)

### Moves

| Source | Target | Type |
|--------|--------|------|
| `package.json` | `app/frontend/package.json` | Copy + modify |
| `tsconfig.json` | `app/frontend/tsconfig.json` | Copy + modify |
| `next.config.ts` | `app/frontend/next.config.ts` | Copy + modify |
| `vitest.config.ts` | `app/frontend/vitest.config.ts` | Copy |
| `playwright.config.ts` | `app/frontend/playwright.config.ts` | Copy + modify |
| `eslint.config.mjs` | `app/frontend/eslint.config.mjs` | Copy |
| `next-env.d.ts` | `app/frontend/next-env.d.ts` | Copy |
| `tailwind.config.ts` (if exists) | `app/frontend/tailwind.config.ts` | Copy |
| `postcss.config.js` (if exists) | `app/frontend/postcss.config.js` | Copy |

### Mechanical Changes

1. **package.json:**
   - Remove D1/Workers dependencies: `@cloudflare/workers-types`, `@opennextjs/cloudflare`, `wrangler`
   - Remove `open-next.config.ts` references
   - Keep all React/Next.js dependencies
   - Add `"workspaces"` if using monorepo structure

2. **tsconfig.json:**
   - Update `paths` to use relative imports
   - Remove Cloudflare-specific types from `types`

3. **next.config.ts:**
   - Remove `experimental.serverComponentsExternalPackages` for D1
   - Remove OpenNext configuration

4. **playwright.config.ts:**
   - Update `baseURL` to point to new frontend location
   - Update test file paths

### Validation

```bash
cd app/frontend && npm install > ../../.tmp/batch01_install.log 2>&1
cd app/frontend && npm run typecheck > ../../.tmp/batch01_typecheck.log 2>&1
```

### Rollback

```bash
rm -rf app/frontend/package.json app/frontend/tsconfig.json app/frontend/next.config.ts
rm -rf app/frontend/node_modules
```

---

## Batch 02: Static Assets

**Phase Gate:** 07 (Ready)

### Moves

| Source | Target | Type |
|--------|--------|------|
| `public/` | `app/frontend/public/` | Copy all |
| `src/assets/` | `app/frontend/src/assets/` | Copy all |
| `resources/` | `app/frontend/resources/` | Copy all |

### Mechanical Changes

None - these are static files.

### Validation

```bash
ls -la app/frontend/public/ > .tmp/batch02_public.log 2>&1
ls -la app/frontend/src/assets/ > .tmp/batch02_assets.log 2>&1
```

### Rollback

```bash
rm -rf app/frontend/public app/frontend/src/assets app/frontend/resources
```

---

## Batch 03: Frontend Components

**Phase Gate:** 17 (Ready)

### Moves

| Source | Target | Type |
|--------|--------|------|
| `src/components/` | `app/frontend/src/components/` | Copy all |

### Subdirectories (13 total)

- `ads/`, `audio/`, `debug/`, `focus/`, `learn/`
- `mobile/`, `onboarding/`, `player/`, `progress/`
- `references/`, `settings/`, `shell/`, `ui/`

### Mechanical Changes

1. **Import paths:**
   - Update `@/lib/...` → relative imports or new alias
   - Update `@/components/...` → `./...` or new alias

2. **tsconfig paths:**
   - Configure `@/*` alias in `app/frontend/tsconfig.json`

### Validation

```bash
cd app/frontend && npm run typecheck > ../../.tmp/batch03_typecheck.log 2>&1
cd app/frontend && npm run lint > ../../.tmp/batch03_lint.log 2>&1
```

### Rollback

```bash
rm -rf app/frontend/src/components
```

---

## Batch 04: Frontend Lib (UI-only)

**Phase Gate:** 17 (Ready)

### Moves (Frontend-Only Libraries)

| Source | Target | Type |
|--------|--------|------|
| `src/lib/hooks/` | `app/frontend/src/lib/hooks/` | Copy |
| `src/lib/ui/` | `app/frontend/src/lib/ui/` | Copy |
| `src/lib/theme/` | `app/frontend/src/lib/theme/` | Copy |
| `src/lib/themes/` | `app/frontend/src/lib/themes/` | Copy |
| `src/lib/today/` | `app/frontend/src/lib/today/` | Copy |
| `src/lib/player/` | `app/frontend/src/lib/player/` | Copy |
| `src/lib/arrange/` | `app/frontend/src/lib/arrange/` | Copy |
| `src/lib/data/` | `app/frontend/src/lib/data/` | Copy |
| `src/lib/focus/` (partial) | `app/frontend/src/lib/focus/` | Copy UI parts only |

### DO NOT Move (Backend-only)

- `src/lib/auth/` → Backend
- `src/lib/db/` → Backend
- `src/lib/storage/` → Backend
- `src/lib/admin/` → Backend
- `src/lib/flags/` → Deprecated
- `src/lib/edge/` → Deprecated
- `src/lib/perf/` → Backend (middleware)

### Mechanical Changes

1. **Remove backend imports:**
   - Any file importing from `@/lib/db` must be refactored to use API client
   - Any file importing from `@/lib/auth` must use frontend session hooks

2. **Create API client:**
   - Add `app/frontend/src/lib/api/client.ts`
   - Add `app/frontend/src/lib/api/types.ts`

### Validation

```bash
cd app/frontend && npm run typecheck > ../../.tmp/batch04_typecheck.log 2>&1
cd app/frontend && npm run test > ../../.tmp/batch04_test.log 2>&1
```

### Rollback

```bash
rm -rf app/frontend/src/lib
```

---

## Batch 05: Frontend App Routes

**Phase Gate:** 17 (Ready)

### Moves

| Source | Target | Type |
|--------|--------|------|
| `src/app/(app)/` | `app/frontend/src/app/(app)/` | Copy all |
| `src/app/(mobile)/` | `app/frontend/src/app/(mobile)/` | Copy all |
| `src/app/auth/` | `app/frontend/src/app/auth/` | Copy (UI only) |
| `src/app/about/` | `app/frontend/src/app/about/` | Copy |
| `src/app/contact/` | `app/frontend/src/app/contact/` | Copy |
| `src/app/help/` | `app/frontend/src/app/help/` | Copy |
| `src/app/privacy/` | `app/frontend/src/app/privacy/` | Copy |
| `src/app/terms/` | `app/frontend/src/app/terms/` | Copy |
| `src/app/layout.tsx` | `app/frontend/src/app/layout.tsx` | Copy + modify |
| `src/app/page.tsx` | `app/frontend/src/app/page.tsx` | Copy |
| `src/app/globals.css` | `app/frontend/src/app/globals.css` | Copy |

### DO NOT Move (Backend)

- `src/app/api/` → Rewritten in Rust (Batch 10)

### Mechanical Changes

1. **layout.tsx:**
   - Remove server-side auth checks
   - Add API client wrapper
   - Keep SessionProvider for client-side session state

2. **Page components:**
   - Replace `auth()` calls with client-side hooks
   - Replace direct DB calls with API fetch calls

### Validation

```bash
cd app/frontend && npm run build > ../../.tmp/batch05_build.log 2>&1
cd app/frontend && npm run lint > ../../.tmp/batch05_lint.log 2>&1
```

### Rollback

```bash
rm -rf app/frontend/src/app
```

---

## Batch 06: Backend Scaffold

**Phase Gate:** 08 (Partial - can scaffold locally)

### Creates (New Files)

| Target | Purpose |
|--------|---------|
| `app/backend/Cargo.toml` | Rust package manifest |
| `app/backend/Cargo.lock` | Dependency lock |
| `app/backend/src/main.rs` | Entry point |
| `app/backend/src/lib.rs` | Library root |
| `app/backend/src/config.rs` | Configuration |
| `app/backend/src/error.rs` | Error types |

### Cargo.toml Dependencies

```toml
[dependencies]
axum = "0.7"
tokio = { version = "1", features = ["full"] }
sqlx = { version = "0.7", features = ["runtime-tokio", "postgres", "uuid", "chrono"] }
tower = "0.4"
tower-http = { version = "0.5", features = ["cors", "trace"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
uuid = { version = "1", features = ["v4", "serde"] }
chrono = { version = "0.4", features = ["serde"] }
tracing = "0.1"
tracing-subscriber = "0.3"
dotenvy = "0.15"
thiserror = "1"
```

### Validation

```bash
cd app/backend && cargo check > ../../.tmp/batch06_check.log 2>&1
cd app/backend && cargo test > ../../.tmp/batch06_test.log 2>&1
```

### Rollback

```bash
rm -rf app/backend/Cargo.toml app/backend/Cargo.lock app/backend/src app/backend/target
```

---

## Batch 07: Database Migrations

**Phase Gate:** 11 (Partial - can create locally)

### Moves/Transforms

| Source | Target | Type |
|--------|--------|------|
| `migrations/0100_master_reset.sql` | `app/database/migrations/` | Transform (SQLite → Postgres) |
| `migrations/deprecated/` | `deprecated/migrations/` | Move as-is |

### Schema Transformation

Per `schema_exceptions.md`, default to 1:1 translation:

| SQLite | PostgreSQL |
|--------|------------|
| `TEXT` (UUID) | `UUID` |
| `INTEGER` (bool) | `BOOLEAN` |
| `TEXT` (timestamp) | `TIMESTAMPTZ` |
| `datetime('now')` | `NOW()` |
| `AUTOINCREMENT` | `GENERATED ALWAYS AS IDENTITY` |

### Validation

```bash
cd app/database && psql $DATABASE_URL -f migrations/0001_initial.sql > ../../.tmp/batch07_migrate.log 2>&1
```

### Rollback

```bash
rm -rf app/database/migrations/*
```

---

## Batch 08: Backend Auth Module

**Phase Gate:** 08 (Partial)

### Creates (New Files Based on auth_inventory.md)

| Target | Source Reference |
|--------|------------------|
| `app/backend/src/auth/mod.rs` | `src/lib/auth/index.ts` |
| `app/backend/src/auth/oauth.rs` | `src/lib/auth/providers.ts` |
| `app/backend/src/auth/session.rs` | `src/lib/auth/index.ts:160-200` |
| `app/backend/src/auth/csrf.rs` | New (DEC-002=A) |
| `app/backend/src/auth/middleware.rs` | `src/middleware.ts` |
| `app/backend/src/auth/roles.rs` | `src/lib/admin/index.ts` (DEC-004=B) |

### Implementation Notes

- OAuth flow: Use `oauth2` crate
- Session: Custom implementation with SQLx
- CSRF: Origin/Referer verification per DEC-002
- Roles: DB-backed per DEC-004

### Validation

```bash
cd app/backend && cargo test auth > ../../.tmp/batch08_auth.log 2>&1
```

### Rollback

```bash
rm -rf app/backend/src/auth
```

---

## Batch 09: Backend Repositories

**Phase Gate:** 08 (Partial)

### Creates (Based on d1_usage_inventory.md)

| Target | Source Reference |
|--------|------------------|
| `app/backend/src/repositories/users.rs` | `src/lib/db/repositories/users.ts` |
| `app/backend/src/repositories/sessions.rs` | `src/lib/db/repositories/sessions.ts` |
| `app/backend/src/repositories/accounts.rs` | `src/lib/db/repositories/accounts.ts` |
| `app/backend/src/repositories/focus.rs` | `src/lib/db/repositories/focus.ts` |
| `app/backend/src/repositories/habits.rs` | `src/lib/db/repositories/habits.ts` |
| `app/backend/src/repositories/goals.rs` | `src/lib/db/repositories/goals.ts` |
| `app/backend/src/repositories/quests.rs` | `src/lib/db/repositories/quests.ts` |
| `app/backend/src/repositories/calendar.rs` | `src/lib/db/repositories/calendar.ts` |
| `app/backend/src/repositories/daily_plans.rs` | `src/lib/db/repositories/dailyPlans.ts` |
| `app/backend/src/repositories/exercise.rs` | `src/lib/db/repositories/exercise.ts` |
| `app/backend/src/repositories/market.rs` | `src/lib/db/repositories/market.ts` |
| `app/backend/src/repositories/gamification.rs` | `src/lib/db/repositories/gamification.ts` |
| `app/backend/src/repositories/reference_tracks.rs` | `src/lib/db/repositories/referenceTracks.ts` |
| `app/backend/src/repositories/onboarding.rs` | `src/lib/db/repositories/onboarding.ts` |
| `app/backend/src/repositories/settings.rs` | `src/lib/db/repositories/settings.ts` |

### Validation

```bash
cd app/backend && cargo test repositories > ../../.tmp/batch09_repos.log 2>&1
```

### Rollback

```bash
rm -rf app/backend/src/repositories
```

---

## Batch 10: Backend Routes

**Phase Gate:** 08 (Partial)

### Creates (Based on api_endpoint_inventory.md)

56 route files across 22 domains. Key mappings:

| Source Route | Target Module |
|--------------|---------------|
| `src/app/api/auth/` | `app/backend/src/routes/auth/` |
| `src/app/api/admin/` | `app/backend/src/routes/admin/` |
| `src/app/api/blobs/` | `app/backend/src/routes/blobs/` |
| `src/app/api/focus/` | `app/backend/src/routes/focus/` |
| `src/app/api/habits/` | `app/backend/src/routes/habits/` |
| ... (22 domains total) | ... |

### Validation

```bash
cd app/backend && cargo test routes > ../../.tmp/batch10_routes.log 2>&1
cd app/backend && cargo build > ../../.tmp/batch10_build.log 2>&1
```

### Rollback

```bash
rm -rf app/backend/src/routes
```

---

## Batch 11: Backend Storage (R2)

**Phase Gate:** 14 (Partial - requires LATER-003)

### Creates

| Target | Purpose |
|--------|---------|
| `app/backend/src/storage/mod.rs` | Module root |
| `app/backend/src/storage/client.rs` | S3-compatible client |
| `app/backend/src/storage/signed_urls.rs` | Pre-signed URL generation |
| `app/backend/src/storage/types.rs` | Blob metadata |

### Source Reference

`src/lib/storage/r2.ts` - 6 R2-accessing routes

### Validation

```bash
cd app/backend && cargo test storage > ../../.tmp/batch11_storage.log 2>&1
```

### Rollback

```bash
rm -rf app/backend/src/storage
```

---

## Batch 12: Admin Console

**Phase Gate:** 20 (Ready)

### Moves/Creates

| Source | Target | Type |
|--------|--------|------|
| `app/frontend/src/components/` (subset) | `app/admin/src/components/` | Copy shared |
| `app/frontend/src/lib/api/` | `app/admin/src/lib/api/` | Copy |
| New | `app/admin/src/app/` | Create admin pages |
| New | `app/admin/package.json` | Create |
| New | `app/admin/next.config.ts` | Create |

### Admin-Specific Pages

- `/` - Dashboard
- `/users` - User management
- `/quests` - Quest management
- `/skills` - Skill management
- `/content` - Content management
- `/feedback` - Feedback review
- `/backup` - Backup/restore

### Validation

```bash
cd app/admin && npm install > ../../.tmp/batch12_install.log 2>&1
cd app/admin && npm run build > ../../.tmp/batch12_build.log 2>&1
```

### Rollback

```bash
rm -rf app/admin/src app/admin/package.json app/admin/node_modules
```

---

## Batch 13: Deprecated Archive

**Phase Gate:** Final (after validation)

### Moves

| Source | Target |
|--------|--------|
| `wrangler.toml` | `deprecated/wrangler.toml` |
| `open-next.config.ts` | `deprecated/open-next.config.ts` |
| `src/app/api/` | `deprecated/src/app/api/` |
| `src/lib/auth/` | `deprecated/src/lib/auth/` |
| `src/lib/db/` | `deprecated/src/lib/db/` |
| `src/lib/storage/` | `deprecated/src/lib/storage/` |
| `src/lib/admin/` | `deprecated/src/lib/admin/` |
| `src/lib/flags/` | `deprecated/src/lib/flags/` |
| `src/lib/edge/` | `deprecated/src/lib/edge/` |
| `src/middleware.ts` | `deprecated/src/middleware.ts` |
| `.open-next/` | Delete (build artifact) |
| `.wrangler/` | Delete (local state) |

### Validation

Full E2E test suite must pass BEFORE moving to deprecated.

### Rollback

Move files back from `deprecated/` to original locations.

---

## Execution Order

```
Phase 07 (Structure Plan):
  └── Batch 01: Frontend Package Structure
  └── Batch 02: Static Assets

Phase 08 (Backend Scaffold):
  └── Batch 06: Backend Scaffold
  └── Batch 08: Backend Auth Module
  └── Batch 09: Backend Repositories
  └── Batch 10: Backend Routes

Phase 11 (Database):
  └── Batch 07: Database Migrations

Phase 14 (R2):
  └── Batch 11: Backend Storage

Phase 17 (Frontend):
  └── Batch 03: Frontend Components
  └── Batch 04: Frontend Lib
  └── Batch 05: Frontend App Routes

Phase 20 (Admin):
  └── Batch 12: Admin Console

Phase 26 (Cutover):
  └── Batch 13: Deprecated Archive
```

---

## References

- [target_structure.md](./target_structure.md) - Target layout
- [current_tree.md](./current_tree.md) - Current layout
- [deprecated_mirror_policy.md](./deprecated_mirror_policy.md) - Archive rules
- [PHASE_GATE.md](./PHASE_GATE.md) - Phase status

