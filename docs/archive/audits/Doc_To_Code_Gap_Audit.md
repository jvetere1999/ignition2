# Doc-to-Code Gap Audit (Prompts 23-31)

**Version:** 1.0
**Date:** January 4, 2026
**Status:** Complete Audit

---

## Table of Contents

1. [Already Implemented](#1-already-implemented)
2. [Doc-Only Remaining](#2-doc-only-remaining)
3. [Order Recommendation](#3-order-recommendation)
4. [Validation Gates](#4-validation-gates)
5. [Policy Disclosure Requirements](#5-policy-disclosure-requirements)

---

## 1. Already Implemented

### 1.1 Prompt 23: Users Last Activity Migration

| Item | Status | File Path |
|------|--------|-----------|
| Migration SQL file | IMPLEMENTED | `migrations/0013_add_users_last_activity.sql` |
| User interface update | IMPLEMENTED | `src/lib/db/repositories/users.ts` (line 8-17) |
| `GAP_THRESHOLD_MS` constant | IMPLEMENTED | `src/lib/db/repositories/users.ts` (line 21) |
| `isReturningAfterGap()` function | IMPLEMENTED | `src/lib/db/repositories/users.ts` (line 118-158) |
| `touchUserActivity()` function | IMPLEMENTED | `src/lib/db/repositories/users.ts` (line 173-192) |
| Import touchUserActivity | IMPLEMENTED | `src/lib/db/repositories/activity-events.ts` (line 7) |
| Call touchUserActivity in logActivityEvent | IMPLEMENTED | `src/lib/db/repositories/activity-events.ts` (line 97) |
| Update CURRENT_DB_VERSION (backup) | IMPLEMENTED | `src/app/api/admin/backup/route.ts` (line 15-16) |
| Update CURRENT_DB_VERSION (restore) | IMPLEMENTED | `src/app/api/admin/restore/route.ts` (line 14) |
| Add v12->v13 migration in restore | IMPLEMENTED | `src/app/api/admin/restore/route.ts` (migrateData function) |

### 1.2 Prompt 24: Compute returningAfterGap on Today

| Item | Status | File Path |
|------|--------|-----------|
| Import isReturningAfterGap | IMPLEMENTED | `src/app/(app)/today/page.tsx` (line 18) |
| `checkReturningAfterGap()` function | IMPLEMENTED | `src/app/(app)/today/page.tsx` (line 42-64) |
| Use in TodayPage | IMPLEMENTED | `src/app/(app)/today/page.tsx` (line 91) |
| Pass to userState | IMPLEMENTED | `src/app/(app)/today/page.tsx` (line 99) |

### 1.3 Prompt 25: Wrangler-Based Feature Flags

| Item | Status | File Path | Gap |
|------|--------|-----------|-----|
| FLAG_NAMES constant | NOT IMPLEMENTED | `src/lib/flags.ts` | Uses `FLAGS` object instead |
| TRUTHY_VALUES parsing | NOT IMPLEMENTED | `src/lib/flags.ts` | Only accepts exact "true"/"false" |
| `parseFlagValue()` function | NOT IMPLEMENTED | `src/lib/flags.ts` | Inline check instead |
| Flag definitions (6 flags) | IMPLEMENTED | `src/lib/flags.ts` (line 17-65) | All 6 flags defined |
| `getFlag()` function | IMPLEMENTED | `src/lib/flags.ts` (line 76-86) | Works but simpler parsing |
| `isMasterEnabled()` function | IMPLEMENTED | `src/lib/flags.ts` (line 91-93) | |
| Individual flag getters | IMPLEMENTED | `src/lib/flags.ts` (line 108-138) | All 5 getters present |
| `getAllFlagValues()` | IMPLEMENTED | `src/lib/flags.ts` (line 147-153) | |
| `getActiveTodayFeatures()` | IMPLEMENTED | `src/lib/flags.ts` (line 158-169) | |
| wrangler.toml flag vars | NOT IMPLEMENTED | `wrangler.toml` | No FLAG_* vars added |
| .dev.vars flag vars | NOT IMPLEMENTED | `.dev.vars` | No FLAG_* vars added |
| env.d.ts flag types | NOT IMPLEMENTED | `src/env.d.ts` | No FLAG_* types |

### 1.4 Prompts 26-30: Documentation Only

All items in these prompts are **DOC-ONLY** with no code implementation.

---

## 2. Doc-Only Remaining

### 2.1 Prompt 25 Gaps (Wrangler Flags)

| Item | Required Action | File |
|------|-----------------|------|
| Enhanced flag parsing | Update `getFlag()` to accept "1", "true", "on" | `src/lib/flags.ts` |
| Add FLAG_* to wrangler.toml [vars] | Add commented flag vars | `wrangler.toml` |
| Add FLAG_* to wrangler.toml [env.preview.vars] | Add enabled flag vars | `wrangler.toml` |
| Add FLAG_* types to env.d.ts | Add optional FLAG_* properties | `src/env.d.ts` |
| Add FLAG_* to .dev.vars template | Add example flag vars | `.dev.vars` or `.dev.vars.example` |

### 2.2 Prompt 26: Dynamic UI (Not Implemented)

| Item | Required Action | File |
|------|-----------------|------|
| `FLAG_TODAY_DYNAMIC_UI_V1` | Add to flags.ts | `src/lib/flags.ts` |
| `isTodayDynamicUIEnabled()` | Add getter function | `src/lib/flags.ts` |
| `getDynamicUIData()` | Create function | `src/lib/db/repositories/activity-events.ts` |
| `DynamicUIData` interface | Define types | `src/lib/db/repositories/activity-events.ts` |
| `MODULE_CONFIG` constant | Define module mappings | `src/lib/db/repositories/activity-events.ts` |
| Quick Picks query | Add SQL query logic | `src/lib/db/repositories/activity-events.ts` |
| Resume Last query | Add SQL query logic | `src/lib/db/repositories/activity-events.ts` |
| Interest Primer query | Add SQL query logic | `src/lib/db/repositories/activity-events.ts` |
| `QuickPicks.tsx` component | Create component | `src/app/(app)/today/QuickPicks.tsx` |
| `QuickPicks.module.css` | Create styles | `src/app/(app)/today/QuickPicks.module.css` |
| `ResumeLast.tsx` component | Create component | `src/app/(app)/today/ResumeLast.tsx` |
| `ResumeLast.module.css` | Create styles | `src/app/(app)/today/ResumeLast.module.css` |
| `InterestPrimer.tsx` component | Create component | `src/app/(app)/today/InterestPrimer.tsx` |
| `InterestPrimer.module.css` | Create styles | `src/app/(app)/today/InterestPrimer.module.css` |
| Wire into Today page | Modify page.tsx | `src/app/(app)/today/page.tsx` |
| Wire into TodayGridClient | Pass props | `src/app/(app)/today/TodayGridClient.tsx` |

### 2.3 Prompt 27: Privacy Policy Updates

| Item | Required Action | File |
|------|-----------------|------|
| Update Section 2.2 (Usage Data) | Add last_activity_at mention | `src/app/privacy/page.tsx` |
| Add Section 3.1 (Personalized Experience) | Add new subsection | `src/app/privacy/page.tsx` |
| Update Section 7 (Cookies/Storage) | Add sessionStorage keys | `src/app/privacy/page.tsx` |
| Update lastUpdated date | Change to current date | `src/app/privacy/page.tsx` |

### 2.4 Prompt 28: UI Consistency Components

| Item | Required Action | File |
|------|-----------------|------|
| `PageHeader.tsx` | Create component | `src/components/ui/PageHeader.tsx` |
| `PageHeader.module.css` | Create styles | `src/components/ui/PageHeader.module.css` |
| `LoadingState.tsx` | Create component | `src/components/ui/LoadingState.tsx` |
| `LoadingState.module.css` | Create styles | `src/components/ui/LoadingState.module.css` |
| `EmptyState.tsx` | Create component | `src/components/ui/EmptyState.tsx` |
| `EmptyState.module.css` | Create styles | `src/components/ui/EmptyState.module.css` |
| `ErrorState.tsx` | Create component | `src/components/ui/ErrorState.tsx` |
| `ErrorState.module.css` | Create styles | `src/components/ui/ErrorState.module.css` |
| `SuccessState.tsx` | Create component | `src/components/ui/SuccessState.tsx` |
| `SuccessState.module.css` | Create styles | `src/components/ui/SuccessState.module.css` |
| `SectionHeader.tsx` | Create component | `src/components/ui/SectionHeader.tsx` |
| `SectionHeader.module.css` | Create styles | `src/components/ui/SectionHeader.module.css` |
| Update index.ts | Add exports | `src/components/ui/index.ts` |

### 2.5 Prompt 29: Performance Optimizations

| Item | Required Action | File |
|------|-----------------|------|
| Prefetch daily plan server-side | Modify page.tsx | `src/app/(app)/today/page.tsx` |
| Lazy load ExploreDrawer cards | Add conditional render | `src/app/(app)/today/ExploreDrawer.tsx` |
| Add daily_plans index | Create migration | `migrations/0014_daily_plans_index.sql` |
| Memoize flag checks | Refactor page.tsx | `src/app/(app)/today/page.tsx` |
| Code-split StarterBlock | Add dynamic import | `src/app/(app)/today/TodayGridClient.tsx` |

### 2.6 Prompt 30: UI Cleanup Items

47 items documented in `UI_Cleanup_Backlog.md`. All are **DOC-ONLY**.

Top 5 prioritized:
| ID | Item | File |
|----|------|------|
| FO-01 | Timer buttons loading states | `src/app/(app)/focus/FocusClient.tsx` |
| HA-01 | Habit button touch target | `src/app/(app)/habits/HabitsClient.tsx` |
| GL-01 | Mobile bottom bar labels | `src/components/shell/BottomBar.tsx` |
| TD-05 | Reduced mode dismiss button | `src/app/(app)/today/ReducedModeBanner.tsx` |
| MA-01 | Purchase confirmation | `src/app/(app)/market/MarketClient.tsx` |

---

## 3. Order Recommendation

### Phase 1: Critical Path (Must Complete First)

| Order | Item | Reason |
|-------|------|--------|
| 1 | Apply migration 0013 | Prerequisite for reduced mode |
| 2 | Add FLAG_* to wrangler.toml | Required for any flag-gated features |
| 3 | Add FLAG_* types to env.d.ts | TypeScript safety |
| 4 | Update privacy policy | Legal disclosure for last_activity_at |

**Rationale:** Migration and disclosure are prerequisites. Flags must be in wrangler.toml before any feature can be enabled in production.

### Phase 2: Flag System Completion

| Order | Item | Reason |
|-------|------|--------|
| 5 | Enhance flag parsing (accept "1", "on") | Robustness |
| 6 | Add .dev.vars flag examples | Developer experience |

**Rationale:** Minor enhancements, low risk.

### Phase 3: Dynamic UI (Optional Feature)

| Order | Item | Reason |
|-------|------|--------|
| 7 | Add FLAG_TODAY_DYNAMIC_UI_V1 | Gate the feature |
| 8 | Implement getDynamicUIData() | Data layer |
| 9 | Create QuickPicks, ResumeLast, InterestPrimer components | UI layer |
| 10 | Wire into Today page | Integration |

**Rationale:** Complete feature with new UI. Higher risk. Requires privacy policy update before enabling.

### Phase 4: UI Foundation (Parallelizable)

| Order | Item | Reason |
|-------|------|--------|
| 11 | Create PageHeader component | Foundation |
| 12 | Create LoadingState component | Foundation |
| 13 | Create EmptyState component | Foundation |
| 14 | Create ErrorState component | Foundation |

**Rationale:** Shared components. No dependencies. Can be done in parallel with other phases.

### Phase 5: Performance (Lower Priority)

| Order | Item | Reason |
|-------|------|--------|
| 15 | Prefetch daily plan | Performance |
| 16 | Lazy load ExploreDrawer | Performance |
| 17 | Add daily_plans index | Performance |

**Rationale:** Optimizations after core functionality is stable.

### Phase 6: UI Cleanup (Ongoing)

| Order | Item | Reason |
|-------|------|--------|
| 18+ | UI cleanup items from backlog | Polish |

**Rationale:** Incremental improvements. No blocking dependencies.

---

## 4. Validation Gates

### 4.1 Migration 0013 Applied

**Gate:**
```bash
# Verify column exists
wrangler d1 execute passion_os --command "SELECT last_activity_at FROM users LIMIT 1;" > .tmp/migration-check.log 2>&1

# Verify index exists
wrangler d1 execute passion_os --command "SELECT name FROM sqlite_master WHERE type='index' AND name='idx_users_last_activity';" >> .tmp/migration-check.log 2>&1
```

**Pass criteria:**
- No error on SELECT last_activity_at
- Index name returned in second query

### 4.2 Wrangler Flags Added

**Gate:**
```bash
grep -E "FLAG_TODAY" wrangler.toml > .tmp/wrangler-flags.log 2>&1
```

**Pass criteria:**
- At least 6 FLAG_TODAY lines (commented or uncommented)

### 4.3 Privacy Policy Updated

**Gate:**
```bash
grep -E "last_activity|Personalized|sessionStorage" src/app/privacy/page.tsx > .tmp/privacy-check.log 2>&1
```

**Pass criteria:**
- All 3 terms appear in file

### 4.4 Dynamic UI Implemented

**Gate:**
```bash
# Check flag exists
grep "TODAY_DYNAMIC_UI_V1" src/lib/flags.ts > .tmp/dynamic-ui-check.log 2>&1

# Check function exists
grep "getDynamicUIData" src/lib/db/repositories/activity-events.ts >> .tmp/dynamic-ui-check.log 2>&1

# Check components exist
ls src/app/(app)/today/QuickPicks.tsx >> .tmp/dynamic-ui-check.log 2>&1
ls src/app/(app)/today/ResumeLast.tsx >> .tmp/dynamic-ui-check.log 2>&1
```

**Pass criteria:**
- All greps return matches
- All files exist

### 4.5 UI Components Created

**Gate:**
```bash
ls src/components/ui/PageHeader.tsx \
   src/components/ui/LoadingState.tsx \
   src/components/ui/EmptyState.tsx \
   src/components/ui/ErrorState.tsx > .tmp/ui-components.log 2>&1
```

**Pass criteria:**
- All files exist
- No error in log

### 4.6 Build and Tests Pass

**Gate:**
```bash
npm run build > .tmp/build.log 2>&1
npm run test:unit > .tmp/test.log 2>&1
```

**Pass criteria:**
- Build exits 0
- All tests pass

---

## 5. Policy Disclosure Requirements

### 5.1 Already Implemented Features

| Feature | Privacy Policy Update Required | ToS Update Required |
|---------|-------------------------------|---------------------|
| `last_activity_at` collection | **YES** - Section 2.2 | NO |
| Reduced mode (48h gap) | **YES** - Section 3.1 | NO |
| Session storage (momentum, soft landing) | **YES** - Section 7 | NO |

**Status:** Privacy policy updates are **DRAFTED** but **NOT APPLIED** to `src/app/privacy/page.tsx`.

### 5.2 Doc-Only Features (If Implemented)

| Feature | Privacy Policy Update Required | ToS Update Required |
|---------|-------------------------------|---------------------|
| Quick Picks (usage-based) | **YES** - Section 3.1 | NO |
| Resume Last (usage-based) | **YES** - Section 3.1 | NO |
| Interest Primer (usage-based) | **YES** - Section 3.1 | NO |

**Disclosure required BEFORE enabling:**
- Aggregate usage counts used for personalization
- No content tracking (only event types)
- Deterministic rules (not AI/ML)

### 5.3 Required Privacy Policy Changes (Exact)

**Section 2.2 (Usage Data)** - Add:
```
- Last activity timestamp (when you last used any feature)
- Aggregate counts of feature usage by type
```

**Section 3 (How We Use)** - Add:
```
- Provide a personalized experience based on your usage patterns (see 3.1)
```

**New Section 3.1** - Add entire subsection from `Privacy_Policy_Update_Draft.md`.

**Section 7 (Cookies/Storage)** - Add:
```
- Session storage: For temporary UI state within a browser session
```

### 5.4 Defect: Privacy Policy Not Updated

**Issue:** The privacy policy has NOT been updated despite `last_activity_at` being collected in production code.

**Risk:** Legal compliance issue if migration is applied and reduced mode is enabled.

**Resolution:** Apply privacy policy updates BEFORE applying migration to production.

---

## Summary Statistics

| Category | Implemented | Doc-Only | Total |
|----------|-------------|----------|-------|
| P23: Migration | 10 | 0 | 10 |
| P24: Today Integration | 4 | 0 | 4 |
| P25: Wrangler Flags | 8 | 5 | 13 |
| P26: Dynamic UI | 0 | 17 | 17 |
| P27: Privacy Policy | 0 | 4 | 4 |
| P28: UI Components | 0 | 14 | 14 |
| P29: Performance | 0 | 5 | 5 |
| P30: UI Cleanup | 0 | 47 | 47 |
| **Total** | **22** | **92** | **114** |

**Implementation Rate:** 19% (22/114 items)

---

## Defects Identified

| ID | Severity | Description | Resolution |
|----|----------|-------------|------------|
| D1 | HIGH | Privacy policy not updated for last_activity_at | Apply P27 updates |
| D2 | MEDIUM | Flag parsing only accepts exact "true"/"false" | Enhance to accept "1", "on" |
| D3 | LOW | wrangler.toml has no FLAG_* vars | Add commented vars |
| D4 | LOW | env.d.ts missing FLAG_* types | Add optional types |
| D5 | INFO | Migration not confirmed applied | Apply via wrangler |

---

**End of Document**

