# Default Next Action Resolver

## Purpose

A pure, deterministic function that answers:
> "If the user takes no further decisions, what should the system do next?"

This resolver does not render UI. It only returns an action target.

---

## Section 1: Function Signature

### TypeScript Signature

```typescript
type ActionType = 
  | "focus"
  | "focus_return"
  | "plan_item"
  | "quest"
  | "workout"
  | "learning"
  | "habit"
  | "noop";

interface ResolvedAction {
  /** The action type for categorization */
  type: ActionType;
  /** The route to navigate to, or null for noop */
  route: string | null;
  /** Human-readable label for the action */
  label: string;
  /** Source of the action decision */
  source: "active_session" | "plan" | "fallback" | "noop";
  /** Optional entity ID if action targets a specific item */
  entityId?: string;
}

interface UserState {
  // Required fields
  userId: string;
  
  // Session state
  activeFocusSession: ActiveFocusSession | null;
  
  // Plan state
  dailyPlan: DailyPlan | null;
  
  // Activity state (optional - for fallback logic)
  lastActivityDate: string | null;
  isFirstDay: boolean;
  
  // Current context (optional)
  currentRoute?: string;
}

interface ActiveFocusSession {
  id: string;
  status: "active" | "paused";
  mode: "focus" | "break" | "long_break";
  startedAt: string;
  plannedDuration: number;
}

interface DailyPlan {
  id: string;
  date: string;
  items: PlanItem[];
  completedCount: number;
  totalCount: number;
}

interface PlanItem {
  id: string;
  type: "focus" | "quest" | "workout" | "learning" | "habit";
  title: string;
  actionUrl: string;
  completed: boolean;
  priority: number;
}

/**
 * Resolves the default next action for a user.
 * Pure function - no side effects, no external calls.
 * 
 * @param state - The current user state
 * @returns The resolved action to take
 */
function resolveNextAction(state: UserState): ResolvedAction
```

---

## Section 2: Input Contract

### Required Fields

| Field | Type | Description | Validation |
|-------|------|-------------|------------|
| `userId` | `string` | User identifier | Non-empty string |
| `activeFocusSession` | `ActiveFocusSession \| null` | Current focus session if any | Must be valid object or null |
| `dailyPlan` | `DailyPlan \| null` | Today's plan if any | Must be valid object or null |

### Optional Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `lastActivityDate` | `string \| null` | `null` | ISO date of last activity |
| `isFirstDay` | `boolean` | `false` | Whether user is on first day |
| `currentRoute` | `string` | `undefined` | Current page route |

### Field Relationships

- If `activeFocusSession` is non-null, its `status` determines if user should return to focus
- If `dailyPlan` is non-null, items are filtered by `completed = false` and sorted by `priority`
- `currentRoute` is used only to prevent redundant navigation (noop case)

---

## Section 3: Resolver Priority Table

| Priority | Condition | Action Type | Route | Source | Justification |
|----------|-----------|-------------|-------|--------|---------------|
| P1 | `activeFocusSession.status === "active"` | `focus_return` | `/focus` | `active_session` | Active session takes absolute precedence. User has already committed. |
| P2 | `activeFocusSession.status === "paused"` | `focus_return` | `/focus` | `active_session` | Paused session should be resumed before starting new work. |
| P3 | `dailyPlan` has incomplete items | `plan_item` | First incomplete item's `actionUrl` | `plan` | User created a plan; respect their intention. |
| P4 | `isFirstDay === true` | `focus` | `/focus` | `fallback` | New users should start with Focus as the core experience. |
| P5 | No plan, no session | `focus` | `/focus` | `fallback` | Focus is the atomic unit of productivity in Passion OS. |
| P6 | `currentRoute === resolvedRoute` | `noop` | `null` | `noop` | User is already on the target page; no action needed. |

### Priority Justification

1. **Active session first**: An active focus session represents the user's current commitment. Breaking this would violate user intent.

2. **Paused session second**: A paused session is an incomplete commitment. Resume before starting new work.

3. **Plan items third**: The user explicitly planned their day. The plan is their stated intention.

4. **First day fourth**: New users need a clear starting point. Focus is the core action.

5. **Focus fallback fifth**: When no other signals exist, Focus is the default productive action.

6. **Noop last**: Prevents unnecessary navigation when user is already at the target.

---

## Section 4: Resolution Algorithm (Pseudocode)

```
FUNCTION resolveNextAction(state: UserState) -> ResolvedAction:

  // P1: Active focus session
  IF state.activeFocusSession IS NOT NULL:
    IF state.activeFocusSession.status === "active":
      resolved = {
        type: "focus_return",
        route: "/focus",
        label: "Return to Focus",
        source: "active_session",
        entityId: state.activeFocusSession.id
      }
      GOTO CHECK_NOOP

    // P2: Paused focus session
    IF state.activeFocusSession.status === "paused":
      resolved = {
        type: "focus_return",
        route: "/focus",
        label: "Resume Focus",
        source: "active_session",
        entityId: state.activeFocusSession.id
      }
      GOTO CHECK_NOOP

  // P3: Daily plan with incomplete items
  IF state.dailyPlan IS NOT NULL:
    incompleteItems = state.dailyPlan.items
      .FILTER(item => item.completed === false)
      .SORT_BY(item => item.priority ASC)

    IF incompleteItems.length > 0:
      firstItem = incompleteItems[0]
      resolved = {
        type: mapPlanItemType(firstItem.type),
        route: firstItem.actionUrl,
        label: firstItem.title,
        source: "plan",
        entityId: firstItem.id
      }
      GOTO CHECK_NOOP

  // P4: First day user
  IF state.isFirstDay === true:
    resolved = {
      type: "focus",
      route: "/focus",
      label: "Start Focus",
      source: "fallback"
    }
    GOTO CHECK_NOOP

  // P5: Default fallback
  resolved = {
    type: "focus",
    route: "/focus",
    label: "Start Focus",
    source: "fallback"
  }

  CHECK_NOOP:
  // P6: Check if already on target route
  IF state.currentRoute IS NOT NULL:
    IF state.currentRoute === resolved.route:
      RETURN {
        type: "noop",
        route: null,
        label: "No action needed",
        source: "noop"
      }

  RETURN resolved


FUNCTION mapPlanItemType(type: string) -> ActionType:
  SWITCH type:
    CASE "focus": RETURN "focus"
    CASE "quest": RETURN "quest"
    CASE "workout": RETURN "workout"
    CASE "learning": RETURN "learning"
    CASE "habit": RETURN "habit"
    DEFAULT: RETURN "focus"
```

---

## Section 5: Example Resolution Cases

### Case 1: Active Focus Session

**Input:**
```json
{
  "userId": "user_123",
  "activeFocusSession": {
    "id": "session_456",
    "status": "active",
    "mode": "focus",
    "startedAt": "2026-01-04T10:00:00Z",
    "plannedDuration": 1500
  },
  "dailyPlan": null,
  "isFirstDay": false
}
```

**Output:**
```json
{
  "type": "focus_return",
  "route": "/focus",
  "label": "Return to Focus",
  "source": "active_session",
  "entityId": "session_456"
}
```

**Reason:** Active session takes P1 priority.

---

### Case 2: Plan with Incomplete Items

**Input:**
```json
{
  "userId": "user_123",
  "activeFocusSession": null,
  "dailyPlan": {
    "id": "plan_789",
    "date": "2026-01-04",
    "items": [
      { "id": "item_1", "type": "focus", "title": "Deep work", "actionUrl": "/focus", "completed": true, "priority": 1 },
      { "id": "item_2", "type": "quest", "title": "Review PR", "actionUrl": "/quests/quest_abc", "completed": false, "priority": 2 },
      { "id": "item_3", "type": "workout", "title": "Morning run", "actionUrl": "/exercise", "completed": false, "priority": 3 }
    ],
    "completedCount": 1,
    "totalCount": 3
  },
  "isFirstDay": false
}
```

**Output:**
```json
{
  "type": "quest",
  "route": "/quests/quest_abc",
  "label": "Review PR",
  "source": "plan",
  "entityId": "item_2"
}
```

**Reason:** First incomplete item (priority 2) is the quest "Review PR".

---

### Case 3: First Day User

**Input:**
```json
{
  "userId": "user_new",
  "activeFocusSession": null,
  "dailyPlan": null,
  "isFirstDay": true,
  "lastActivityDate": null
}
```

**Output:**
```json
{
  "type": "focus",
  "route": "/focus",
  "label": "Start Focus",
  "source": "fallback"
}
```

**Reason:** New user with no plan; Focus is the default action.

---

### Case 4: Already on Target Route (Noop)

**Input:**
```json
{
  "userId": "user_123",
  "activeFocusSession": null,
  "dailyPlan": null,
  "isFirstDay": false,
  "currentRoute": "/focus"
}
```

**Output:**
```json
{
  "type": "noop",
  "route": null,
  "label": "No action needed",
  "source": "noop"
}
```

**Reason:** User is already on `/focus`; navigation would be redundant.

---

### Case 5: All Plan Items Completed

**Input:**
```json
{
  "userId": "user_123",
  "activeFocusSession": null,
  "dailyPlan": {
    "id": "plan_789",
    "date": "2026-01-04",
    "items": [
      { "id": "item_1", "type": "focus", "title": "Deep work", "actionUrl": "/focus", "completed": true, "priority": 1 },
      { "id": "item_2", "type": "quest", "title": "Review PR", "actionUrl": "/quests/quest_abc", "completed": true, "priority": 2 }
    ],
    "completedCount": 2,
    "totalCount": 2
  },
  "isFirstDay": false
}
```

**Output:**
```json
{
  "type": "focus",
  "route": "/focus",
  "label": "Start Focus",
  "source": "fallback"
}
```

**Reason:** All items completed; fallback to Focus.

---

### Case 6: Paused Session with Plan

**Input:**
```json
{
  "userId": "user_123",
  "activeFocusSession": {
    "id": "session_456",
    "status": "paused",
    "mode": "focus",
    "startedAt": "2026-01-04T10:00:00Z",
    "plannedDuration": 1500
  },
  "dailyPlan": {
    "id": "plan_789",
    "date": "2026-01-04",
    "items": [
      { "id": "item_1", "type": "quest", "title": "Urgent task", "actionUrl": "/quests/quest_xyz", "completed": false, "priority": 1 }
    ],
    "completedCount": 0,
    "totalCount": 1
  },
  "isFirstDay": false
}
```

**Output:**
```json
{
  "type": "focus_return",
  "route": "/focus",
  "label": "Resume Focus",
  "source": "active_session",
  "entityId": "session_456"
}
```

**Reason:** Paused session (P2) takes precedence over plan items (P3).

---

## Section 6: Edge Case Handling

### Missing or Invalid Data

| Scenario | Handling | Result |
|----------|----------|--------|
| `userId` is empty string | Invalid input | Return noop with error label |
| `activeFocusSession` is malformed | Treat as null | Skip to plan check |
| `dailyPlan.items` is undefined | Treat as empty array | Skip to fallback |
| `planItem.actionUrl` is empty | Skip item | Check next incomplete item |
| `planItem.priority` is undefined | Default to 999 | Sort last |

### Stale Data

| Scenario | Handling | Result |
|----------|----------|--------|
| `activeFocusSession.startedAt` > 24h ago | Session is stale | Treat as null (should be auto-abandoned) |
| `dailyPlan.date` !== today | Plan is stale | Treat as null |
| `planItem.completed` is undefined | Treat as false | Include in incomplete items |

### Concurrent States

| Scenario | Resolution |
|----------|------------|
| Active session AND plan exists | Session wins (P1 > P3) |
| Paused session AND first day | Session wins (P2 > P4) |
| Multiple incomplete items | Lowest priority number wins |
| Items with same priority | First in array order wins |

### Empty States

| Scenario | Result |
|----------|--------|
| No session, no plan, not first day | Fallback to Focus |
| Empty `dailyPlan.items` array | Fallback to Focus |
| All items completed | Fallback to Focus |
| `dailyPlan` is null | Fallback to Focus |

---

## Section 7: Implementation Contract

### Guarantees

1. **Purity**: Function has no side effects. Same input always produces same output.
2. **Determinism**: Resolution order is fixed and documented.
3. **Completeness**: Every valid input produces a valid output.
4. **Safety**: Invalid inputs produce noop, not errors.

### Invariants

1. `route` is never empty string (always valid route or null)
2. `type` is always a valid ActionType
3. `source` is always a valid source identifier
4. If `type` is "noop", then `route` is null
5. If `type` is not "noop", then `route` is non-null

### Performance

- Time complexity: O(n) where n = number of plan items
- Space complexity: O(1) (no allocations beyond return object)
- No I/O operations
- No async operations

---

## Section 8: State Acquisition (Out of Scope)

The resolver does not fetch data. The caller is responsible for providing:

| Data | Suggested Source |
|------|------------------|
| `activeFocusSession` | `/api/focus/active` response |
| `dailyPlan` | `/api/daily-plan` response |
| `isFirstDay` | Computed from `users.created_at` |
| `lastActivityDate` | `user_streaks.last_activity_date` |
| `currentRoute` | `window.location.pathname` or router state |

---

## Appendix: Type Definitions (Full)

```typescript
// Action types that can be resolved
type ActionType = 
  | "focus"
  | "focus_return"
  | "plan_item"
  | "quest"
  | "workout"
  | "learning"
  | "habit"
  | "noop";

// The result of action resolution
interface ResolvedAction {
  type: ActionType;
  route: string | null;
  label: string;
  source: "active_session" | "plan" | "fallback" | "noop";
  entityId?: string;
}

// Session status for focus
interface ActiveFocusSession {
  id: string;
  status: "active" | "paused";
  mode: "focus" | "break" | "long_break";
  startedAt: string;
  plannedDuration: number;
}

// Daily plan with items
interface DailyPlan {
  id: string;
  date: string;
  items: PlanItem[];
  completedCount: number;
  totalCount: number;
}

// Individual plan item
interface PlanItem {
  id: string;
  type: "focus" | "quest" | "workout" | "learning" | "habit";
  title: string;
  actionUrl: string;
  completed: boolean;
  priority: number;
}

// Full user state input
interface UserState {
  userId: string;
  activeFocusSession: ActiveFocusSession | null;
  dailyPlan: DailyPlan | null;
  lastActivityDate?: string | null;
  isFirstDay?: boolean;
  currentRoute?: string;
}
```

