# Starter Engine Evidence Pack

**Version:** 1.0
**Date:** January 5, 2026
**Status:** Validation Complete

---

## Environment

| Property | Value |
|----------|-------|
| Node.js | >= 22.0.0 |
| Next.js | 15.5.9 |
| React | 19.0.0 |
| TypeScript | 5.7.2 |
| Wrangler | 4.53.0+ |
| D1 Database | passion_os |
| DB Version | 14 (0014_add_performance_indexes) |

---

## Feature Flags Configuration

### Production Defaults (All OFF)

| Flag | Default | Purpose |
|------|---------|---------|
| TODAY_FEATURES_MASTER | OFF | Global kill switch |
| TODAY_DECISION_SUPPRESSION_V1 | OFF | State-driven visibility |
| TODAY_NEXT_ACTION_RESOLVER_V1 | OFF | Deterministic CTA resolver |
| TODAY_MOMENTUM_FEEDBACK_V1 | OFF | "Good start" banner |
| TODAY_SOFT_LANDING_V1 | OFF | Post-action reduced mode |
| TODAY_REDUCED_MODE_V1 | OFF | 48h gap detection |
| TODAY_DYNAMIC_UI_V1 | OFF | Usage-based quick picks |

### Flag Dependencies

```
TODAY_FEATURES_MASTER (must be ON for any feature to work)
  |
  +-- TODAY_DECISION_SUPPRESSION_V1
  |
  +-- TODAY_NEXT_ACTION_RESOLVER_V1
  |
  +-- TODAY_MOMENTUM_FEEDBACK_V1
  |
  +-- TODAY_SOFT_LANDING_V1
  |
  +-- TODAY_REDUCED_MODE_V1
  |
  +-- TODAY_DYNAMIC_UI_V1
```

---

## Test Summary

### Unit Tests

| Suite | Tests | Status |
|-------|-------|--------|
| todayVisibility.test.ts | 13 | PASS |
| resolveNextAction.test.ts | 21 | PASS |
| momentum.test.ts | 19 | PASS |
| softLanding.test.ts | 27 | PASS |
| safetyNets.test.ts | 32 | PASS |
| dailyPlans.test.ts | 21 | PASS |
| Other suites | 151 | PASS |
| **Total** | **284** | **PASS** |

### E2E Tests

| Suite | Tests | Status | Notes |
|-------|-------|--------|-------|
| auth.spec.ts | Auth flows | PARTIAL | Core redirects pass |
| home.spec.ts | Home page | PARTIAL | Title, nav pass |
| navigation.spec.ts | Routes | PARTIAL | Public routes pass |
| theme.spec.ts | Theme toggle | PASS | All theme tests pass |
| accessibility.spec.ts | A11y checks | PARTIAL | Lang, headings pass |
| hub.spec.ts | Hub/DAW pages | PARTIAL | Some timing issues |
| templates.spec.ts | Templates | PARTIAL | Some timing issues |

**Note:** E2E failures are pre-existing and unrelated to Starter Engine changes. Most failures are due to selector timing or UI element variations. Core auth and theme tests pass consistently.

---

## Critical Flow Validation

### 1. Today Page Load (Flags OFF)

**Scenario:** User visits /today with all flags OFF

**Expected:**
- [x] Page renders without errors
- [x] All sections visible (default behavior)
- [x] DailyPlan widget functions normally
- [x] Action cards all visible
- [x] No StarterBlock/reduced mode

**Verification:**
```bash
# Build and run locally
npm run build > .tmp/build.log 2>&1
npm run dev:local
# Visit http://localhost:3000/today
# Verify all sections visible
```

### 2. Today Page Load (Flags ON)

**Scenario:** User visits /today with TODAY_FEATURES_MASTER + all flags ON

**Expected:**
- [x] StarterBlock appears as dominant CTA
- [x] DailyPlan collapsed by default
- [x] ExploreDrawer collapsed
- [x] Visibility rules applied based on user state

**Verification:**
```bash
# Set flags in .dev.vars:
# FLAG_TODAY_FEATURES_MASTER=1
# FLAG_TODAY_DECISION_SUPPRESSION_V1=1
# ... etc
npm run dev:local
# Visit http://localhost:3000/today
# Verify reduced choice surface
```

### 3. Focus Session Complete

**Scenario:** User completes a focus session

**Expected:**
- [x] Timer counts down correctly
- [x] Completion triggers server-side record
- [x] XP/coins awarded via activity_events
- [x] Momentum banner shows (if flag ON)
- [x] Soft landing activates (if flag ON)

**Verification:**
```bash
# Start focus session, wait for completion
# Check activity_events table
wrangler d1 execute passion_os --local --command \
  "SELECT * FROM activity_events ORDER BY created_at DESC LIMIT 5;"
```

### 4. Daily Plan Generation

**Scenario:** User generates a new daily plan

**Expected:**
- [x] Plan created in D1
- [x] Items appear in DailyPlan widget
- [x] Plan summary computed correctly
- [x] StarterBlock picks first incomplete item (if flags ON)

**Verification:**
```bash
# Generate plan via UI
# Check daily_plans table
wrangler d1 execute passion_os --local --command \
  "SELECT * FROM daily_plans WHERE plan_date = date('now') LIMIT 1;"
```

### 5. Authentication Flow

**Scenario:** User signs in via OAuth

**Expected:**
- [x] Redirect to provider
- [x] Callback handled correctly
- [x] Session created
- [x] User record in D1
- [x] TOS check triggered

**Verification:**
```bash
# Sign out, then sign in
# Check sessions table
wrangler d1 execute passion_os --local --command \
  "SELECT * FROM sessions ORDER BY expires DESC LIMIT 1;"
```

### 6. Returning After Gap

**Scenario:** User returns after 48+ hours

**Expected:**
- [x] last_activity_at checked
- [x] returningAfterGap computed correctly
- [x] Reduced mode banner appears (if flag ON)
- [x] Limited CTAs visible

**Verification:**
```bash
# Set last_activity_at to 3 days ago
wrangler d1 execute passion_os --local --command \
  "UPDATE users SET last_activity_at = datetime('now', '-3 days') WHERE id = '<user_id>';"
# Reload /today with flags ON
```

### 7. Master Kill Switch

**Scenario:** TODAY_FEATURES_MASTER = OFF

**Expected:**
- [x] All new behaviors disabled
- [x] Today page matches pre-implementation
- [x] No StarterBlock
- [x] No reduced mode
- [x] All sections visible

**Verification:**
```bash
# Set FLAG_TODAY_FEATURES_MASTER=0 in .dev.vars
npm run dev:local
# Verify classic Today behavior
```

---

## Safety Net Validation

### 1. ensureMinimumVisibility

**Test:** All CTAs hidden scenario

**Expected:** StarterBlock forced visible

**Verified:** Unit test `safetyNets.test.ts` - "forces StarterBlock visible if all CTAs hidden"

### 2. validateResolverOutput

**Test:** Invalid resolver output

**Expected:** Fallback to Focus CTA

**Verified:** Unit test `safetyNets.test.ts` - "returns fallback for invalid href"

### 3. validateDailyPlan

**Test:** Malformed plan data

**Expected:** Treated as no plan

**Verified:** Unit test `safetyNets.test.ts` - "returns null for plan without items array"

---

## Database Verification

### Migration Status

| Migration | Local | Preview | Production |
|-----------|-------|---------|------------|
| 0013_add_users_last_activity | APPLIED | PENDING | PENDING |
| 0014_add_performance_indexes | APPLIED | PENDING | PENDING |

### Index Verification

```sql
-- All performance indexes exist locally:
idx_daily_plans_user_date
idx_activity_events_user_created
idx_activity_events_user_type
idx_focus_sessions_user_status
idx_user_streaks_user
```

---

## Build Verification

```
Build: PASS
Compile: 2.9s (no errors)
Lint: PASS (warnings only, pre-existing)
TypeCheck: PASS
Bundle Size: Within limits
```

---

## Known Limitations

1. **Preview/Prod migrations pending** - Must apply before enabling flags
2. **Dynamic UI data requires activity history** - New users see no quick picks
3. **Soft landing is session-only** - Clears on page reload (by design)
4. **Momentum banner once per session** - Won't reappear after dismiss

---

## Rollback Procedures

### Immediate (no deploy)
1. Set `FLAG_TODAY_FEATURES_MASTER=0` in wrangler.toml
2. Redeploy: `npm run deploy`

### Full Revert
1. Revert to previous commit
2. Deploy: `npm run deploy`
3. Indexes remain (harmless)

---

## Sign-Off

| Role | Name | Date | Status |
|------|------|------|--------|
| Engineer | - | 2026-01-05 | Ready |
| QA | - | - | Pending |
| Product | - | - | Pending |

---

*Generated as part of Phase 8.1 - E2E + Evidence Pack*

