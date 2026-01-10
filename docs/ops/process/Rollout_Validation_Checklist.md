# Rollout and Validation Checklist

## Purpose

Define a stepwise rollout and validation plan for Prompts 9-13, ensuring each feature is validated independently before progressing.

---

## Section 1: Checklist Table

### Prompt 9: Today Decision Suppression Logic

| Item | Requirement |
|------|-------------|
| **Feature** | State-driven visibility rules for Today page |
| **Success Metric** | Correct visibility state applied for each user state combination |
| **Pass Condition** | All 6 state combinations produce correct visibility map (100% accuracy) |
| **Fail Condition** | Any state produces incorrect visibility OR any section inaccessible |
| **Rollback Criteria** | Visibility oscillation > 5/minute OR orphaned focus session > 2 hours OR first_day anomaly detected |
| **Rollback Action** | Revert to default visibility (all sections visible, collapsed by default) |
| **Validation Duration** | 48 hours minimum |

#### Manual Test Script - Prompt 9

```
TEST P9-1: Focus Active State
  SETUP: Start focus session, navigate to /today
  VERIFY: Only StarterBlock visible with "Return to Focus"
  VERIFY: DailyPlan hidden
  VERIFY: ExploreDrawer hidden
  VERIFY: Rewards hidden
  PASS: All hidden elements confirmed

TEST P9-2: First Day State
  SETUP: Create new user (or set created_at to now - 12h, clear activity_events)
  VERIFY: DailyPlan hidden
  VERIFY: ExploreDrawer collapsed (3 quick links visible)
  VERIFY: Rewards hidden
  VERIFY: StarterBlock shows "Start Focus"
  PASS: Correct first day visibility

TEST P9-3: Returning After Gap State
  SETUP: Set last_activity_date to now - 72h
  VERIFY: ReducedModeBanner visible with "Welcome back. Start small."
  VERIFY: DailyPlan force collapsed
  VERIFY: ExploreDrawer force collapsed
  VERIFY: Rewards hidden
  PASS: Reduced mode correctly applied

TEST P9-4: Plan Exists State
  SETUP: Create plan with 3 items (1 complete, 2 incomplete)
  VERIFY: StarterBlock shows first incomplete item
  VERIFY: DailyPlan visible (collapsed by default)
  VERIFY: ExploreDrawer collapsed
  VERIFY: Rewards collapsed
  PASS: Plan-driven visibility correct

TEST P9-5: Active Streak State
  SETUP: Set current_streak >= 1, last_activity_date = today
  VERIFY: DailyPlan visible (expanded by default)
  VERIFY: ExploreDrawer collapsed
  VERIFY: Rewards visible
  PASS: Streak state visibility correct

TEST P9-6: Default State
  SETUP: Clear all special conditions
  VERIFY: DailyPlan collapsed
  VERIFY: ExploreDrawer collapsed
  VERIFY: Rewards visible
  VERIFY: StarterBlock shows "Start Focus"
  PASS: Default visibility correct

TEST P9-7: State Priority
  SETUP: Create focus session AND plan with items
  VERIFY: Focus active (P1) overrides plan exists (P4)
  VERIFY: Only "Return to Focus" visible
  PASS: Priority order correct
```

---

### Prompt 10: Default Next Action Resolver

| Item | Requirement |
|------|-------------|
| **Feature** | Pure function returning deterministic next action |
| **Success Metric** | Resolver returns correct action type for all input combinations |
| **Pass Condition** | 100% of test cases return expected action type and route |
| **Fail Condition** | Any misfire (wrong route) OR any exception thrown OR noop loop detected |
| **Rollback Criteria** | Resolver misfire rate > 1% OR noop streak > 10 OR stale plan resolution detected |
| **Rollback Action** | Disable resolver; always return `/focus` fallback |
| **Validation Duration** | 24 hours minimum |

#### Manual Test Script - Prompt 10

```
TEST P10-1: Active Focus Session (P1)
  INPUT: { activeFocusSession: { status: "active" }, dailyPlan: null }
  EXPECTED: { type: "focus_return", route: "/focus", source: "active_session" }
  VERIFY: Resolver output matches expected
  PASS: P1 resolution correct

TEST P10-2: Paused Focus Session (P2)
  INPUT: { activeFocusSession: { status: "paused" }, dailyPlan: null }
  EXPECTED: { type: "focus_return", route: "/focus", source: "active_session" }
  VERIFY: Resolver output matches expected
  PASS: P2 resolution correct

TEST P10-3: Plan with Incomplete Items (P3)
  INPUT: { 
    activeFocusSession: null, 
    dailyPlan: { items: [
      { completed: true, priority: 1, actionUrl: "/focus" },
      { completed: false, priority: 2, actionUrl: "/quests/abc" }
    ]}
  }
  EXPECTED: { type: "quest", route: "/quests/abc", source: "plan" }
  VERIFY: First incomplete item selected
  PASS: P3 resolution correct

TEST P10-4: First Day User (P4)
  INPUT: { activeFocusSession: null, dailyPlan: null, isFirstDay: true }
  EXPECTED: { type: "focus", route: "/focus", source: "fallback" }
  VERIFY: Focus fallback for new user
  PASS: P4 resolution correct

TEST P10-5: Default Fallback (P5)
  INPUT: { activeFocusSession: null, dailyPlan: null, isFirstDay: false }
  EXPECTED: { type: "focus", route: "/focus", source: "fallback" }
  VERIFY: Focus fallback
  PASS: P5 resolution correct

TEST P10-6: Noop Case (P6)
  INPUT: { activeFocusSession: null, dailyPlan: null, currentRoute: "/focus" }
  EXPECTED: { type: "noop", route: null, source: "noop" }
  VERIFY: Noop when already on target
  PASS: P6 resolution correct

TEST P10-7: Priority Override
  INPUT: { 
    activeFocusSession: { status: "paused" }, 
    dailyPlan: { items: [{ completed: false, priority: 1, actionUrl: "/quests/urgent" }] }
  }
  EXPECTED: { type: "focus_return", route: "/focus" } (P2 > P3)
  VERIFY: Paused session wins over plan
  PASS: Priority order correct

TEST P10-8: All Items Completed
  INPUT: { 
    dailyPlan: { items: [{ completed: true }, { completed: true }] }
  }
  EXPECTED: { type: "focus", route: "/focus", source: "fallback" }
  VERIFY: Fallback when all done
  PASS: Empty plan fallback correct

TEST P10-9: Invalid Input
  INPUT: { userId: "", activeFocusSession: null, dailyPlan: null }
  EXPECTED: { type: "noop" } (graceful handling)
  VERIFY: No exception thrown
  PASS: Invalid input handled
```

---

### Prompt 11: Starter Momentum Feedback

| Item | Requirement |
|------|-------------|
| **Feature** | Non-gamified acknowledgment after first completion |
| **Success Metric** | Acknowledgment appears exactly once per browser session |
| **Pass Condition** | First completion shows ack; second completion does not; browser restart resets |
| **Fail Condition** | Ack appears > 1 time per session OR ack never appears OR ack appears on abandon |
| **Rollback Criteria** | Ack shown > 2 times per session OR sessionStorage error rate > 5% |
| **Rollback Action** | Disable acknowledgment entirely (no visual feedback) |
| **Validation Duration** | 24 hours minimum |

#### Manual Test Script - Prompt 11

```
TEST P11-1: First Focus Completion
  SETUP: Fresh browser session, no sessionStorage
  ACTION: Complete a focus session
  VERIFY: Acknowledgment text appears ("Session started.")
  VERIFY: Text visible for ~5 seconds
  VERIFY: Text fades and disappears
  PASS: First completion acknowledged

TEST P11-2: Second Completion Same Session
  SETUP: After P11-1 (same session)
  ACTION: Complete another focus session
  VERIFY: No acknowledgment appears
  PASS: Second completion not acknowledged

TEST P11-3: Different Action Type
  SETUP: Fresh browser session
  ACTION: Complete a quest (not focus)
  VERIFY: Acknowledgment text appears ("First task done.")
  PASS: Quest completion acknowledged

TEST P11-4: Abandon Does Not Trigger
  SETUP: Fresh browser session
  ACTION: Start focus, then abandon
  VERIFY: No acknowledgment appears
  PASS: Abandon not acknowledged

TEST P11-5: Browser Restart
  SETUP: Complete action (ack shown), close browser, reopen
  ACTION: Complete another action
  VERIFY: Acknowledgment appears again
  PASS: Session reset on browser restart

TEST P11-6: Page Refresh Persistence
  SETUP: Complete action (ack shown), refresh page
  ACTION: Complete another action
  VERIFY: No acknowledgment (sessionStorage persists)
  PASS: Refresh does not reset

TEST P11-7: Private Browsing Mode
  SETUP: Open private/incognito window
  ACTION: Complete focus session
  VERIFY: Acknowledgment appears (or graceful failure)
  VERIFY: No console errors
  PASS: Private mode handled

TEST P11-8: Copy Text Correctness
  VERIFY: Focus completion shows "Session started."
  VERIFY: Quest completion shows "First task done."
  VERIFY: Workout completion shows "Session started."
  VERIFY: No exclamation marks, no emoji
  PASS: Copy text correct
```

---

### Prompt 12: Action Exit Re-Entry Soft Landing

| Item | Requirement |
|------|-------------|
| **Feature** | Reduced Today view after first action completion |
| **Success Metric** | Soft landing activates on first completion return; full Today after second |
| **Pass Condition** | `?status=complete` triggers soft landing once; sections expand on interaction |
| **Fail Condition** | Soft landing loops OR soft landing never ends OR full Today on first return |
| **Rollback Criteria** | Soft landing triggers > 5 per session OR 30-second timer fails OR URL params persist after clear |
| **Rollback Action** | Disable soft landing; always show full Today |
| **Validation Duration** | 48 hours minimum |

#### Manual Test Script - Prompt 12

```
TEST P12-1: Focus Completion Routing
  SETUP: Fresh session
  ACTION: Complete focus session
  VERIFY: Navigated to /today?from=focus&status=complete
  PASS: Completion routes correctly

TEST P12-2: Soft Landing Activation
  SETUP: After P12-1
  VERIFY: ExploreDrawer hidden
  VERIFY: DailyPlan force collapsed
  VERIFY: Rewards hidden
  VERIFY: StarterBlock visible
  PASS: Soft landing active

TEST P12-3: URL Params Cleared
  SETUP: After P12-2
  VERIFY: URL is /today (no query params)
  PASS: Params cleared via replaceState

TEST P12-4: Section Expand Restores Full Today
  SETUP: In soft landing mode
  ACTION: Click to expand DailyPlan
  VERIFY: DailyPlan expands
  VERIFY: ExploreDrawer becomes visible
  VERIFY: Rewards visible
  PASS: Manual expand restores full Today

TEST P12-5: 30-Second Auto-Restore
  SETUP: Enter soft landing, do not interact
  WAIT: 30 seconds
  VERIFY: Full Today restored automatically
  PASS: Timer-based restore works

TEST P12-6: Second Completion No Soft Landing
  SETUP: After first completion (soft landing shown)
  ACTION: Complete another action
  VERIFY: Returns to /today with full visibility (no soft landing)
  PASS: Second completion shows full Today

TEST P12-7: Abandon Does Not Trigger Soft Landing
  SETUP: Fresh session
  ACTION: Start focus, abandon
  VERIFY: Returns to /today?from=focus&status=abandon
  VERIFY: Full Today shown (not soft landing)
  PASS: Abandon shows full Today

TEST P12-8: Multi-Tab Behavior
  SETUP: Open Tab A and Tab B
  ACTION: Complete action in Tab A
  VERIFY: Soft landing in Tab A
  ACTION: Navigate to /today in Tab B
  VERIFY: Soft landing state shared (or independent, consistent behavior)
  PASS: Multi-tab behavior consistent

TEST P12-9: Back Button Handling
  SETUP: Complete action, land on soft landing Today
  ACTION: Press browser back button
  ACTION: Press forward button
  VERIFY: No duplicate soft landing trigger
  PASS: History navigation handled
```

---

### Prompt 13: Abuse and Regression Guardrails

| Item | Requirement |
|------|-------------|
| **Feature** | Kill-switch and detection infrastructure |
| **Success Metric** | Kill-switches trigger correctly when thresholds exceeded |
| **Pass Condition** | Each kill-switch activates at defined threshold; features disable gracefully |
| **Fail Condition** | Kill-switch fails to trigger OR kill-switch triggers prematurely (<50% threshold) |
| **Rollback Criteria** | Any kill-switch logic throws exception OR kill-switch state persists after threshold clear |
| **Rollback Action** | Disable kill-switch system; rely on manual monitoring |
| **Validation Duration** | 72 hours minimum (must observe normal operation) |

#### Manual Test Script - Prompt 13

```
TEST P13-1: Soft Landing Kill-Switch
  SETUP: Simulate soft_landing_triggers_per_session = 6
  VERIFY: Soft landing disabled for remainder of session
  VERIFY: Full Today shown on next navigation
  PASS: Kill-switch triggers at threshold

TEST P13-2: Visibility Oscillation Kill-Switch
  SETUP: Simulate visibility state changes > 10/minute
  VERIFY: Decision suppression falls back to default
  VERIFY: All sections visible with default collapse state
  PASS: Oscillation kill-switch works

TEST P13-3: Noop Streak Kill-Switch
  SETUP: Simulate resolver returning noop > 20 times
  VERIFY: Resolver returns /focus fallback instead
  PASS: Noop kill-switch works

TEST P13-4: sessionStorage Error Kill-Switch
  SETUP: Mock sessionStorage.setItem to throw
  VERIFY: All session-scoped features disabled
  VERIFY: No console errors to user
  PASS: Storage error handled

TEST P13-5: Kill-Switch State Reset
  SETUP: Trigger a kill-switch
  WAIT: Clear the triggering condition
  VERIFY: Kill-switch state can be reset (if applicable)
  PASS: Kill-switch not permanent

TEST P13-6: Global Kill-Switch
  SETUP: Trigger 3 different kill-switches within 1 hour
  VERIFY: All Prompt 9-12 features disabled
  VERIFY: Baseline Today shown
  PASS: Global kill-switch works

TEST P13-7: Orphaned Focus Session Detection
  SETUP: Create focus session, wait > 4 hours without activity
  VERIFY: Session auto-expired
  VERIFY: focus_active state cleared
  PASS: Orphaned session handled

TEST P13-8: First Day Anomaly Detection
  SETUP: User with created_at > 30 days ago, no activity_events
  VERIFY: first_day state NOT applied (anomaly detected)
  VERIFY: Default state used instead
  PASS: Anomaly detection works
```

---

## Section 2: Go / No-Go Decision Matrix

### Pre-Rollout Gate

| Gate | Criteria | Status |
|------|----------|--------|
| G0 | Build passes (`npm run build`) | [ ] PASS / [ ] FAIL |
| G1 | Unit tests pass (`npm run test:unit`) | [ ] PASS / [ ] FAIL |
| G2 | E2E tests pass (`npm run test:e2e`) | [ ] PASS / [ ] FAIL |
| G3 | No TypeScript errors | [ ] PASS / [ ] FAIL |
| G4 | No new lint warnings in changed files | [ ] PASS / [ ] FAIL |

**Decision**: All gates must PASS to proceed to Prompt 9 rollout.

---

### Prompt-by-Prompt Go/No-Go

#### Prompt 9: Decision Suppression

| Criteria | Threshold | Actual | Decision |
|----------|-----------|--------|----------|
| P9 manual tests pass | 7/7 (100%) | ___/7 | [ ] GO / [ ] NO-GO |
| No visibility oscillation in 48h | 0 incidents | ___ | [ ] GO / [ ] NO-GO |
| No orphaned focus session in 48h | 0 incidents | ___ | [ ] GO / [ ] NO-GO |
| No first_day anomaly in 48h | 0 incidents | ___ | [ ] GO / [ ] NO-GO |
| User can access all sections | 100% | ___% | [ ] GO / [ ] NO-GO |

**Prompt 9 Decision**: [ ] **GO** - Proceed to Prompt 10 / [ ] **NO-GO** - Rollback and investigate

---

#### Prompt 10: Default Next Action Resolver

| Criteria | Threshold | Actual | Decision |
|----------|-----------|--------|----------|
| P10 manual tests pass | 9/9 (100%) | ___/9 | [ ] GO / [ ] NO-GO |
| Resolver misfire rate | < 1% | ___% | [ ] GO / [ ] NO-GO |
| No noop streak > 10 | 0 incidents | ___ | [ ] GO / [ ] NO-GO |
| No stale plan resolution | 0 incidents | ___ | [ ] GO / [ ] NO-GO |
| No exceptions thrown | 0 errors | ___ | [ ] GO / [ ] NO-GO |

**Prompt 10 Decision**: [ ] **GO** - Proceed to Prompt 11 / [ ] **NO-GO** - Rollback and investigate

---

#### Prompt 11: Starter Momentum Feedback

| Criteria | Threshold | Actual | Decision |
|----------|-----------|--------|----------|
| P11 manual tests pass | 8/8 (100%) | ___/8 | [ ] GO / [ ] NO-GO |
| Ack shown exactly once per session | 100% compliance | ___% | [ ] GO / [ ] NO-GO |
| No sessionStorage errors | < 5% error rate | ___% | [ ] GO / [ ] NO-GO |
| Copy text correct | 100% match spec | ___% | [ ] GO / [ ] NO-GO |
| 5-second dismiss works | 100% | ___% | [ ] GO / [ ] NO-GO |

**Prompt 11 Decision**: [ ] **GO** - Proceed to Prompt 12 / [ ] **NO-GO** - Rollback and investigate

---

#### Prompt 12: Soft Landing

| Criteria | Threshold | Actual | Decision |
|----------|-----------|--------|----------|
| P12 manual tests pass | 9/9 (100%) | ___/9 | [ ] GO / [ ] NO-GO |
| Soft landing triggers once per session | 100% | ___% | [ ] GO / [ ] NO-GO |
| 30-second timer works | 100% | ___% | [ ] GO / [ ] NO-GO |
| URL params cleared | 100% | ___% | [ ] GO / [ ] NO-GO |
| Section expand restores full Today | 100% | ___% | [ ] GO / [ ] NO-GO |

**Prompt 12 Decision**: [ ] **GO** - Proceed to Prompt 13 / [ ] **NO-GO** - Rollback and investigate

---

#### Prompt 13: Guardrails

| Criteria | Threshold | Actual | Decision |
|----------|-----------|--------|----------|
| P13 manual tests pass | 8/8 (100%) | ___/8 | [ ] GO / [ ] NO-GO |
| Kill-switches trigger at threshold | 100% accuracy | ___% | [ ] GO / [ ] NO-GO |
| No false positive kill-switches | 0 incidents | ___ | [ ] GO / [ ] NO-GO |
| Graceful degradation on trigger | 100% | ___% | [ ] GO / [ ] NO-GO |
| 72h observation period clean | No critical issues | ___ | [ ] GO / [ ] NO-GO |

**Prompt 13 Decision**: [ ] **GO** - Full rollout complete / [ ] **NO-GO** - Rollback and investigate

---

## Section 3: Rollback Procedures

### Per-Prompt Rollback

| Prompt | Rollback Command | Verification |
|--------|------------------|--------------|
| P9 | Revert visibility logic to default (all visible) | All Today sections visible |
| P10 | Disable resolver; return `/focus` always | StarterBlock always shows Focus |
| P11 | Remove acknowledgment component | No inline text on completion |
| P12 | Disable soft landing; ignore URL params | Full Today always shown |
| P13 | Disable kill-switches | Manual monitoring only |

### Global Rollback

```bash
# Revert all Prompt 9-13 changes
git revert --no-commit <P9-commit>..<P13-commit>
npm run build > .tmp/rollback-build.log 2>&1
npm run deploy > .tmp/rollback-deploy.log 2>&1
```

**Verification after global rollback**:
- [ ] Today page loads with all sections visible
- [ ] Focus completion stays on Focus page
- [ ] No acknowledgment text appears
- [ ] No soft landing behavior
- [ ] All existing functionality works

---

## Section 4: Validation Duration Summary

| Prompt | Minimum Duration | Observation Focus |
|--------|------------------|-------------------|
| P9 | 48 hours | State transitions, visibility correctness |
| P10 | 24 hours | Resolver accuracy, no misfires |
| P11 | 24 hours | One-per-session enforcement |
| P12 | 48 hours | Routing correctness, timer behavior |
| P13 | 72 hours | Kill-switch accuracy, no false positives |

**Total Minimum Validation**: 9 days (sequential) or 72 hours (parallel with staggered start)

---

## Section 5: Sign-Off Checklist

### Before Production Deploy

| Item | Verified By | Date |
|------|-------------|------|
| All P9-P13 manual tests pass | __________ | ____/____/____ |
| No regressions in existing E2E tests | __________ | ____/____/____ |
| Rollback procedure tested in staging | __________ | ____/____/____ |
| Kill-switches verified in staging | __________ | ____/____/____ |
| 72-hour observation window clear | __________ | ____/____/____ |

### Final Go/No-Go

| Decision | Signature | Date |
|----------|-----------|------|
| [ ] **GO** - Deploy to production | __________ | ____/____/____ |
| [ ] **NO-GO** - Defer pending issues | __________ | ____/____/____ |

**Issues blocking deployment (if NO-GO)**:
1. _________________________________________________
2. _________________________________________________
3. _________________________________________________

