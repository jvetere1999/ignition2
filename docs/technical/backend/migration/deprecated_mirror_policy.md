"Deprecated mirror policy. Rules for archiving legacy code."

# Deprecated Mirror Policy

**Date:** January 6, 2026  
**Branch:** `refactor/stack-split`  
**Phase:** 07 - Structure Plan  
**Source:** copilot-instructions.md

---

## Overview

Per copilot-instructions, the deprecated mirror policy ensures:

1. No code is deleted until the new implementation is validated
2. Legacy code is archived in a mirror structure
3. No duplicate live implementations exist

---

## Core Principles

### Principle 1: Validate Before Deprecating

> "Do not delete old code until the new path is proven working (tests + functional validation)."

**Rule:** A file/module can only be moved to `deprecated/` after:
- [ ] New implementation exists in target location
- [ ] Unit tests pass in new location
- [ ] Integration tests pass
- [ ] E2E tests cover the functionality
- [ ] Manual smoke test completed (if applicable)

### Principle 2: Mirror Structure

> "Move the old implementation into `deprecated/<original-relative-path>` mirroring the same structure."

**Rule:** The deprecated folder exactly mirrors the original path:

| Original | Deprecated |
|----------|------------|
| `src/app/api/focus/route.ts` | `deprecated/src/app/api/focus/route.ts` |
| `src/lib/auth/index.ts` | `deprecated/src/lib/auth/index.ts` |
| `wrangler.toml` | `deprecated/wrangler.toml` |

### Principle 3: No Dual Live Code

> "Do not leave duplicate live implementations in two places; once the new path is active, legacy must be moved to deprecated."

**Rule:** At any point in time:
- A feature is either in `src/` (legacy) OR `app/` (new) OR `deprecated/`
- Never in both `src/` and `app/` simultaneously
- The moment new code is activated, old code moves to `deprecated/`

---

## Deprecation Process

### Step-by-Step Workflow

```
1. Implement new version in target location (app/*)
   └── Write code
   └── Add tests
   └── Validate locally

2. Run full validation suite
   └── npm run typecheck
   └── npm run lint
   └── npm run test
   └── npm run build
   └── E2E tests (if applicable)

3. Update feature_parity_checklist.md
   └── Mark feature as ✅ Complete

4. Move old code to deprecated/
   └── git mv src/path/to/file deprecated/src/path/to/file
   └── Preserve directory structure

5. Commit with clear message
   └── "deprecate: move src/lib/auth to deprecated after backend auth validated"

6. Run validation again
   └── Ensure nothing broke
```

### Git Commands

```bash
# Move a single file
git mv src/lib/auth/index.ts deprecated/src/lib/auth/index.ts

# Move a directory
git mv src/lib/auth deprecated/src/lib/auth

# Move with directory creation
mkdir -p deprecated/src/lib/auth
git mv src/lib/auth/* deprecated/src/lib/auth/
```

---

## Deprecation Checklist Template

When deprecating a module, create a checklist entry:

```markdown
## [Module Name] Deprecation

**Date:** YYYY-MM-DD
**Old Location:** `src/path/to/module`
**New Location:** `app/backend/src/path/to/module`

### Validation
- [ ] New implementation complete
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] E2E tests passing
- [ ] feature_parity_checklist.md updated
- [ ] No lint warnings in new code

### Deprecation
- [ ] Created deprecated directory structure
- [ ] Moved old files with `git mv`
- [ ] Committed with clear message
- [ ] Verified no broken imports
- [ ] Final validation passed
```

---

## Files to Deprecate (Inventory)

### Cloudflare-Specific (Immediate)

| File | Reason | When |
|------|--------|------|
| `wrangler.toml` | Cloudflare Workers config | After backend deploys |
| `open-next.config.ts` | OpenNext adapter | After frontend deploys |
| `.open-next/` | Build artifacts | Delete (not deprecate) |
| `.wrangler/` | Local dev state | Delete (not deprecate) |

### Auth Module (After Batch 08)

| File | Reason | When |
|------|--------|------|
| `src/lib/auth/index.ts` | Replaced by Rust auth | After auth validated |
| `src/lib/auth/providers.ts` | Replaced by Rust OAuth | After OAuth validated |
| `src/lib/auth/SessionProvider.tsx` | Keep in frontend | N/A - stays in frontend |
| `src/middleware.ts` | Replaced by Axum middleware | After middleware validated |

### Database Module (After Batch 09)

| File | Reason | When |
|------|--------|------|
| `src/lib/db/client.ts` | Replaced by SQLx | After repos validated |
| `src/lib/db/repositories/*.ts` | Replaced by Rust repos | After each repo validated |

### API Routes (After Batch 10)

| File | Reason | When |
|------|--------|------|
| `src/app/api/**/*.ts` | Replaced by Rust routes | After each route validated |

### Storage Module (After Batch 11)

| File | Reason | When |
|------|--------|------|
| `src/lib/storage/r2.ts` | Replaced by Rust S3 client | After storage validated |
| `src/lib/storage/types.ts` | May keep in frontend for types | Evaluate |

### Feature Flags (Immediate)

| File | Reason | When |
|------|--------|------|
| `src/lib/flags/index.ts` | Deprecated per instructions | Immediate |
| `src/env.d.ts` (flag types) | Remove flag types only | With flags |

### Edge Utilities (Immediate)

| File | Reason | When |
|------|--------|------|
| `src/lib/edge/*.ts` | Cloudflare-specific | Immediate |

---

## Deprecated Directory Structure

After full migration:

```
deprecated/
├── src/
│   ├── app/
│   │   └── api/              # All 56 API route files
│   │       ├── auth/
│   │       ├── admin/
│   │       ├── blobs/
│   │       └── ...
│   ├── lib/
│   │   ├── auth/             # Auth module
│   │   ├── db/               # D1 client + repositories
│   │   ├── storage/          # R2 workers binding
│   │   ├── admin/            # Admin utilities
│   │   ├── flags/            # Feature flags
│   │   ├── edge/             # Edge utilities
│   │   └── perf/             # API handler helpers
│   └── middleware.ts         # Auth middleware
├── migrations/
│   └── deprecated/           # Old migration files
├── wrangler.toml
└── open-next.config.ts
```

---

## DO NOT Deprecate

These files stay in active use:

| Location | Reason |
|----------|--------|
| `src/components/` | Moves to `app/frontend/` (not deprecated) |
| `src/app/(app)/` | Moves to `app/frontend/` (not deprecated) |
| `src/app/(mobile)/` | Moves to `app/frontend/` (not deprecated) |
| `src/lib/hooks/` | Moves to `app/frontend/` (not deprecated) |
| `src/lib/today/` | Moves to `app/frontend/` (not deprecated) |
| `src/lib/theme*/` | Moves to `app/frontend/` (not deprecated) |
| `tests/` | Moves to `app/frontend/tests/` (not deprecated) |

---

## Timing Guidelines

| Phase | What Gets Deprecated |
|-------|---------------------|
| Phase 08 complete | Nothing yet (backend scaffold only) |
| Phase 11 complete | `migrations/deprecated/` (already deprecated) |
| Phase 14 complete | `src/lib/storage/` (after R2 validated) |
| Phase 17 complete | Nothing (frontend moves, not deprecates) |
| Phase 20 complete | Nothing (admin moves, not deprecates) |
| Phase 26 (cutover) | All remaining legacy code |

---

## Recovery from Deprecated

If a bug is found in new code and rollback is needed:

```bash
# Move back from deprecated
git mv deprecated/src/lib/auth src/lib/auth

# Revert feature_parity_checklist.md
# Mark feature as 🔄 In Progress

# Run validation
npm run typecheck && npm run lint && npm run test
```

---

## References

- [move_plan.md](./move_plan.md) - Batch details
- [feature_parity_checklist.md](./feature_parity_checklist.md) - Parity tracking
- [PHASE_GATE.md](./PHASE_GATE.md) - Phase status
- [copilot-instructions.md](/.github/copilot-instructions.md) - Source rules

