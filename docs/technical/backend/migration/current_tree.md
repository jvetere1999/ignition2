# Current Repository Tree

**Generated:** January 6, 2026  
**Updated:** January 6, 2026 (Frontend moved to app/frontend/)  
**Branch:** `refactor/stack-split`  
**Purpose:** Ground-truth inventory of current repo structure mapped to target layout

---

## Migration Status

| Target Directory | Status | Contents |
|------------------|--------|----------|
| `app/frontend/` | ✅ **Populated** | Full Next.js app (src, public, tests, resources) |
| `app/backend/` | ⬜ Empty | Awaiting Rust scaffold (Phase 08) |
| `app/admin/` | ⬜ Empty | Awaiting admin split (Phase 20) |
| `app/database/` | ⬜ Empty | Awaiting migration translation (Phase 11) |
| `app/r2/` | ⬜ Empty | Awaiting R2 config (Phase 14) |

---

## Target Layout Reference

```
root/
├── infra/               # Infrastructure (Terraform, Pulumi, etc.)
├── deploy/              # Deployment scripts, CI/CD configs
├── deprecated/          # Old code moved after migration
├── docs/
│   ├── user/           # User-facing documentation
│   ├── frontend/       # Frontend docs
│   ├── backend/        # Backend docs (this directory)
│   └── buisness/       # Business/product docs
└── app/
    ├── admin/          # Admin console (Next.js)
    ├── frontend/       # Main frontend (Next.js)
    ├── backend/        # Rust Axum backend
    ├── database/       # Postgres migrations
    └── r2/             # R2 access layer (backend-only)
```

---

## Current Repository Structure

### Root Level Files

| File | Purpose | Target Location | Move Status |
|------|---------|-----------------|-------------|
| `package.json` | Node.js dependencies | `app/frontend/package.json` | ✅ Copied (modified) |
| `tsconfig.json` | TypeScript config | `app/frontend/tsconfig.json` | ✅ Copied (modified) |
| `next.config.ts` | Next.js config | `app/frontend/next.config.ts` | ✅ Copied (modified) |
| `wrangler.toml` | Cloudflare Workers config | `deprecated/wrangler.toml` | ⬜ Pending deprecation |
| `open-next.config.ts` | OpenNext config | `deprecated/open-next.config.ts` | ⬜ Pending deprecation |
| `vitest.config.ts` | Vitest config | `app/frontend/vitest.config.ts` | ✅ Copied |
| `playwright.config.ts` | E2E test config | `app/frontend/playwright.config.ts` | ✅ Copied |
| `eslint.config.mjs` | ESLint config | `app/frontend/eslint.config.mjs` | ✅ Copied |
| `middleware.ts` | Auth middleware | Replaced by Axum middleware in `app/backend/` | ⬜ Future |

### Root Level Directories

| Directory | Purpose | Target Location | Move Status |
|-----------|---------|-----------------|-------------|
| `src/` | All source code | Split to `app/frontend/` and `app/backend/` | ✅ Copied to app/frontend/src/ |
| `migrations/` | D1 SQL migrations | `app/database/` (converted to Postgres) | ⬜ Pending |
| `docs/` | Documentation | `docs/` (restructured) | ✅ In place |
| `tests/` | Playwright E2E tests | `app/frontend/tests/` | ✅ Copied |
| `scripts/` | Utility scripts | Split between `deploy/` and `infra/` | ⬜ Pending |
| `public/` | Static assets | `app/frontend/public/` | ✅ Copied |
| `resources/` | JSON data files | `app/frontend/resources/` or `app/backend/seed/` | ✅ Copied |
| `.github/` | GitHub workflows | `deploy/github/` or keep in `.github/` | ⬜ Pending decision |
| `agent/` | Agent progress notes | `deprecated/agent/` or delete | ⬜ Pending |
| `conversions/` | Migration planning | Merge into `docs/backend/migration/` | ⬜ Pending |

---

## app/frontend/ Structure (NEW)

The frontend has been copied to `app/frontend/` with the following structure:

```
app/frontend/
├── package.json          # Modified (no D1/Workers deps)
├── tsconfig.json         # Modified (no Cloudflare types)
├── next.config.ts        # Modified (no OpenNext)
├── vitest.config.ts      # Copied
├── playwright.config.ts  # Copied
├── eslint.config.mjs     # Copied
├── next-env.d.ts         # Copied
├── src/                  # Full source copy
│   ├── app/             # Next.js App Router
│   ├── assets/          # Static assets
│   ├── components/      # React components
│   ├── lib/             # Library code
│   ├── styles/          # CSS files
│   ├── test/            # Test setup
│   ├── middleware.ts    # Auth middleware
│   └── env.d.ts         # Environment types
├── public/              # Static assets
├── tests/               # Playwright E2E tests
└── resources/           # JSON data files
```

### Temporary Duplication Note

Per EXC-002 in exceptions.md, the following are temporarily duplicated:
- `./src/` and `app/frontend/src/`
- `./public/` and `app/frontend/public/`
- `./tests/` and `app/frontend/tests/`
- `./resources/` and `app/frontend/resources/`

Originals will be moved to `deprecated/` after `app/frontend/` is validated.

---

## Source Directory Breakdown (`src/`)

### `src/app/` - Next.js App Router

| Path | Type | Target | Notes |
|------|------|--------|-------|
| `src/app/(app)/` | Protected app routes | `app/frontend/src/app/(app)/` | 23 route groups |
| `src/app/(mobile)/` | Mobile routes | `app/frontend/src/app/(mobile)/` | |
| `src/app/api/` | API routes | `app/backend/src/routes/` (Rust) | **55 routes to migrate** |
| `src/app/auth/` | Auth pages | `app/frontend/src/app/auth/` | UI only, logic to backend |
| `src/app/about/` | Static pages | `app/frontend/src/app/about/` | |
| `src/app/contact/` | Static pages | `app/frontend/src/app/contact/` | |
| `src/app/help/` | Static pages | `app/frontend/src/app/help/` | |
| `src/app/privacy/` | Static pages | `app/frontend/src/app/privacy/` | |
| `src/app/terms/` | Static pages | `app/frontend/src/app/terms/` | |
| `src/app/layout.tsx` | Root layout | `app/frontend/src/app/layout.tsx` | |
| `src/app/page.tsx` | Landing page | `app/frontend/src/app/page.tsx` | |

### `src/lib/` - Library Code

| Path | Current Purpose | Target | Migration Notes |
|------|-----------------|--------|-----------------|
| `src/lib/auth/` | NextAuth config | `app/backend/src/auth/` (Rust) | Full rewrite in Rust |
| `src/lib/db/` | D1 database client | `app/backend/src/db/` (Rust) | Migrate to SQLx + Postgres |
| `src/lib/db/repositories/` | Data access layer | `app/backend/src/repositories/` | 15 repository files |
| `src/lib/storage/` | R2 blob storage | `app/backend/src/storage/` | Backend-only R2 access |
| `src/lib/admin/` | Admin utilities | `app/backend/src/admin/` | |
| `src/lib/flags/` | Feature flags | DEPRECATED per instructions | Do not migrate |
| `src/lib/perf/` | API handler helpers | `app/backend/src/middleware/` | Tower middleware in Rust |
| `src/lib/edge/` | Edge utilities | DEPRECATED | Cloudflare-specific |
| `src/lib/today/` | Today page logic | `app/frontend/src/lib/today/` | UI state only |
| `src/lib/focus/` | Focus timer logic | Split between frontend/backend | |
| `src/lib/hooks/` | React hooks | `app/frontend/src/lib/hooks/` | |
| `src/lib/ui/` | UI utilities | `app/frontend/src/lib/ui/` | |
| `src/lib/theme/` | Theme utilities | `app/frontend/src/lib/theme/` | |
| `src/lib/themes/` | Theme definitions | `app/frontend/src/lib/themes/` | |
| `src/lib/data/` | Static data | `app/frontend/src/lib/data/` | |
| `src/lib/player/` | Audio player logic | `app/frontend/src/lib/player/` | |
| `src/lib/arrange/` | Arrangement logic | `app/frontend/src/lib/arrange/` | |

### `src/components/` - React Components

| Path | Purpose | Target |
|------|---------|--------|
| `src/components/ads/` | AdSense components | `app/frontend/src/components/ads/` |
| `src/components/audio/` | Audio visualization | `app/frontend/src/components/audio/` |
| `src/components/debug/` | Debug components | `app/frontend/src/components/debug/` |
| `src/components/focus/` | Focus timer UI | `app/frontend/src/components/focus/` |
| `src/components/learn/` | Learning UI | `app/frontend/src/components/learn/` |
| `src/components/mobile/` | Mobile components | `app/frontend/src/components/mobile/` |
| `src/components/onboarding/` | Onboarding UI | `app/frontend/src/components/onboarding/` |
| `src/components/player/` | Audio player UI | `app/frontend/src/components/player/` |
| `src/components/progress/` | Progress UI | `app/frontend/src/components/progress/` |
| `src/components/references/` | Reference track UI | `app/frontend/src/components/references/` |
| `src/components/settings/` | Settings UI | `app/frontend/src/components/settings/` |
| `src/components/shell/` | App shell/sidebar | `app/frontend/src/components/shell/` |
| `src/components/ui/` | Base UI components | `app/frontend/src/components/ui/` |

### `src/assets/` - Static Assets

| Path | Purpose | Target |
|------|---------|--------|
| `src/assets/brand/` | Brand assets | `app/frontend/src/assets/brand/` |

---

## Migrations Directory

| File | Status | Notes |
|------|--------|-------|
| `migrations/0100_master_reset.sql` | **Active** | Master schema + seed data (~1249 lines) |
| `migrations/deprecated/*.sql` | Deprecated | 27 historical migration files |

---

## Documentation Directory Structure

### Current `docs/` Layout

| Path | Content | Target Location |
|------|---------|-----------------|
| `docs/user-guide/` | User documentation | `docs/user/` |
| `docs/starter-engine/` | Starter engine specs | `docs/frontend/starter-engine/` |
| `docs/brand/` | Brand guidelines | `docs/buisness/brand/` |
| `docs/deploy/` | Deployment docs | `deploy/docs/` or `docs/backend/deploy/` |
| `docs/next-migration/` | Next.js migration | `docs/frontend/migration/` |
| `docs/ops/` | Operations docs | `docs/backend/ops/` |
| `docs/perf/` | Performance docs | `docs/backend/perf/` |
| `docs/validation/` | Validation reports | `docs/backend/validation/` |
| `docs/snapshots/` | State snapshots | `docs/backend/snapshots/` |
| `docs/status/` | Status reports | `docs/backend/status/` |
| `docs/*.md` (root) | Mixed docs | Reorganize by category |

---

## Files Requiring Migration Decision

### Must Migrate to Backend (Rust)

- All files in `src/app/api/` (55 route handlers)
- All files in `src/lib/auth/` (OAuth, sessions)
- All files in `src/lib/db/` (database access)
- All files in `src/lib/storage/` (R2 access)
- All files in `src/lib/admin/` (admin utilities)
- `src/middleware.ts` (auth middleware)

### Must Migrate to Frontend Only

- All files in `src/components/`
- All files in `src/app/(app)/` (UI pages)
- All files in `src/app/(mobile)/`
- `src/lib/hooks/`, `src/lib/ui/`, `src/lib/theme/`, `src/lib/themes/`
- `src/lib/today/`, `src/lib/player/`, `src/lib/arrange/`

### Files to Deprecate

- `wrangler.toml` (Cloudflare Workers config)
- `open-next.config.ts` (OpenNext config)
- `src/lib/edge/` (Cloudflare-specific)
- `src/lib/flags/` (Feature flags - per instructions)
- `.open-next/` (build artifacts)
- `.wrangler/` (local dev state)

---

## Summary Statistics

| Category | Count | Notes |
|----------|-------|-------|
| API Route Files | 56 | In `src/app/api/` |
| React Components | 13 dirs | In `src/components/` |
| Library Modules | 16 dirs | In `src/lib/` |
| Database Repositories | 15 files | In `src/lib/db/repositories/` |
| E2E Test Files | 11 | In `tests/` |
| Documentation Files | 70+ | In `docs/` |
| Migration Files | 28 | 1 active, 27 deprecated |

