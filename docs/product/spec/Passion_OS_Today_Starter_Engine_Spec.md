# Passion OS Today Starter Engine Spec

**Version:** 1.0
**Date:** 2026-01-04
**Status:** Implemented (Feature Flagged)

---

## Table of Contents

1. [Baseline: Today Page Audit Summary](#1-baseline-today-page-audit-summary)
2. [Starter Engine Layer](#2-starter-engine-layer)
3. [Feature Flag Table](#3-feature-flag-table)
4. [Known Limitations and UNKNOWNs](#4-known-limitations-and-unknowns)

---

## 1. Baseline: Today Page Audit Summary

This section summarizes the pre-Starter Engine Today page behavior as documented in `Passion_OS_Ground_Truth_Audit.md`.

### 1.1 Component Structure

| Component | Location | Purpose |
|-----------|----------|---------|
| `TodayPage` | `src/app/(app)/today/page.tsx` | Server component, entry point |
| `DailyPlanWidget` | `src/app/(app)/today/DailyPlan.tsx` | Shows/generates daily plan |
| Action Cards | Inline in page.tsx | 14 navigation links to features |
| `AppShell` | `src/app/(app)/layout.tsx` | Header, Sidebar, BottomBar wrapper |

### 1.2 Baseline Sections (Pre-Starter Engine)

1. **Header**: Greeting with user's first name
2. **Daily Plan**: Shows plan items or "Plan My Day" button
3. **Get Started**: Focus, Plan Day, Quests, Exercise
4. **Production**: Shortcuts, Arrange, Reference, Templates
5. **Learn & Grow**: Learn, Infobase, Goals, Progress
6. **Rewards**: Market link and XP/coin summary

### 1.3 Baseline Behavior

- All sections always visible
- All sections always expanded
- No dominant CTA
- User must choose from 12+ action cards
- Daily plan fetched on mount via `GET /api/daily-plan`
- Plan generation via `POST /api/daily-plan` with `action: "generate"`
- Item completion via `POST /api/daily-plan` with `action: "complete_item"`

### 1.4 Baseline API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/daily-plan` | GET | Fetch today's plan |
| `/api/daily-plan` | POST | Generate plan or complete item |
| `/api/focus/[id]/complete` | POST | Complete focus session |
| `/api/focus/[id]/abandon` | POST | Abandon focus session |

---

## 2. Starter Engine Layer

The Starter Engine is a behavioral layer added on top of the baseline Today page. It is entirely controlled by feature flags and can be disabled without code changes.

### 2.1 Overview

The Starter Engine addresses decision paralysis for ADHD users by:
- Reducing visible choices based on user state
- Providing a single dominant CTA
- Acknowledging first action completion
- Smoothing the return-to-Today experience

### 2.2 Component Changes

| Component | Location | Purpose |
|-----------|----------|---------|
| `TodayGridClient` | `src/app/(app)/today/TodayGridClient.tsx` | Client wrapper, applies soft landing |
| `StarterBlock` | `src/app/(app)/today/StarterBlock.tsx` | Dominant CTA component |
| `MomentumBanner` | `src/app/(app)/today/MomentumBanner.tsx` | "Good start." feedback banner |
| `ReducedModeBanner` | `src/app/(app)/today/ReducedModeBanner.tsx` | "Welcome back" banner |
| `ExploreDrawer` | `src/app/(app)/today/ExploreDrawer.tsx` | Collapsible action cards container |

### 2.3 Logic Modules

| Module | Location | Purpose |
|--------|----------|---------|
| `todayVisibility` | `src/lib/today/todayVisibility.ts` | Section visibility rules |
| `resolveNextAction` | `src/lib/today/resolveNextAction.ts` | Starter CTA resolver |
| `momentum` | `src/lib/today/momentum.ts` | Momentum feedback state |
| `softLanding` | `src/lib/today/softLanding.ts` | Soft landing state |
| `safetyNets` | `src/lib/today/safetyNets.ts` | Validation and fallbacks |

---

### 2.4 Decision Suppression Rules

**Flag:** `TODAY_DECISION_SUPPRESSION_V1`

When enabled, section visibility is determined by user state:

| User State | StarterBlock | DailyPlan | Explore | Rewards |
|------------|--------------|-----------|---------|---------|
| First Day | Visible | Collapsed | Collapsed | Hidden |
| Returning After Gap | Visible | Collapsed | Collapsed | Hidden |
| Active Streak | Visible | Normal | Normal | Visible |
| Focus Active | Visible | Hidden | Hidden | Hidden |
| Plan Exists Incomplete | Visible | Summary | Collapsed | Visible |
| Default | Visible | Normal | Normal | Visible |

**Implementation:**
- `getTodayVisibility(userState)` returns visibility booleans
- `ensureMinimumVisibility()` safety net prevents hiding all CTAs
- When flag OFF: `getDefaultVisibility()` returns all-visible baseline

**User State Inputs:**
```typescript
interface TodayUserState {
  planExists: boolean;
  hasIncompletePlanItems: boolean;
  returningAfterGap: boolean;  // Last activity > 48h ago
  firstDay: boolean;           // No activity history
  focusActive: boolean;        // Active focus session
  activeStreak: boolean;       // Streak >= 1, recent activity
}
```

---

### 2.5 Next Action Resolver Rules

**Flag:** `TODAY_NEXT_ACTION_RESOLVER_V1`

Determines the dominant CTA in StarterBlock using a pure function:

**Priority Order:**
1. If plan exists with incomplete items:
   - Sort items by `priority` (ascending)
   - Return first incomplete item
   - CTA: "Continue: [item title]" -> item.actionUrl
2. If plan exists but all complete:
   - CTA: "Start Focus" -> /focus
3. If no plan:
   - Fallback chain: Focus -> Quests -> Learn
   - CTA: "Start Focus" -> /focus (default)

**Implementation:**
```typescript
resolveStarterAction(plan: DailyPlan | null): ResolvedAction
```

**Output Contract:**
```typescript
interface ResolvedAction {
  href: string;      // Route to navigate
  label: string;     // Button text
  reason: string;    // Why this was chosen
  type: string;      // Action type
}
```

**Safety Net:**
- `validateResolverOutput()` ensures valid href
- Invalid output falls back to `/focus`
- Missing plan fields treated as no plan

---

### 2.6 Reduced Mode (Return After Gap)

**Flag:** `TODAY_REDUCED_MODE_V1`

Triggers when user returns after 48+ hours of inactivity:

**Trigger Condition:**
- `last_activity_date` in database > 48 hours ago
- Checked server-side in `page.tsx` via `shouldShowReducedMode()`

**Behavior When Active:**
- ReducedModeBanner shows: "Welcome back. Start small."
- DailyPlanWidget force collapsed
- ExploreDrawer force collapsed
- Rewards section hidden

**Fallback:**
- If database unavailable: Normal Today (graceful degradation)
- If flag OFF: Normal Today regardless of gap

---

### 2.7 Momentum Feedback

**Flag:** `TODAY_MOMENTUM_FEEDBACK_V1`

Provides non-gamified acknowledgment after first completion in a session:

**Trigger:**
- Focus session completes successfully
- `markMomentumShown()` called after server confirmation

**Behavior:**
- MomentumBanner appears with "Good start."
- Appears once per browser session
- Dismissible via X button

**Storage:**
- Key: `sessionStorage["passion_momentum_v1"]`
- Values: `null` (pending), `"shown"`, `"dismissed"`

**State Flow:**
```
pending -> shown (on first completion)
shown -> dismissed (on user dismiss)
dismissed -> dismissed (no re-trigger in session)
```

**Copy:** "Good start." (neutral, non-celebratory, <= 5 words)

---

### 2.8 Soft Landing Routing

**Flag:** `TODAY_SOFT_LANDING_V1`

Smooths the return to Today after completing or abandoning first action:

**Triggers:**
- Focus session completes (mode === "focus")
- Focus session abandoned via reset or skip

**Behavior When Active:**
- DailyPlanWidget force collapsed
- ExploreDrawer force collapsed
- Rewards section hidden
- Sections expand when user clicks expand button

**Storage:**
- Key: `sessionStorage["passion_soft_landing_v1"]`
- Values: `null` (inactive), `"1"` (active), `"0"` (cleared)
- Source Key: `sessionStorage["passion_soft_landing_source"]`

**State Flow:**
```
inactive -> active (on first action complete/abandon)
active -> cleared (on user expands section)
cleared -> cleared (no re-trigger in session)
```

**Clearing:**
- User clicking to expand DailyPlanWidget or ExploreDrawer
- Calls `handleSectionExpand()` which triggers `clearSoftLanding()`

**Session Boundary:**
- Clears on browser close (new session)
- Persists across page refreshes within session

---

## 3. Feature Flag Table

All flags default to OFF for safety.

| Flag | Default | Kill Switch | Purpose |
|------|---------|-------------|---------|
| `TODAY_FEATURES_MASTER` | OFF | `FLAG_TODAY_FEATURES_MASTER=false` | Master kill switch for ALL Today features |
| `TODAY_DECISION_SUPPRESSION_V1` | OFF | `FLAG_TODAY_DECISION_SUPPRESSION_V1=false` | State-driven visibility rules |
| `TODAY_NEXT_ACTION_RESOLVER_V1` | OFF | `FLAG_TODAY_NEXT_ACTION_RESOLVER_V1=false` | Pure resolver for StarterBlock CTA |
| `TODAY_MOMENTUM_FEEDBACK_V1` | OFF | `FLAG_TODAY_MOMENTUM_FEEDBACK_V1=false` | "Good start." banner after completion |
| `TODAY_SOFT_LANDING_V1` | OFF | `FLAG_TODAY_SOFT_LANDING_V1=false` | Reduced Today after action complete/abandon |
| `TODAY_REDUCED_MODE_V1` | OFF | `FLAG_TODAY_REDUCED_MODE_V1=false` | Gap-based reduced mode (48h+) |

### 3.1 Flag Hierarchy

```
TODAY_FEATURES_MASTER (master switch)
  |
  +-- TODAY_DECISION_SUPPRESSION_V1
  +-- TODAY_NEXT_ACTION_RESOLVER_V1
  +-- TODAY_MOMENTUM_FEEDBACK_V1
  +-- TODAY_SOFT_LANDING_V1
  +-- TODAY_REDUCED_MODE_V1
```

If master is OFF, all child features are OFF regardless of their individual values.

### 3.2 Enabling All Features

```bash
# In .env.local or wrangler.toml [vars]
FLAG_TODAY_FEATURES_MASTER=true
FLAG_TODAY_DECISION_SUPPRESSION_V1=true
FLAG_TODAY_NEXT_ACTION_RESOLVER_V1=true
FLAG_TODAY_MOMENTUM_FEEDBACK_V1=true
FLAG_TODAY_SOFT_LANDING_V1=true
FLAG_TODAY_REDUCED_MODE_V1=true
```

### 3.3 Emergency Rollback

```bash
# Disable single feature
FLAG_TODAY_SOFT_LANDING_V1=false

# Disable ALL Today features
FLAG_TODAY_FEATURES_MASTER=false
```

---

## 4. Known Limitations and UNKNOWNs

### 4.1 Known Limitations

| Limitation | Description | Impact |
|------------|-------------|--------|
| First Day Detection | `firstDay` is stubbed as `false` | First-day visibility rules may not trigger correctly |
| Focus Active Detection | `focusActive` is stubbed as `false` | Focus-active visibility rules may not trigger correctly |
| Active Streak Detection | `activeStreak` is stubbed as `false` | Streak-based visibility rules may not trigger correctly |
| Plan State Server-Side | `planExists` and `hasIncompletePlanItems` determined client-side | Server visibility may not reflect actual plan state |

### 4.2 UNKNOWNs

| Area | Unknown | Notes |
|------|---------|-------|
| Resolver Fallback Chain | Whether Focus -> Quests -> Learn is optimal order | May need A/B testing |
| 48h Gap Threshold | Whether 48h is the right threshold for reduced mode | Hardcoded, may need tuning |
| Momentum Copy | Whether "Good start." is the best neutral message | Other options: "One step done.", "Underway." |
| Soft Landing Duration | Whether session-scoped is the right duration | Could be time-based instead |

### 4.3 Data Dependencies

| Data | Source | Available |
|------|--------|-----------|
| Daily Plan | `/api/daily-plan` | YES (client-side fetch) |
| Plan Items Priority | `plan.items[].priority` | YES |
| Last Activity Date | `activity_events` table | YES (server-side check) |
| User Streaks | Not implemented | NO (stubbed) |
| Active Focus Session | Not checked in Today | NO (stubbed) |

### 4.4 Browser Compatibility

| Storage | Requirement | Fallback |
|---------|-------------|----------|
| sessionStorage | Required for momentum/soft landing | Graceful degradation (features disabled) |
| localStorage | Required for expand/collapse persistence | Falls back to collapsed |

### 4.5 API Contracts Unchanged

The Starter Engine does NOT change any API contracts:
- `/api/daily-plan` - Same request/response shape
- `/api/focus/[id]/complete` - Same behavior
- `/api/focus/[id]/abandon` - Same behavior

All changes are client-side presentation layer only.

---

## Appendix A: File Inventory

### Logic Modules (`src/lib/today/`)

| File | Lines | Tests | Purpose |
|------|-------|-------|---------|
| `index.ts` | 87 | - | Public API exports |
| `todayVisibility.ts` | 237 | 13 | Visibility rules |
| `resolveNextAction.ts` | 185 | 21 | Action resolver |
| `momentum.ts` | 102 | 19 | Momentum state |
| `softLanding.ts` | 132 | 27 | Soft landing state |
| `safetyNets.ts` | 268 | 32 | Validation utilities |
| `README.md` | ~300 | - | Documentation |

### Components (`src/app/(app)/today/`)

| File | Type | Purpose |
|------|------|---------|
| `page.tsx` | Server | Entry point, visibility computation |
| `TodayGridClient.tsx` | Client | Soft landing wrapper, section rendering |
| `StarterBlock.tsx` | Client | Dominant CTA component |
| `MomentumBanner.tsx` | Client | Feedback banner |
| `ReducedModeBanner.tsx` | Client | Gap-return banner |
| `DailyPlan.tsx` | Client | Plan widget with collapse support |
| `ExploreDrawer.tsx` | Client | Action cards with collapse support |

---

## Appendix B: Test Coverage

| Module | Test File | Tests |
|--------|-----------|-------|
| todayVisibility | `todayVisibility.test.ts` | 13 |
| resolveNextAction | `resolveNextAction.test.ts` | 21 |
| momentum | `momentum.test.ts` | 19 |
| softLanding | `softLanding.test.ts` | 27 |
| safetyNets | `safetyNets.test.ts` | 32 |
| **Total** | | **112** |

---

## Appendix C: Related Documentation

| Document | Location | Purpose |
|----------|----------|---------|
| Ground Truth Audit | `Passion_OS_Ground_Truth_Audit.md` | Pre-implementation baseline |
| Validation Runbook | `docs/Today_Starter_Engine_Validation_Runbook.md` | QA test procedures |
| Module README | `src/lib/today/README.md` | Technical documentation |

---

**End of Spec**

