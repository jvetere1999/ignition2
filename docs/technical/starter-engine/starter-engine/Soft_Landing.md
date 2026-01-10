# Action Exit and Re-Entry Soft Landing Specification

## Purpose

Define what happens immediately after the first action ends (complete or abandon), controlling routing and state to prevent disengagement in high-choice environments.

---

## Section 1: Routing Table

### Post-Action Routing

| Action Type | Exit Condition | Destination Route | Query Params | Rationale |
|-------------|----------------|-------------------|--------------|-----------|
| Focus | Completed (timer ends) | `/today` | `?from=focus&status=complete` | Return to command center |
| Focus | Abandoned (user stops) | `/today` | `?from=focus&status=abandon` | Allow re-engagement |
| Focus | Break started (auto) | Stay on `/focus` | None | Continuous session |
| Quest | Completed | `/today` | `?from=quest&status=complete` | Return to command center |
| Quest | Abandoned | `/quests` | None | Allow quest selection |
| Workout | Completed | `/today` | `?from=workout&status=complete` | Return to command center |
| Workout | Abandoned | `/exercise` | None | Allow workout selection |
| Habit | Checked | Stay on current page | None | Inline action, no navigation |
| Plan Item | Completed | `/today` | `?from=plan&status=complete` | Return to next item |
| Learn | Lesson completed | `/today` | `?from=learn&status=complete` | Return to command center |

### Routing Rules

1. **Completion routes to Today**: Successful completions return user to Today for next action selection
2. **Abandonment routes to source**: Abandoned actions return user to the feature's list/selection view
3. **Inline actions stay**: Habits and quick toggles do not navigate
4. **Query params carry context**: `from` and `status` params enable soft landing mode

---

## Section 2: Soft Landing Mode

### Definition

Soft Landing Mode is a temporary, session-scoped state that presents a reduced Today view after returning from a completed action.

### Activation Conditions

| Condition | Soft Landing Activates |
|-----------|------------------------|
| `status=complete` in URL | YES |
| `status=abandon` in URL | NO |
| First action of session completed | YES |
| Second+ action of session completed | NO |
| No query params | NO |

### Detection Logic

```
isSoftLandingMode():
  params = getURLSearchParams()
  
  IF params.get("status") !== "complete":
    RETURN false
  
  sessionActions = sessionStorage.get("completed_actions_count") ?? 0
  
  IF sessionActions >= 1:
    RETURN false  // Not first action, full Today
  
  RETURN true
```

### Soft Landing Behavior

| Component | Normal Today | Soft Landing Today |
|-----------|--------------|-------------------|
| Header | Full greeting | Full greeting |
| StarterBlock | Next action from plan/fallback | Next action from plan/fallback |
| DailyPlanWidget | Collapsed by default | Force collapsed |
| ExploreDrawer | Collapsed by default | Hidden |
| Rewards | Visible | Hidden |
| ReducedModeBanner | Conditional | Hidden (not a gap return) |

### Soft Landing Duration

| Trigger | Soft Landing Ends |
|---------|-------------------|
| User expands any section | Immediately |
| User navigates away from Today | Immediately |
| 30 seconds elapsed | Automatically |
| User starts second action | Permanently for session |

---

## Section 3: Session Boundaries

### Session Definition

| Boundary Type | Definition | Storage |
|---------------|------------|---------|
| Browser Session | From tab open to tab close | `sessionStorage` |
| Action Session | From first action start to session end | `sessionStorage` |
| Today Visit | Single page view of `/today` | URL params (ephemeral) |

### Session State Keys

```
sessionStorage keys:
  - "action_session_started": ISO timestamp of first action
  - "completed_actions_count": number (0, 1, 2, ...)
  - "last_action_type": "focus" | "quest" | "workout" | "habit" | "learn"
  - "soft_landing_shown": "true" | null
```

### Session Lifecycle

```
ON browser tab open:
  action_session_started = null
  completed_actions_count = 0
  last_action_type = null
  soft_landing_shown = null

ON first action start:
  action_session_started = now()

ON action complete:
  completed_actions_count++
  last_action_type = action.type
  
ON navigate to /today with ?status=complete:
  IF completed_actions_count === 1 AND soft_landing_shown !== "true":
    showSoftLanding = true
    soft_landing_shown = "true"
  ELSE:
    showSoftLanding = false

ON browser tab close:
  All sessionStorage cleared automatically
```

---

## Section 4: One-Action vs Multi-Action Sessions

### Classification

| Session Type | Definition | Today Behavior |
|--------------|------------|----------------|
| One-Action | User completes exactly 1 action, then leaves | Soft landing on return |
| Multi-Action | User completes 2+ actions in sequence | Normal Today after first |
| Zero-Action | User browses but completes nothing | Normal Today always |

### Detection

```
getSessionType():
  count = sessionStorage.get("completed_actions_count") ?? 0
  
  IF count === 0:
    RETURN "zero_action"
  ELSE IF count === 1:
    RETURN "one_action"
  ELSE:
    RETURN "multi_action"
```

### Behavioral Differences

| Aspect | Zero-Action | One-Action | Multi-Action |
|--------|-------------|------------|--------------|
| Soft landing | Never | On first return | Never |
| Today sections | Per user state | Reduced | Full |
| StarterBlock | Normal | Emphasized | Normal |
| Auto-expand | No | No | Yes (user is engaged) |

---

## Section 5: State Transition Diagram

```
                                    +------------------+
                                    |   Browser Open   |
                                    +--------+---------+
                                             |
                                             v
                                    +------------------+
                                    |  Zero-Action     |
                                    |  Session         |
                                    +--------+---------+
                                             |
                              +--------------+--------------+
                              |                             |
                              v                             v
                    +------------------+          +------------------+
                    |  Start Action    |          |  Leave/Close     |
                    +--------+---------+          +------------------+
                             |
              +--------------+--------------+
              |                             |
              v                             v
    +------------------+          +------------------+
    |  Complete        |          |  Abandon         |
    +--------+---------+          +--------+---------+
             |                             |
             v                             v
    +------------------+          +------------------+
    |  Route to Today  |          |  Route to Source |
    |  ?status=complete|          |  (no soft land)  |
    +--------+---------+          +------------------+
             |
             v
    +------------------+
    |  One-Action      |
    |  Session         |
    |  (Soft Landing)  |
    +--------+---------+
             |
    +--------+---------+
    |                  |
    v                  v
+----------+    +------------------+
|  Leave   |    |  Start 2nd       |
|  Today   |    |  Action          |
+----------+    +--------+---------+
                         |
              +----------+----------+
              |                     |
              v                     v
    +------------------+  +------------------+
    |  Complete 2nd    |  |  Abandon 2nd     |
    +--------+---------+  +------------------+
             |
             v
    +------------------+
    |  Multi-Action    |
    |  Session         |
    |  (Normal Today)  |
    +------------------+
```

---

## Section 6: Restore Conditions

### When Full Today is Restored

| Condition | Full Today Restored | Mechanism |
|-----------|---------------------|-----------|
| User expands DailyPlanWidget | Immediately | Click event clears soft landing |
| User clicks "See More" on ExploreDrawer | Immediately | Click event clears soft landing |
| 30 seconds on Today page | Automatically | Timer-based restoration |
| User completes second action | Permanently | `completed_actions_count >= 2` |
| User navigates to any non-Today page | On next Today visit | URL params cleared |
| New browser session | Immediately | sessionStorage cleared |
| User clicks any action card | After action | Normal return flow |

### Restoration Logic

```
shouldRestoreFullToday():
  // Check session state
  count = sessionStorage.get("completed_actions_count") ?? 0
  IF count >= 2:
    RETURN true  // Multi-action session
  
  // Check URL params
  params = getURLSearchParams()
  IF params.get("status") !== "complete":
    RETURN true  // Not a completion return
  
  // Check soft landing shown
  IF sessionStorage.get("soft_landing_shown") === "true":
    RETURN true  // Already shown once
  
  // Check time elapsed
  arrivalTime = sessionStorage.get("soft_landing_arrival")
  IF arrivalTime AND (now() - arrivalTime) > 30000:
    RETURN true  // 30 seconds elapsed
  
  RETURN false
```

### Restoration Triggers (Implementation)

```typescript
// On Today page mount
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const isCompletionReturn = params.get("status") === "complete";
  
  if (isCompletionReturn) {
    sessionStorage.setItem("soft_landing_arrival", Date.now().toString());
    
    // Auto-restore after 30 seconds
    const timer = setTimeout(() => {
      setSoftLandingMode(false);
      // Clear URL params without navigation
      window.history.replaceState({}, "", "/today");
    }, 30000);
    
    return () => clearTimeout(timer);
  }
}, []);

// On section expand
const handleSectionExpand = () => {
  setSoftLandingMode(false);
  sessionStorage.setItem("soft_landing_shown", "true");
  window.history.replaceState({}, "", "/today");
};
```

---

## Section 7: URL Parameter Contract

### Incoming Parameters (to Today)

| Parameter | Values | Purpose |
|-----------|--------|---------|
| `from` | `focus`, `quest`, `workout`, `learn`, `plan` | Source action type |
| `status` | `complete`, `abandon` | Action outcome |

### Parameter Handling

```
ON Today page load:
  params = getURLSearchParams()
  from = params.get("from")
  status = params.get("status")
  
  IF status === "complete":
    incrementCompletedActions()
    IF isFirstCompletedAction():
      enableSoftLandingMode()
  
  // Clear params after processing (no history entry)
  window.history.replaceState({}, "", "/today")
```

### Parameter Lifetime

- **Set**: By source page on navigation
- **Read**: By Today on page load
- **Cleared**: Immediately after processing (replaceState)
- **Persisted**: Never (ephemeral)

---

## Section 8: Non-Requirements

This specification explicitly excludes:

| Exclusion | Reason |
|-----------|--------|
| Rewards on completion | Not a reward system |
| Notifications | No reminders or alerts |
| Component changes | Routing and state only |
| Long-term persistence | Session-scoped only |
| localStorage | sessionStorage only |
| Server-side state | Client-only state |
| Analytics tracking | Not in scope |

---

## Section 9: Integration Points

### Focus Completion

```typescript
// In FocusClient.tsx, after handleTimerComplete
if (mode === "focus") {
  // Navigate to Today with completion params
  router.push("/today?from=focus&status=complete");
}
```

### Quest Completion

```typescript
// In QuestsClient.tsx, after quest marked complete
router.push("/today?from=quest&status=complete");
```

### Workout Completion

```typescript
// In ExerciseClient.tsx, after session complete
router.push("/today?from=workout&status=complete");
```

### Today Page

```typescript
// In Today page.tsx or client component
const searchParams = useSearchParams();
const status = searchParams.get("status");
const from = searchParams.get("from");

const isSoftLanding = useMemo(() => {
  if (status !== "complete") return false;
  const count = parseInt(sessionStorage.getItem("completed_actions_count") || "0");
  return count === 1;
}, [status]);
```

---

## Appendix: State Summary

### Session Storage Keys

| Key | Type | Purpose |
|-----|------|---------|
| `action_session_started` | ISO string | When first action started |
| `completed_actions_count` | number | Count of completed actions |
| `last_action_type` | string | Type of last completed action |
| `soft_landing_shown` | "true" or null | Whether soft landing was shown |
| `soft_landing_arrival` | timestamp | When user arrived in soft landing |

### URL Parameters

| Param | Values | Lifetime |
|-------|--------|----------|
| `from` | action type | Ephemeral (cleared on read) |
| `status` | complete/abandon | Ephemeral (cleared on read) |

