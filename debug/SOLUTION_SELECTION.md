# SOLUTION SELECTION - Updated Decision Status

**Generated**: 2026-01-11  
**Updated**: 2026-01-12 21:45 UTC  
**Status**: 🟠 **P0 COMPLETE, P1 DECISION PENDING**  
**Current Gate**: P1 Auth Redirect Target (Option A or B)  
**Purpose**: Document all decisions made and PENDING decisions  
**Production Status**: Schema fixes ready to deploy, auth redirect issue discovered

---

## 🟠 CURRENT DECISION: P1 Auth Redirect Target

**Issue**: When session expires (401), code redirects to `/login` which doesn't exist, causing endless redirect loop.

**Evidence**: 
- User report: "clearing cookies locks you into endless cycle"
- Code analysis: client.ts:117 redirects to non-existent `/login` page
- Frontend structure: Main landing is `/`, signin is `/auth/signin`, no `/login`

### Option A: Redirect to Main Landing Page `/` ⭐ RECOMMENDED
```typescript
// Change in client.ts:117
window.location.href = '/';
```

**Rationale**:
- Clean slate after session clear
- User lands on public page, can see features
- Can choose to sign in or browse
- No redirect loop (/ is public route)
- Natural user experience

**Trade-offs**:
- Loses context of original destination
- User must manually click "Start Ignition" to sign in again
- But notification still shows "session expired" message

### Option B: Redirect to Signin Page `/auth/signin`
```typescript
// Change in client.ts:117
window.location.href = '/auth/signin';
```

**Rationale**:
- Direct path to re-authenticate
- Clear what user needs to do next
- Faster to regain access

**Trade-offs**:
- More aggressive (forces login choice)
- Less friendly after clearing cookies
- Doesn't let user just browse first

**AWAITING USER DECISION**: Reply with "Option A" or "Option B"

---

## 🟢 COMPLETED: P0 Schema Mismatch Fix (Option A Selected)

**User Decision**: Option A (Complete Rewrite)  
**Implementation**: COMPLETE ✅  
**Validation**: PASSED ✅

### What Was Fixed
- [app/backend/crates/api/src/routes/today.rs](app/backend/crates/api/src/routes/today.rs#L318-L368) - Rewrote `fetch_personalization()` to query correct schema
- Deleted dead code: `user_settings_repos.rs` and `user_settings_models.rs`
- Updated module declarations in `db/mod.rs`

### Validation Status
```
✅ cargo check: 0 errors, 209 warnings (pre-existing)
✅ npm lint: 0 errors, 26 warnings (pre-existing)
```

---

## 📋 DECISION HISTORY

### ✅ P0-P5 DECISIONS (Locked & Implemented)

| Priority | Issue | Decision | Status | Implementation |
|----------|-------|----------|--------|-----------------|
| P0 | Session Termination | Option A | ✅ COMPLETE | Centralized 401 handler in API client |
| P1 | Plan My Day | Option A | ✅ COMPLETE | Extended DailyPlanRepo with workout query |
| P2 | Onboarding Modal | Option C | ✅ COMPLETE | Intentionally disabled (manual entry only) |
| P3 | Focus Library | Options A+B | ✅ COMPLETE | R2 upload + reference tracks + B hotfix |
| P4 | Focus Persistence | Option A | ✅ COMPLETE | Integrated with SyncStateContext |
| P5 | Zen Browser | Option A | ✅ COMPLETE | CSS variable support + browser detection |
| P0 | Schema Mismatch | Option A | ✅ COMPLETE | Rewrote fetch_personalization, deleted dead code |

---

## ✅ FIXED ISSUES - HISTORICAL

### P0-A: habits.archived Column ✅ VERIFIED CORRECT

- Status: NOT AN ERROR - Code already uses `is_active = true`
- Location: `app/backend/crates/api/src/db/habits_goals_repos.rs:88`
- Evidence: Query correctly filters `WHERE is_active = true`
- Decision: No change needed - code matches schema

### P0-B: Date Casting ✅ FIXED (3 locations)

**Issue**: Some date columns receiving i64 instead of proper casting  
**Root Cause**: `::date` cast missing on INTEGER columns representing dates

**Fixed Locations**:
1. [habits_goals_repos.rs#L88](habits_goals_repos.rs#L88)
2. [habits_goals_repos.rs#L133](habits_goals_repos.rs#L133)
3. [quests_repos.rs#L199](quests_repos.rs#L199)

**Fix Applied**: Added `::date` cast to convert INT4 to DATE
```rust
// Before: SELECT completion_date FROM ...
// After:  SELECT completion_date::date FROM ...
```

**Validation**: All 3 locations now pass type checking

---

## DECISION CONTEXT & RATIONALE

### Why Option A (Complete Rewrite) Was Selected

**Evidence from Production**:
- 4 critical endpoints returning 500 errors
- Missing columns: `theme`, `key`, `streak_days`
- Type mismatches: INT4 vs INT8
- Root cause: Code using non-existent schema columns

**Option A Benefits**:
1. ✅ Fixes actual schema/code misalignment
2. ✅ Single source of truth (use correct tables)
3. ✅ No technical debt perpetuation
4. ✅ Proper error handling going forward
5. ✅ Interests mapped to correct `user_interests` table
6. ✅ Safe defaults for fields not in schema

**Option B Issues**:
1. ❌ Masks underlying problem
2. ❌ Would break again with next schema change
3. ❌ Creates long-term maintenance burden
4. ❌ Perpetuates confusion between schema and code

---

## ARCHIVE

All historical decision documents have been moved to `debug/archive/` for reference:
- Previous solution selections
- Earlier decision frameworks
- Build fix documentation
- Phase tracking records

Current active decisions are tracked in this file and `debug/DEBUGGING.md`.
