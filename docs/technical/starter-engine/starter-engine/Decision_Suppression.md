# Today Page Decision Suppression Logic

## Purpose

Define state-driven visibility rules for the Today page to reduce decision paralysis by dynamically limiting visible choices based on user state.

---

## Section 1: State Matrix Table

### User States

| State ID | State Name | Detection Logic | Data Source |
|----------|------------|-----------------|-------------|
| `first_day` | First day user | `created_at` within last 24 hours AND no `activity_events` | `users.created_at`, `activity_events` |
| `returning_after_gap` | Returning after gap | Last activity > 48 hours ago | `user_streaks.last_activity_date`, `activity_events.created_at` |
| `active_streak` | Active streak | Any streak `current_streak >= 1` AND `last_activity_date` is yesterday or today | `user_streaks` |
| `plan_exists` | Plan exists | Daily plan exists for today with `items.length > 0` | `/api/daily-plan` response |
| `focus_active` | Focus session active | Active focus session with `status = 'active'` | `/api/focus/active` response |

### State Combinations (Priority Order)

States are evaluated in priority order. Higher priority states override lower priority states.

| Priority | State Combination | Description |
|----------|-------------------|-------------|
| P1 | `focus_active = true` | User has active focus session |
| P2 | `first_day = true` | User's first day |
| P3 | `returning_after_gap = true` | User returning after > 48h |
| P4 | `plan_exists = true` | User has a plan for today |
| P5 | `active_streak = true` | User has active streak |
| P6 | (default) | Normal state, no special conditions |

---

## Section 2: Decision Rules (Plain Language)

### Rule 1: Focus Active State

**Condition:** User has an active focus session (`focus_active = true`)

**Rules:**
- Maximum visible CTAs: 1
- StarterBlock: Shows "Return to Focus" as single CTA
- DailyPlan: Hidden entirely (session in progress)
- ExploreDrawer: Hidden entirely (prevent distraction)
- ReducedModeBanner: Hidden
- Rewards: Hidden

**Rationale:** During active focus, minimize all distractions. Single CTA to return to the session.

---

### Rule 2: First Day State

**Condition:** User's first day (`first_day = true`, `focus_active = false`)

**Rules:**
- Maximum visible CTAs: 2
- StarterBlock: Shows "Start Focus" (primary action for new users)
- DailyPlan: Hidden (no plan exists yet)
- ExploreDrawer: Collapsed, showing only 3 quick links
- ReducedModeBanner: Hidden
- Rewards: Hidden

**Rationale:** New users need minimal choices. Focus is the core action.

---

### Rule 3: Returning After Gap State

**Condition:** Returning after gap (`returning_after_gap = true`, `focus_active = false`, `first_day = false`)

**Rules:**
- Maximum visible CTAs: 3
- StarterBlock: Visible (shows plan item or Focus fallback)
- DailyPlan: Collapsed (force collapsed via prop)
- ExploreDrawer: Collapsed (force collapsed via prop)
- ReducedModeBanner: Visible (shows 2 suggestions)
- Rewards: Hidden

**Rationale:** Reduce overwhelm for returning users. Banner provides gentle re-entry.

---

### Rule 4: Plan Exists State

**Condition:** Plan exists (`plan_exists = true`, higher priority states = false)

**Rules:**
- Maximum visible CTAs: 4
- StarterBlock: Shows first incomplete plan item
- DailyPlan: Visible, default collapsed (user can expand)
- ExploreDrawer: Collapsed by default
- ReducedModeBanner: Hidden
- Rewards: Collapsed

**Rationale:** Plan takes precedence. Daily plan drives the session, not action cards.

---

### Rule 5: Active Streak State

**Condition:** Active streak (`active_streak = true`, higher priority states = false)

**Rules:**
- Maximum visible CTAs: 6
- StarterBlock: Visible (Focus fallback)
- DailyPlan: Visible, default expanded
- ExploreDrawer: Collapsed by default (3 quick links visible)
- ReducedModeBanner: Hidden
- Rewards: Visible

**Rationale:** User is engaged. Show plan options but don't overwhelm with all cards.

---

### Rule 6: Default State

**Condition:** No special conditions apply

**Rules:**
- Maximum visible CTAs: 6
- StarterBlock: Visible (Focus fallback)
- DailyPlan: Visible, default collapsed
- ExploreDrawer: Collapsed by default (3 quick links visible)
- ReducedModeBanner: Hidden
- Rewards: Visible

**Rationale:** Baseline experience. Collapsed sections prevent overwhelm.

---

## Section 3: Visibility Map (Today Sections x States)

### Legend

| Symbol | Meaning |
|--------|---------|
| `V` | Visible (fully visible, default expanded) |
| `C` | Collapsed (visible but collapsed by default) |
| `FC` | Force Collapsed (collapsed, cannot be expanded) |
| `H` | Hidden (not rendered) |

### Visibility Matrix

| Section | `focus_active` | `first_day` | `returning_after_gap` | `plan_exists` | `active_streak` | Default |
|---------|----------------|-------------|----------------------|---------------|-----------------|---------|
| **Header** | V | V | V | V | V | V |
| **ReducedModeBanner** | H | H | V | H | H | H |
| **StarterBlock** | V (return CTA) | V (focus CTA) | V | V (plan item) | V | V |
| **DailyPlanWidget** | H | H | FC | C | V | C |
| **ExploreDrawer** | H | C | FC | C | C | C |
| **- Get Started cards** | H | C | FC | C | C | C |
| **- Production cards** | H | H | H | C | C | C |
| **- Learn & Grow cards** | H | H | H | C | C | C |
| **Rewards** | H | H | H | C | V | V |

### Maximum Visible CTAs by State

| State | Max CTAs | CTA Sources |
|-------|----------|-------------|
| `focus_active` | 1 | StarterBlock only |
| `first_day` | 2 | StarterBlock + 1 secondary |
| `returning_after_gap` | 3 | StarterBlock + 2 banner suggestions |
| `plan_exists` | 4 | StarterBlock + 3 quick links (collapsed) |
| `active_streak` | 6 | StarterBlock + 3 quick links + View Plan + Rewards |
| Default | 6 | StarterBlock + 3 quick links + View Plan + Rewards |

---

## Section 4: Boolean Visibility Map (Implementation Reference)

### State Detection Functions

```
isFirstDay(user) -> boolean
  RETURN user.created_at > (NOW - 24h) AND activityEvents.count = 0

isReturningAfterGap(user) -> boolean
  RETURN lastActivityDate < (NOW - 48h) AND NOT isFirstDay(user)

hasActiveStreak(user) -> boolean
  RETURN ANY(streaks WHERE current_streak >= 1 AND last_activity_date IN [today, yesterday])

hasPlan(user) -> boolean
  RETURN dailyPlan != null AND dailyPlan.items.length > 0

hasFocusActive(user) -> boolean
  RETURN activeFocusSession != null AND activeFocusSession.status = 'active'
```

### Visibility Computation

```
computeVisibility(user) -> VisibilityMap

  IF hasFocusActive(user):
    RETURN {
      header: VISIBLE,
      reducedModeBanner: HIDDEN,
      starterBlock: VISIBLE,
      dailyPlanWidget: HIDDEN,
      exploreDrawer: HIDDEN,
      rewards: HIDDEN,
      maxCTAs: 1
    }

  IF isFirstDay(user):
    RETURN {
      header: VISIBLE,
      reducedModeBanner: HIDDEN,
      starterBlock: VISIBLE,
      dailyPlanWidget: HIDDEN,
      exploreDrawer: COLLAPSED,
      rewards: HIDDEN,
      maxCTAs: 2
    }

  IF isReturningAfterGap(user):
    RETURN {
      header: VISIBLE,
      reducedModeBanner: VISIBLE,
      starterBlock: VISIBLE,
      dailyPlanWidget: FORCE_COLLAPSED,
      exploreDrawer: FORCE_COLLAPSED,
      rewards: HIDDEN,
      maxCTAs: 3
    }

  IF hasPlan(user):
    RETURN {
      header: VISIBLE,
      reducedModeBanner: HIDDEN,
      starterBlock: VISIBLE,
      dailyPlanWidget: COLLAPSED,
      exploreDrawer: COLLAPSED,
      rewards: COLLAPSED,
      maxCTAs: 4
    }

  IF hasActiveStreak(user):
    RETURN {
      header: VISIBLE,
      reducedModeBanner: HIDDEN,
      starterBlock: VISIBLE,
      dailyPlanWidget: VISIBLE,
      exploreDrawer: COLLAPSED,
      rewards: VISIBLE,
      maxCTAs: 6
    }

  // Default state
  RETURN {
    header: VISIBLE,
    reducedModeBanner: HIDDEN,
    starterBlock: VISIBLE,
    dailyPlanWidget: COLLAPSED,
    exploreDrawer: COLLAPSED,
    rewards: VISIBLE,
    maxCTAs: 6
  }
```

---

## Section 5: Decision Tree (Textual)

```
START
  |
  v
[Has active focus session?]
  |
  YES --> FOCUS_ACTIVE state
  |         - Show: Header, StarterBlock (return CTA)
  |         - Hide: Everything else
  |         - Max CTAs: 1
  |
  NO
  |
  v
[Is first day?]
  |
  YES --> FIRST_DAY state
  |         - Show: Header, StarterBlock
  |         - Collapse: ExploreDrawer
  |         - Hide: DailyPlan, Rewards, Banner
  |         - Max CTAs: 2
  |
  NO
  |
  v
[Returning after > 48h gap?]
  |
  YES --> RETURNING_AFTER_GAP state
  |         - Show: Header, StarterBlock, ReducedModeBanner
  |         - Force Collapse: DailyPlan, ExploreDrawer
  |         - Hide: Rewards
  |         - Max CTAs: 3
  |
  NO
  |
  v
[Has plan for today?]
  |
  YES --> PLAN_EXISTS state
  |         - Show: Header, StarterBlock
  |         - Collapse: DailyPlan, ExploreDrawer, Rewards
  |         - Hide: Banner
  |         - Max CTAs: 4
  |
  NO
  |
  v
[Has active streak?]
  |
  YES --> ACTIVE_STREAK state
  |         - Show: Header, StarterBlock, DailyPlan, Rewards
  |         - Collapse: ExploreDrawer
  |         - Hide: Banner
  |         - Max CTAs: 6
  |
  NO
  |
  v
DEFAULT state
  - Show: Header, StarterBlock, Rewards
  - Collapse: DailyPlan, ExploreDrawer
  - Hide: Banner
  - Max CTAs: 6
  |
  v
END
```

---

## Section 6: Data Requirements Summary

### Server-Side Data (fetched in page.tsx)

| Data Point | Source | Used For |
|------------|--------|----------|
| `user.created_at` | `users` table | `first_day` detection |
| `activity_events.count` | `activity_events` table | `first_day` detection |
| `last_activity_date` | `user_streaks` or `activity_events` | `returning_after_gap` detection |
| `current_streak` | `user_streaks` table | `active_streak` detection |

### Client-Side Data (fetched in components)

| Data Point | Source | Used For |
|------------|--------|----------|
| `daily_plan` | `/api/daily-plan` | `plan_exists` detection, StarterBlock |
| `active_focus_session` | `/api/focus/active` | `focus_active` detection |

---

## Section 7: Implementation Notes

### Current Implementation Status

| State | Implemented | Location |
|-------|-------------|----------|
| `returning_after_gap` | YES | `shouldShowReducedMode()` in activity-events.ts |
| `focus_active` | PARTIAL | Data available via `/api/focus/active`, not used for visibility |
| `first_day` | NO | Needs `isFirstDay()` function |
| `plan_exists` | PARTIAL | StarterBlock uses plan, not visibility |
| `active_streak` | NO | `getUserStreaks()` exists, not used for visibility |

### Required Changes (Logic Only)

1. Add `isFirstDay(db, userId)` function to activity-events.ts
2. Add `hasActiveStreak(db, userId)` function to activity-events.ts
3. Add `getUserState(db, userId)` function that returns the priority state
4. Update `TodayPage` to compute visibility map from user state
5. Pass visibility props to child components

