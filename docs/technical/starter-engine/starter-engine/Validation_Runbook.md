# Today Starter Engine Validation Runbook

**Version:** 1.0
**Date:** 2026-01-04
**Scope:** Full validation of Today Starter Engine (Prompts 8-20)

---

## Table of Contents

1. [Environment Prerequisites](#1-environment-prerequisites)
2. [Feature Flag Matrix](#2-feature-flag-matrix)
3. [Test Cases by User State](#3-test-cases-by-user-state)
4. [Regression Checks](#4-regression-checks)
5. [Validation Sign-Off](#5-validation-sign-off)

---

## 1. Environment Prerequisites

### 1.1 Required Setup

| Requirement | Details |
|-------------|---------|
| Node.js | v20+ |
| Browser | Chrome/Firefox/Safari (latest) |
| Test User Account | Valid authenticated user |
| Database | D1 with test data |
| Environment | Local dev or staging |

### 1.2 Pre-Validation Checklist

```
[ ] Application builds successfully: npm run build
[ ] Unit tests pass: npm run test:unit
[ ] Application starts: npm run dev
[ ] User can authenticate
[ ] Database is accessible
[ ] sessionStorage is available (not private browsing for full test)
```

### 1.3 Flag Configuration Access

Flags are set via environment variables:

```bash
# In .env.local or wrangler.toml [vars]
FLAG_TODAY_FEATURES_MASTER=true|false
FLAG_TODAY_DECISION_SUPPRESSION_V1=true|false
FLAG_TODAY_NEXT_ACTION_RESOLVER_V1=true|false
FLAG_TODAY_MOMENTUM_FEEDBACK_V1=true|false
FLAG_TODAY_SOFT_LANDING_V1=true|false
FLAG_TODAY_REDUCED_MODE_V1=true|false
```

### 1.4 Test Data States

Prepare the following user states before testing:

| State ID | Description | How to Set Up |
|----------|-------------|---------------|
| S1 | First day user | New user, no activity history |
| S2 | Returning after 48h+ gap | Set last activity > 48 hours ago |
| S3 | Active streak user | Activity within last 24h, streak >= 1 |
| S4 | Plan exists, incomplete | Create daily plan with items, some incomplete |
| S5 | Plan exists, all complete | Create daily plan, mark all complete |
| S6 | No plan | Delete any existing daily plan |
| S7 | Focus active | Start a focus session, do not complete |

---

## 2. Feature Flag Matrix

### 2.1 All Flags OFF (Baseline)

**Configuration:**
```
FLAG_TODAY_FEATURES_MASTER=false
(or all individual flags = false)
```

**Expected Behavior:**
- Today page renders as pre-implementation
- All sections visible and expanded
- StarterBlock uses simple plan-first fallback
- No momentum banner ever appears
- No soft landing mode
- No reduced mode regardless of gap

---

### 2.2 Individual Flag Tests

#### 2.2.1 Decision Suppression Only

**Configuration:**
```
FLAG_TODAY_FEATURES_MASTER=true
FLAG_TODAY_DECISION_SUPPRESSION_V1=true
FLAG_TODAY_NEXT_ACTION_RESOLVER_V1=false
FLAG_TODAY_MOMENTUM_FEEDBACK_V1=false
FLAG_TODAY_SOFT_LANDING_V1=false
FLAG_TODAY_REDUCED_MODE_V1=false
```

**Test Cases:**

| Test ID | User State | Expected Visibility |
|---------|------------|---------------------|
| DS-1 | First day (S1) | StarterBlock visible, Explore collapsed, Daily Plan collapsed, Rewards hidden |
| DS-2 | Returning gap (S2) | Reduced mode banner, sections collapsed |
| DS-3 | Active streak (S3) | All sections visible, normal state |
| DS-4 | Plan incomplete (S4) | StarterBlock visible, Daily Plan summary visible |
| DS-5 | Focus active (S7) | Minimal UI, focus indicator |

---

#### 2.2.2 Next Action Resolver Only

**Configuration:**
```
FLAG_TODAY_FEATURES_MASTER=true
FLAG_TODAY_DECISION_SUPPRESSION_V1=false
FLAG_TODAY_NEXT_ACTION_RESOLVER_V1=true
FLAG_TODAY_MOMENTUM_FEEDBACK_V1=false
FLAG_TODAY_SOFT_LANDING_V1=false
FLAG_TODAY_REDUCED_MODE_V1=false
```

**Test Cases:**

| Test ID | User State | Plan State | Expected CTA |
|---------|------------|------------|--------------|
| NAR-1 | Any | No plan (S6) | "Start Focus" -> /focus |
| NAR-2 | Any | Plan incomplete (S4), lowest priority = "Review code" | "Continue: Review code" -> item URL |
| NAR-3 | Any | Plan all complete (S5) | "Start Focus" -> /focus |
| NAR-4 | Any | Plan with invalid item (missing URL) | Skip invalid, show next valid or fallback |

**Validation Steps:**
1. Navigate to /today
2. Observe StarterBlock CTA label and href
3. Click CTA, verify navigation target
4. Refresh page, verify same CTA (deterministic)

---

#### 2.2.3 Momentum Feedback Only

**Configuration:**
```
FLAG_TODAY_FEATURES_MASTER=true
FLAG_TODAY_DECISION_SUPPRESSION_V1=false
FLAG_TODAY_NEXT_ACTION_RESOLVER_V1=false
FLAG_TODAY_MOMENTUM_FEEDBACK_V1=true
FLAG_TODAY_SOFT_LANDING_V1=false
FLAG_TODAY_REDUCED_MODE_V1=false
```

**Test Cases:**

| Test ID | Action | Expected Outcome |
|---------|--------|------------------|
| MF-1 | Fresh session, navigate to /today | No momentum banner |
| MF-2 | Complete focus session, return to /today | Banner shows "Good start." |
| MF-3 | Click dismiss on banner | Banner disappears |
| MF-4 | Navigate away and back to /today | Banner does NOT reappear (dismissed state) |
| MF-5 | Complete second focus session | No new banner (one per session) |
| MF-6 | Close browser, reopen, complete focus | Banner appears (new session) |

**Validation Steps:**
1. Clear sessionStorage (new session)
2. Navigate to /today, verify no banner
3. Navigate to /focus, complete a focus session
4. Navigate to /today, verify banner with "Good start."
5. Click dismiss (X button)
6. Verify banner gone
7. Navigate away and back, verify still gone
8. Check sessionStorage["passion_momentum_v1"] === "dismissed"

---

#### 2.2.4 Soft Landing Only

**Configuration:**
```
FLAG_TODAY_FEATURES_MASTER=true
FLAG_TODAY_DECISION_SUPPRESSION_V1=false
FLAG_TODAY_NEXT_ACTION_RESOLVER_V1=false
FLAG_TODAY_MOMENTUM_FEEDBACK_V1=false
FLAG_TODAY_SOFT_LANDING_V1=true
FLAG_TODAY_REDUCED_MODE_V1=false
```

**Test Cases:**

| Test ID | Action | Expected Outcome |
|---------|--------|------------------|
| SL-1 | Fresh session, navigate to /today | Normal Today (no soft landing) |
| SL-2 | Complete focus session, navigate to /today | Soft landing: DailyPlan collapsed, Explore collapsed, Rewards hidden |
| SL-3 | Abandon focus session (reset), navigate to /today | Same soft landing behavior |
| SL-4 | In soft landing, click expand on DailyPlan | Soft landing cleared, sections expand |
| SL-5 | After clear, navigate away and back | Normal Today (soft landing cleared) |
| SL-6 | Close browser, reopen | No soft landing (new session) |

**Validation Steps:**
1. Clear sessionStorage
2. Navigate to /today, verify normal layout
3. Navigate to /focus, start and complete session
4. Navigate to /today
5. Verify: DailyPlanWidget collapsed, ExploreDrawer collapsed, Rewards hidden
6. Check sessionStorage["passion_soft_landing_v1"] === "1"
7. Click "View Plan" to expand DailyPlanWidget
8. Verify: Soft landing cleared, all sections accessible
9. Check sessionStorage["passion_soft_landing_v1"] === "0"

---

#### 2.2.5 Reduced Mode Only

**Configuration:**
```
FLAG_TODAY_FEATURES_MASTER=true
FLAG_TODAY_DECISION_SUPPRESSION_V1=false
FLAG_TODAY_NEXT_ACTION_RESOLVER_V1=false
FLAG_TODAY_MOMENTUM_FEEDBACK_V1=false
FLAG_TODAY_SOFT_LANDING_V1=false
FLAG_TODAY_REDUCED_MODE_V1=true
```

**Test Cases:**

| Test ID | User State | Expected Outcome |
|---------|------------|------------------|
| RM-1 | Last activity < 48h ago | Normal Today |
| RM-2 | Last activity > 48h ago (S2) | Reduced mode: banner, collapsed sections |
| RM-3 | No activity history | Normal Today (not reduced) |

**Validation Steps:**
1. Set user's last activity to 3 days ago in database
2. Navigate to /today
3. Verify: ReducedModeBanner visible, sections collapsed
4. Perform an action to update activity timestamp
5. Navigate to /today again
6. Verify: Normal Today (no longer reduced)

---

### 2.3 Combined Flags (Full Stack)

**Configuration:**
```
FLAG_TODAY_FEATURES_MASTER=true
FLAG_TODAY_DECISION_SUPPRESSION_V1=true
FLAG_TODAY_NEXT_ACTION_RESOLVER_V1=true
FLAG_TODAY_MOMENTUM_FEEDBACK_V1=true
FLAG_TODAY_SOFT_LANDING_V1=true
FLAG_TODAY_REDUCED_MODE_V1=true
```

**Test Cases:**

| Test ID | User State | Action | Expected Outcome |
|---------|------------|--------|------------------|
| FULL-1 | First day, no plan | Load /today | StarterBlock with "Start Focus", all collapsed, no banner |
| FULL-2 | First day, no plan | Complete focus | Soft landing + momentum banner, "Good start." |
| FULL-3 | First day, no plan | Dismiss banner | Banner gone, soft landing still active |
| FULL-4 | First day, no plan | Expand section | Soft landing cleared |
| FULL-5 | Returning gap, plan exists | Load /today | Reduced mode + StarterBlock shows first plan item |
| FULL-6 | Active streak, plan incomplete | Load /today | Normal visibility, resolver shows first incomplete |
| FULL-7 | Focus active | Load /today | Minimal UI, focus indicator |

---

## 3. Test Cases by User State

### 3.1 First Day User (S1)

**Setup:**
- New user with no activity history
- No daily plan created

**All Flags ON:**

| Aspect | Expected |
|--------|----------|
| StarterBlock | Visible |
| StarterBlock CTA | "Start Focus" -> /focus |
| DailyPlanWidget | Collapsed (or "Create Plan" prompt) |
| ExploreDrawer | Collapsed, 3 quick links visible |
| Rewards | Hidden |
| ReducedModeBanner | Not shown (first day != gap) |

**Flow Test:**
```
1. Navigate to /today
   -> Verify StarterBlock visible with "Start Focus"
   -> Verify sections collapsed
   
2. Click StarterBlock CTA
   -> Navigates to /focus
   
3. Complete focus session
   -> Returns to /today
   -> Momentum banner shows "Good start."
   -> Soft landing active (sections collapsed)
   
4. Dismiss momentum banner
   -> Banner disappears
   
5. Expand DailyPlanWidget
   -> Soft landing cleared
   -> All sections accessible
```

---

### 3.2 Returning After Gap User (S2)

**Setup:**
- User with last activity > 48 hours ago
- May or may not have daily plan

**All Flags ON:**

| Aspect | Expected |
|--------|----------|
| ReducedModeBanner | Visible with "Welcome back. Start small." |
| StarterBlock | Visible |
| StarterBlock CTA | Based on plan: first incomplete item OR "Start Focus" |
| DailyPlanWidget | Force collapsed |
| ExploreDrawer | Force collapsed |
| Rewards | Hidden |

**Flow Test:**
```
1. Navigate to /today
   -> ReducedModeBanner visible
   -> StarterBlock visible
   -> Sections collapsed
   
2. Click StarterBlock CTA
   -> Navigates to target
   
3. Complete action
   -> Momentum banner shows
   -> Soft landing active
   -> ReducedModeBanner still relevant until new activity
   
4. After new activity, reduced mode may clear on next visit
```

---

### 3.3 Plan Exists with Incomplete Items (S4)

**Setup:**
- User has daily plan with items
- At least one item incomplete
- Items have varying priorities (1, 2, 3...)

**All Flags ON:**

| Aspect | Expected |
|--------|----------|
| StarterBlock CTA | "Continue: [First incomplete item title]" |
| StarterBlock CTA href | First incomplete item's actionUrl |
| DailyPlanWidget | Shows summary with completion progress |
| DailyPlanWidget collapsed view | "Next: [first incomplete title]" |

**Flow Test:**
```
1. Create plan with items:
   - Item A: priority 3, incomplete
   - Item B: priority 1, incomplete
   - Item C: priority 2, complete
   
2. Navigate to /today
   -> StarterBlock shows "Continue: [Item B title]" (lowest priority)
   
3. Complete Item B
   
4. Navigate to /today
   -> StarterBlock shows "Continue: [Item C title]" (next lowest)
   
5. Complete all items
   -> StarterBlock shows "Start Focus" (fallback)
```

---

### 3.4 Plan Exists, All Complete (S5)

**Setup:**
- User has daily plan
- All items marked complete

**All Flags ON:**

| Aspect | Expected |
|--------|----------|
| StarterBlock CTA | "Start Focus" -> /focus |
| DailyPlanWidget | Shows "All done" or completion state |

---

### 3.5 No Plan (S6)

**Setup:**
- User has no daily plan for today

**All Flags ON:**

| Aspect | Expected |
|--------|----------|
| StarterBlock CTA | "Start Focus" -> /focus |
| DailyPlanWidget | "No plan" or "Generate Plan" prompt |

---

### 3.6 Focus Active (S7)

**Setup:**
- User has started a focus session
- Session not completed or abandoned

**All Flags ON:**

| Aspect | Expected |
|--------|----------|
| UI | Minimal, focus-first |
| StarterBlock | May show "Continue Focus" or hide |
| Other sections | May be hidden or minimized |

---

## 4. Regression Checks

### 4.1 Daily Plan Generate/Complete

**Test ID:** REG-DP

**Steps:**
```
1. Navigate to /today
2. If no plan, click "Generate Plan" or navigate to /planner
3. Verify plan generates without error
4. Return to /today
5. Verify DailyPlanWidget shows the plan
6. Click a plan item to navigate
7. Complete the action
8. Return to /today
9. Verify item shows as complete
10. Repeat for multiple items
```

**Expected:**
- [ ] Plan generates successfully
- [ ] Plan items display correctly
- [ ] Completion persists across navigation
- [ ] Progress counter updates

---

### 4.2 Focus Timer

**Test ID:** REG-FOCUS

**Steps:**
```
1. Navigate to /focus
2. Verify timer displays correctly
3. Click Start
4. Verify timer counts down
5. Let timer complete (or fast-forward for testing)
6. Verify completion notification
7. Verify stats update
8. Navigate to /today
9. Verify momentum banner (if flag ON)
10. Verify soft landing (if flag ON)
```

**Expected:**
- [ ] Timer starts/pauses/resets correctly
- [ ] Completion triggers correctly
- [ ] Stats persist to database
- [ ] Today features trigger correctly

---

### 4.3 Focus Abandon

**Test ID:** REG-ABANDON

**Steps:**
```
1. Navigate to /focus
2. Start a focus session
3. Click Reset (abandon)
4. Verify session abandoned
5. Navigate to /today
6. Verify soft landing (if flag ON)
```

**Expected:**
- [ ] Abandon saves correctly
- [ ] Soft landing triggers on abandon (if enabled)

---

### 4.4 Navigation Accessibility

**Test ID:** REG-NAV

**Steps:**
```
1. Navigate to /today
2. Verify sidebar is accessible
3. Click each sidebar link:
   - Focus
   - Quests
   - Exercise
   - Learn
   - Hub
   - Goals
   - Progress
   - Settings
4. Verify each page loads
5. Verify can return to /today
```

**Expected:**
- [ ] All sidebar links work
- [ ] All pages load without error
- [ ] Navigation back to Today works

---

### 4.5 StarterBlock CTA Navigation

**Test ID:** REG-STARTER

**Steps:**
```
1. Navigate to /today
2. Note StarterBlock CTA label and href
3. Click StarterBlock CTA
4. Verify navigation to correct page
5. Verify page loads without error
6. Navigate back to /today
```

**Expected:**
- [ ] CTA navigates to correct href
- [ ] Target page loads
- [ ] Back navigation works

---

### 4.6 Explore Drawer Functionality

**Test ID:** REG-EXPLORE

**Steps:**
```
1. Navigate to /today
2. If ExploreDrawer is collapsed, click to expand
3. Verify all action cards visible
4. Click each action card
5. Verify navigation works
6. Return to /today
7. Collapse ExploreDrawer
8. Verify state persists on refresh
```

**Expected:**
- [ ] Expand/collapse works
- [ ] All action cards navigate correctly
- [ ] State persists in localStorage

---

### 4.7 DailyPlanWidget Expand/Collapse

**Test ID:** REG-DAILYPLAN

**Steps:**
```
1. Navigate to /today
2. If DailyPlanWidget is collapsed, verify summary visible
3. Click to expand
4. Verify full plan list visible
5. Click to collapse
6. Verify summary returns
7. Refresh page
8. Verify state persists
```

**Expected:**
- [ ] Expand/collapse works
- [ ] Summary shows correct info
- [ ] State persists in localStorage

---

### 4.8 Session Storage Handling

**Test ID:** REG-STORAGE

**Steps:**
```
1. Open DevTools -> Application -> Session Storage
2. Perform actions that set session storage:
   - Complete focus (momentum)
   - Complete/abandon focus (soft landing)
3. Verify keys are set correctly
4. Clear session storage manually
5. Refresh page
6. Verify app handles missing keys gracefully
```

**Expected:**
- [ ] Keys set correctly on actions
- [ ] App handles missing keys without error
- [ ] Private browsing mode works (graceful degradation)

---

### 4.9 Safety Net Fallbacks

**Test ID:** REG-SAFETY

**Steps:**
```
1. Configure to return malformed plan data (mock API if needed)
2. Navigate to /today
3. Verify StarterBlock shows "Start Focus" (fallback)
4. Verify no crash or error screen
5. Verify console shows safety net warning

For resolver:
6. If resolver returns invalid href, verify fallback to /focus
```

**Expected:**
- [ ] Malformed data handled gracefully
- [ ] Fallback CTA displayed
- [ ] No crash or error screen

---

## 5. Validation Sign-Off

### 5.1 Test Execution Log

| Test ID | Tester | Date | Pass/Fail | Notes |
|---------|--------|------|-----------|-------|
| DS-1 | | | | |
| DS-2 | | | | |
| DS-3 | | | | |
| DS-4 | | | | |
| DS-5 | | | | |
| NAR-1 | | | | |
| NAR-2 | | | | |
| NAR-3 | | | | |
| NAR-4 | | | | |
| MF-1 | | | | |
| MF-2 | | | | |
| MF-3 | | | | |
| MF-4 | | | | |
| MF-5 | | | | |
| MF-6 | | | | |
| SL-1 | | | | |
| SL-2 | | | | |
| SL-3 | | | | |
| SL-4 | | | | |
| SL-5 | | | | |
| SL-6 | | | | |
| RM-1 | | | | |
| RM-2 | | | | |
| RM-3 | | | | |
| FULL-1 | | | | |
| FULL-2 | | | | |
| FULL-3 | | | | |
| FULL-4 | | | | |
| FULL-5 | | | | |
| FULL-6 | | | | |
| FULL-7 | | | | |
| REG-DP | | | | |
| REG-FOCUS | | | | |
| REG-ABANDON | | | | |
| REG-NAV | | | | |
| REG-STARTER | | | | |
| REG-EXPLORE | | | | |
| REG-DAILYPLAN | | | | |
| REG-STORAGE | | | | |
| REG-SAFETY | | | | |

### 5.2 Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| QA Lead | | | |
| Developer | | | |
| Product Owner | | | |

### 5.3 Known Issues

| Issue ID | Description | Severity | Status |
|----------|-------------|----------|--------|
| | | | |

### 5.4 Validation Summary

```
Total Test Cases: 40
Passed: ___
Failed: ___
Blocked: ___

Validation Status: [ ] APPROVED  [ ] REJECTED  [ ] CONDITIONAL

Notes:
_____________________________________________________________
_____________________________________________________________
_____________________________________________________________
```

---

## Appendix A: Quick Reference

### Flag Quick Toggle

```bash
# All OFF (baseline)
FLAG_TODAY_FEATURES_MASTER=false

# All ON (full stack)
FLAG_TODAY_FEATURES_MASTER=true
FLAG_TODAY_DECISION_SUPPRESSION_V1=true
FLAG_TODAY_NEXT_ACTION_RESOLVER_V1=true
FLAG_TODAY_MOMENTUM_FEEDBACK_V1=true
FLAG_TODAY_SOFT_LANDING_V1=true
FLAG_TODAY_REDUCED_MODE_V1=true
```

### Session Storage Keys

| Key | Values | Set By |
|-----|--------|--------|
| `passion_momentum_v1` | `null`, `"shown"`, `"dismissed"` | Momentum module |
| `passion_soft_landing_v1` | `null`, `"1"`, `"0"` | Soft landing module |
| `passion_soft_landing_source` | `"focus"`, `"quest"`, etc. | Soft landing module |

### localStorage Keys

| Key | Values | Set By |
|-----|--------|--------|
| `passion_daily_plan_collapsed` | `"true"`, `"false"` | DailyPlanWidget |
| `passion_explore_collapsed` | `"true"`, `"false"` | ExploreDrawer |

---

## Appendix B: Expected UI State Matrix

### StarterBlock CTA Resolution

| Plan State | First Incomplete | Expected CTA |
|------------|------------------|--------------|
| No plan | N/A | "Start Focus" -> /focus |
| Plan, all complete | N/A | "Start Focus" -> /focus |
| Plan, incomplete | "Task A" (priority 1) | "Continue: Task A" -> task URL |
| Plan, incomplete | "Task B" (priority 2) | "Continue: Task B" -> task URL |
| Plan, invalid items | Skip invalid | First valid or fallback |

### Section Visibility by State

| User State | StarterBlock | DailyPlan | Explore | Rewards | ReducedBanner |
|------------|--------------|-----------|---------|---------|---------------|
| First day | Visible | Collapsed | Collapsed | Hidden | No |
| Returning gap | Visible | Collapsed | Collapsed | Hidden | Yes |
| Active streak | Visible | Normal | Normal | Visible | No |
| Focus active | Visible | Hidden | Hidden | Hidden | No |
| Soft landing | Visible | Collapsed | Collapsed | Hidden | No |

---

**End of Runbook**

