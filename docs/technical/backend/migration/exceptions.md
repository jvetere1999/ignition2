"Exceptions to zero-warning policy. Requires explicit owner approval."

# Migration Exceptions

**Created:** January 6, 2026  
**Branch:** `refactor/stack-split`  
**Purpose:** Document approved exceptions to strict validation rules

---

## EXC-001: Pre-existing Frontend Lint Warnings

### Exception Details

| Field | Value |
|-------|-------|
| **Exception ID** | EXC-001 |
| **Rule Waived** | Zero warnings requirement for lint |
| **Approved By** | Owner |
| **Approval Date** | January 6, 2026 |
| **Related Decision** | DEC-003 (Lint Warning Resolution Timing = C: Post-migration) |

### Scope

This exception applies **only** to:
- Pre-existing lint warnings in legacy frontend code
- Files that have not yet been moved to `app/frontend/` or `deprecated/`
- The 44 warnings documented in `validation_01.md`

### Warning Baseline

| Category | Count | Rule |
|----------|-------|------|
| Unused variables (`_prefix`) | 31 | `@typescript-eslint/no-unused-vars` |
| `<img>` instead of `<Image>` | 5 | `@next/next/no-img-element` |
| React Hook dependencies | 2 | `react-hooks/exhaustive-deps` |
| dangerouslySetInnerHTML | 2 | `react/no-danger` |
| Deprecation notice (next lint) | 1 | N/A |
| **Total** | **44** | - |

### Affected Files (Baseline)

```
src/app/(app)/arrange/ArrangeClient.tsx
src/app/(app)/books/BookTrackerClient.tsx
src/app/(app)/exercise/ExerciseClient.tsx
src/app/(app)/ideas/IdeasClient.tsx
src/app/(app)/infobase/InfobaseClient.tsx
src/app/(app)/learn/journal/JournalClient.tsx
src/app/(app)/learn/recipes/RecipeClient.tsx
src/app/(app)/learn/review/ReviewClient.tsx
src/app/(app)/progress/ProgressClient.tsx
src/app/(app)/quests/QuestsClient.tsx
src/app/(app)/stats/StatsClient.tsx
src/app/(app)/today/TodayGridClient.tsx
src/app/(app)/wins/WinsClient.tsx
src/app/api/admin/cleanup-users/route.ts
src/app/api/learn/progress/route.ts
src/app/api/learn/review/route.ts
src/app/api/learn/route.ts
src/app/help/[topic]/page.tsx
src/app/layout.tsx
src/components/ads/AdUnit.tsx
src/components/mobile/MobileHeader.tsx
src/components/mobile/screens/MobileMeClient.tsx
src/components/mobile/screens/MobileMore.tsx
src/components/mobile/screens/MobileTodayClient.tsx
src/components/onboarding/OnboardingModal.tsx
src/components/player/AudioVisualizer.tsx
src/components/player/AudioVisualizerRave.tsx
src/components/player/TrackAnalysisPopup.tsx
src/components/player/Waveform.tsx
src/components/progress/SkillWheel.tsx
src/components/shell/MiniPlayer.tsx
src/components/shell/UserMenu.tsx
src/lib/db/repositories/gamification.ts
src/lib/flags/index.ts
```

### Enforcement Rules

| Rule | Description |
|------|-------------|
| **No new warnings** | New code must not introduce warnings |
| **Count must not increase** | Total warning count must stay ≤ 44 |
| **Fix on touch** | If a file is modified for other reasons, fix its warnings |
| **Track reductions** | Log warning count reductions in validation reports |

### Sunset Condition

This exception expires when:

1. Frontend code has been moved to `app/frontend/`
2. Admin console has been moved to `app/admin/`
3. Both new locations are stable and passing tests
4. All warnings have been fixed

**Target:** Exception removed by end of migration phase.

### Validation Bypass

During validation runs, use this exception as follows:

```bash
# Lint check with baseline allowance
# Warning count must be <= 44
# If count > 44, fail the build
```

### Monitoring

| Checkpoint | Expected Count | Actual Count | Date |
|------------|----------------|--------------|------|
| Baseline | 44 | 44 | January 6, 2026 |
| | | | |

---

## Exception Register

| EXC-ID | Description | Status | Sunset |
|--------|-------------|--------|--------|
| EXC-001 | Pre-existing frontend lint warnings | Active | End of migration |
| EXC-002 | Temporary source file duplication (root + app/frontend) | Active | After app/frontend validated |

---

## EXC-002: Temporary Source File Duplication

### Exception Details

| Field | Value |
|-------|-------|
| **Exception ID** | EXC-002 |
| **Rule Waived** | No duplicate live implementations |
| **Approved By** | Owner (via move instructions) |
| **Approval Date** | January 6, 2026 |
| **Related Policy** | deprecated_mirror_policy.md |

### Scope

The following directories are temporarily duplicated:

| Original | Copy | Reason |
|----------|------|--------|
| `./src/` | `app/frontend/src/` | Root app must remain functional until cutover |
| `./public/` | `app/frontend/public/` | Static assets needed in both |
| `./tests/` | `app/frontend/tests/` | Tests can run from either location |
| `./resources/` | `app/frontend/resources/` | Data files needed in both |

### Enforcement Rules

| Rule | Description |
|------|-------------|
| **No divergence** | Changes to one copy must be reflected in the other |
| **Prefer app/frontend/** | New development should target the new location |
| **Track changes** | Document any modifications in move_frontend_report.md |

### Sunset Condition

This exception expires when:

1. `app/frontend/` passes all validation (typecheck, lint, build, tests)
2. Root `src/` is moved to `deprecated/src/`
3. Only one live implementation exists

**Target:** Exception removed after frontend validation complete.

---

## References

- [DEC-003 in DECISIONS.md](./DECISIONS.md) - Decision to fix warnings post-migration
- [validation_01.md](./validation_01.md) - Full warning list
- [move_frontend_report.md](./move_frontend_report.md) - Frontend move details
- Copilot-instructions: "Zero errors and zero warnings" rule

