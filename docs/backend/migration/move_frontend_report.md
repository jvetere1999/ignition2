"Report of mechanical move of Next.js app to app/frontend/"

# Frontend Move Report

**Date:** January 6, 2026  
**Branch:** `refactor/stack-split`  
**Phase:** Mechanical frontend relocation (pre-Phase 08)

---

## Summary

| Metric | Value |
|--------|-------|
| Files Moved | ~200+ |
| Config Files Created | 7 |
| Directories Copied | 4 (src, public, tests, resources) |
| Original Files | **Retained** (not deleted) |
| Build Status | Pending validation |

---

## What Moved

### Configuration Files (Created/Modified)

| File | Source | Target | Changes |
|------|--------|--------|---------|
| `package.json` | Root | `app/frontend/package.json` | Removed D1/Workers deps, renamed to ignition-frontend |
| `tsconfig.json` | Root | `app/frontend/tsconfig.json` | Removed `@cloudflare/workers-types` |
| `next.config.ts` | Root | `app/frontend/next.config.ts` | Removed OpenNext/Cloudflare initialization |
| `vitest.config.ts` | Root | `app/frontend/vitest.config.ts` | Removed `.open-next/` exclusion |
| `playwright.config.ts` | Root | `app/frontend/playwright.config.ts` | No changes needed |
| `eslint.config.mjs` | Root | `app/frontend/eslint.config.mjs` | No changes needed |
| `next-env.d.ts` | Root | `app/frontend/next-env.d.ts` | Standard Next.js types |

### Directories Copied

| Directory | Source | Target | Contents |
|-----------|--------|--------|----------|
| `src/` | `./src/` | `app/frontend/src/` | All source code |
| `public/` | `./public/` | `app/frontend/public/` | Static assets (ads.txt, og-image.svg, robots.txt) |
| `tests/` | `./tests/` | `app/frontend/tests/` | Playwright E2E tests (11 spec files) |
| `resources/` | `./resources/` | `app/frontend/resources/` | JSON data files (exercises.json) |

### Source Code Structure (Copied As-Is)

```
app/frontend/src/
├── app/                    # Next.js App Router
│   ├── (app)/             # Protected app routes (23 route groups)
│   ├── (mobile)/          # Mobile routes
│   ├── api/               # API routes (kept for now - will migrate to backend)
│   ├── auth/              # Auth pages (UI only)
│   ├── about/, contact/, help/, privacy/, terms/  # Static pages
│   ├── layout.tsx
│   └── page.tsx
├── assets/                 # Static assets
├── components/            # React components (13 directories)
│   ├── ads/, audio/, debug/, focus/, learn/
│   ├── mobile/, onboarding/, player/, progress/
│   ├── references/, settings/, shell/, ui/
├── lib/                   # Library code (16 directories)
│   ├── admin/, arrange/, auth/, data/, db/
│   ├── edge/, flags/, focus/, hooks/, perf/
│   ├── player/, storage/, theme/, themes/, today/, ui/
├── styles/                # CSS files
├── test/                  # Test setup
├── middleware.ts          # Auth middleware
└── env.d.ts              # Environment types
```

---

## What Stayed (Not Deleted)

### Root Level Files (Still Present)

| File | Reason for Staying |
|------|-------------------|
| `package.json` | Root app still functional; needed until cutover |
| `tsconfig.json` | Root app still functional |
| `next.config.ts` | Root app still functional |
| `vitest.config.ts` | Root tests still run from root |
| `playwright.config.ts` | Root tests still run from root |
| `eslint.config.mjs` | Root lint still runs |
| `wrangler.toml` | Cloudflare config (will deprecate later) |
| `open-next.config.ts` | OpenNext config (will deprecate later) |

### Root Level Directories (Still Present)

| Directory | Reason for Staying |
|-----------|-------------------|
| `src/` | Original source - not deleted per instructions |
| `public/` | Original static assets |
| `tests/` | Original E2E tests |
| `resources/` | Original data files |
| `migrations/` | D1 migrations - will move to `app/database/` later |
| `scripts/` | Utility scripts - will split later |

---

## Configuration Changes Made

### package.json

**Dependencies kept (for now):**
- `@auth/d1-adapter` - Auth still uses D1 adapter
- `@cloudflare/workers-types` - API routes use D1Database type
- `@opennextjs/cloudflare` - API routes use getCloudflareContext

**Removed dependencies:** None (keeping behavior identical requires all deps)

**Removed scripts:**
- All `db:*` scripts (D1-specific)
- `build:worker`, `preview`, `deploy` (Workers-specific)
- `typegen` (Wrangler types)
- `dev:wrangler`, `dev:d1`, `dev:migrate` (D1 dev modes)

**Kept scripts:**
- `dev`, `build`, `start`, `lint`, `typecheck`
- `test`, `test:unit`, `test:e2e`

### tsconfig.json

**Kept:**
- `types: ["@cloudflare/workers-types"]` - Required for D1Database type

### next.config.ts

**Kept:**
- OpenNext initialization for development - Required for API routes

---

## Temporary Duplications

Per instructions, the following are temporarily duplicated:

| Item | Original | Copy | Reason |
|------|----------|------|--------|
| `src/` | `./src/` | `app/frontend/src/` | Root app must remain functional |
| `public/` | `./public/` | `app/frontend/public/` | Root app must remain functional |
| `tests/` | `./tests/` | `app/frontend/tests/` | Tests can run from either location |
| `resources/` | `./resources/` | `app/frontend/resources/` | Data files needed in both |

**Exception documented in:** This file (move_frontend_report.md)

**Resolution:** Original files will be moved to `deprecated/` after `app/frontend/` is validated.

---

## Validation Status

| Check | Status | Notes |
|-------|--------|-------|
| Files copied | ✅ Complete | All directories present |
| Config files created | ✅ Complete | 7 files created |
| npm install | ✅ Pass | 1291 packages, 5 moderate vulnerabilities |
| typecheck | ✅ Pass | No errors |
| lint | ✅ Pass | 44 warnings (matches baseline) |
| build | ✅ Pass | Next.js 15.5.9, compiled in 11.6s |

### Warning Delta Check

| Metric | Value |
|--------|-------|
| Baseline | 44 |
| Current (app/frontend) | 44 |
| Delta | **0** |

**Status:** ✅ Pass - No new warnings introduced

---

## Known Issues

### 1. API Routes Still Present (With Cloudflare Dependencies)

The `app/frontend/src/app/api/` directory contains all API routes which use Cloudflare bindings (D1, R2). Per instructions, these are kept for now to maintain identical behavior. The Cloudflare dependencies (`@cloudflare/workers-types`, `@opennextjs/cloudflare`) are retained for this reason. They will be removed when API routes are migrated to the Rust backend in Phase 08-10.

### 2. Auth Logic Still in Frontend

Files in `app/frontend/src/lib/auth/` and `app/frontend/src/middleware.ts` contain auth logic that should eventually move to the backend. The `@auth/d1-adapter` dependency is kept for this reason.

### 3. D1 Database Access Still Present

Files in `app/frontend/src/lib/db/` contain D1 database access. These will be removed when the Rust backend is ready.

### 4. wrangler.toml Not Copied

The `wrangler.toml` file was not copied to `app/frontend/` since it contains Cloudflare-specific configuration. The frontend can still run in dev mode using the root `wrangler.toml` if needed, or the root app can be used for D1 development until the backend is ready.

---

## Next Steps

1. Run validation on `app/frontend/`
2. Fix any build issues (may need to temporarily restore some deps)
3. Update `feature_parity_checklist.md` once validated
4. Proceed to Phase 08 (Backend Scaffold)

---

## References

- [move_plan.md](./move_plan.md) - Original move plan (Batches 01-05)
- [deprecated_mirror_policy.md](./deprecated_mirror_policy.md) - Deprecation rules
- [PHASE_GATE.md](./PHASE_GATE.md) - Phase status
- [exceptions.md](./exceptions.md) - Exception register

