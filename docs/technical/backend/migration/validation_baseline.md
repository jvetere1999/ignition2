"Baseline validation before any moves. Establishes pass/fail status and warning baseline."

# Validation Baseline

**Date:** January 6, 2026  
**Branch:** `refactor/stack-split`  
**Phase:** Pre-migration baseline (before Phase 07)  
**Purpose:** Capture current validation state before any code moves

---

## Summary

| Check | Status | Details |
|-------|--------|---------|
| Typecheck | ✅ **Pass** | No errors |
| Lint | ⚠️ **Pass with warnings** | 44 warnings (baselined) |
| Unit Tests | ✅ **Pass** | 318 tests passed |
| Build | ✅ **Pass** | Compiled successfully |
| E2E Tests | ⏭️ **Skipped** | Smoke test deferred (requires running server) |

**Overall:** ✅ **Baseline Captured** - All checks pass (warnings baselined per DEC-003=C)

---

## Typecheck Results

| Metric | Value |
|--------|-------|
| **Command** | `npm run typecheck` |
| **Status** | ✅ Pass |
| **Errors** | 0 |
| **Log File** | `.tmp/validation_typecheck.log` |

```
> ignition@1.0.0 typecheck
> tsc --noEmit
(no output = success)
```

---

## Lint Results

| Metric | Value |
|--------|-------|
| **Command** | `npm run lint` |
| **Status** | ⚠️ Pass with warnings |
| **Errors** | 0 |
| **Warnings** | 44 |
| **Log File** | `.tmp/validation_lint.log` |

### Warning Breakdown

| Category | Count | Rule |
|----------|-------|------|
| Unused variables | 31 | `@typescript-eslint/no-unused-vars` |
| `<img>` instead of `<Image>` | 5 | `@next/next/no-img-element` |
| React Hook dependencies | 2 | `react-hooks/exhaustive-deps` |
| dangerouslySetInnerHTML | 2 | `react/no-danger` |
| Deprecation notice | 1 | `next lint` deprecation (informational) |
| **Total** | **44** | - |

**Note:** Per DEC-003=C, these warnings are baselined. See [existing_warnings.md](./existing_warnings.md) for full list.

---

## Unit Test Results

| Metric | Value |
|--------|-------|
| **Command** | `npm run test` |
| **Status** | ✅ Pass |
| **Test Files** | 17 passed |
| **Tests** | 318 passed |
| **Duration** | 1.41s |
| **Log File** | `.tmp/validation_unit.log` |

### Test Suites

| Suite | Tests | Status |
|-------|-------|--------|
| todayVisibility.test.ts | 13 | ✅ |
| resolveNextAction.test.ts | 21 | ✅ |
| momentum.test.ts | 19 | ✅ |
| softLanding.test.ts | 27 | ✅ |
| utils.test.ts | 34 | ✅ |
| safetyNets.test.ts | 32 | ✅ |
| dailyPlans.test.ts | 21 | ✅ |
| themes.test.ts | 19 | ✅ |
| templates.test.ts | 32 | ✅ |
| shortcuts.test.ts | 23 | ✅ |
| market.test.ts | 13 | ✅ |
| types.test.ts (storage) | 19 | ✅ |
| r2.test.ts | 8 | ✅ |
| onboarding.test.ts | 14 | ✅ |
| focusPause.test.ts | 7 | ✅ |
| providers.test.ts | 9 | ✅ |
| request-context.test.ts | 7 | ✅ |

---

## Build Results

| Metric | Value |
|--------|-------|
| **Command** | `npm run build` |
| **Status** | ✅ Pass |
| **Next.js Version** | 15.5.9 |
| **Compile Time** | 641ms |
| **Static Pages** | 2/2 generated |
| **Log File** | `.tmp/validation_build.log` |

### Build Output

```
▲ Next.js 15.5.9
- Environments: .env.local
Creating an optimized production build ...
✓ Compiled successfully in 641ms
Linting and checking validity of types ...
[44 warnings - same as lint]
Collecting page data ...
Generating static pages (0/2) ...
✓ Generating static pages (2/2)
Finalizing page optimization ...
Collecting build traces ...
```

---

## E2E Tests

| Metric | Value |
|--------|-------|
| **Status** | ⏭️ Skipped |
| **Reason** | Requires running server; smoke test deferred |
| **When** | Will run after backend scaffold (Phase 08+) |

---

## Warning Delta Check

| Metric | Value |
|--------|-------|
| **Baseline** | 44 |
| **Current** | 44 |
| **Delta** | 0 |
| **New Warnings** | 0 |

**Status:** ✅ Pass - Delta is 0

---

## Baseline Established

This validation establishes the baseline for the No-Regression Warnings Policy (DEC-003=C):

- **Baseline Count:** 44 warnings
- **Baseline Date:** January 6, 2026
- **Policy:** Warnings must never increase; new code must be warning-free

See:
- [existing_warnings.md](./existing_warnings.md) - Full warning list
- [warnings_baseline.md](./warnings_baseline.md) - Baseline tracking
- [exceptions.md](./exceptions.md) - EXC-001 waiver

---

## Log Files

| File | Purpose |
|------|---------|
| `.tmp/validation_typecheck.log` | TypeScript check output |
| `.tmp/validation_lint.log` | ESLint output with warnings |
| `.tmp/validation_unit.log` | Vitest unit test output |
| `.tmp/validation_build.log` | Next.js build output |

---

## References

- [PHASE_GATE.md](./PHASE_GATE.md) - Phase gating status
- [DECISIONS.md](./DECISIONS.md) - DEC-003 = C (post-migration fix)
- [gaps_checkpoint_after_skeleton.md](./gaps_checkpoint_after_skeleton.md) - Prior checkpoint

