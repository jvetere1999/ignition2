# Starter Momentum Feedback Specification

## Purpose

Define a non-gamified acknowledgment mechanism that confirms momentum after the first completed action in a session. This is not a reward system.

---

## Section 1: Trigger Matrix

### Trigger Conditions

| ID | Action Type | Trigger Event | First In Session | Condition |
|----|-------------|---------------|------------------|-----------|
| T1 | Focus | `focus_complete` event | YES | `sessionStorage.get("momentum_acknowledged") === null` |
| T2 | Quest | Quest status -> `completed` | YES | `sessionStorage.get("momentum_acknowledged") === null` |
| T3 | Workout | Workout session -> `completed` | YES | `sessionStorage.get("momentum_acknowledged") === null` |
| T4 | Habit | Habit check-in logged | YES | `sessionStorage.get("momentum_acknowledged") === null` |
| T5 | Plan Item | Plan item marked complete | YES | `sessionStorage.get("momentum_acknowledged") === null` |

### Trigger Requirements

1. **First completion only**: Acknowledgment appears only for the FIRST completed action in the browser session
2. **One per session**: Once acknowledged, no further acknowledgments until new browser session
3. **Action must complete**: Starting an action does not trigger; completion triggers
4. **Immediate display**: Appears within 100ms of completion event

### Non-Triggers

| Scenario | Reason |
|----------|--------|
| Starting a focus session | Not a completion |
| Abandoning a focus session | Not a successful completion |
| Viewing progress page | Passive action |
| Completing second action | Already acknowledged this session |
| Page refresh after acknowledgment | sessionStorage persists |

---

## Section 2: Copy Options

### Primary Copy (Select One)

| ID | Copy | Character Count | Tone |
|----|------|-----------------|------|
| C1 | `Session started.` | 16 | Neutral, factual |
| C2 | `First task done.` | 16 | Neutral, factual |
| C3 | `Moving forward.` | 15 | Neutral, directional |
| C4 | `Underway.` | 9 | Minimal, neutral |
| C5 | `In progress.` | 12 | Neutral, status |

### Recommended: `C1` for focus, `C2` for tasks

### Copy Selection Logic

```
IF action.type === "focus":
  copy = "Session started."
ELSE IF action.type IN ["quest", "habit", "plan_item"]:
  copy = "First task done."
ELSE IF action.type === "workout":
  copy = "Session started."
ELSE:
  copy = "Underway."
```

### Copy Constraints

- No exclamation marks
- No emoji
- No adjectives (great, awesome, good)
- No motivational language (keep going, you can do it)
- No numbers or metrics
- No personalization (your first, you did)

---

## Section 3: Placement Specification

### Component Location

| Property | Value |
|----------|-------|
| Component | Inline text element within existing page content |
| Position | Below the action's primary UI, above secondary controls |
| Z-index | Normal flow (no overlay) |
| Layout | Block-level, left-aligned |

### Page-Specific Placement

| Page | Placement |
|------|-----------|
| `/focus` | Below timer display, above mode toggle buttons |
| `/quests` | Below completed quest card, inline with list |
| `/exercise` | Below session summary, above navigation |
| `/habits` | Below checked habit item, inline with list |
| `/today` (plan item) | Below StarterBlock, above DailyPlan widget |

### Visual Properties

| Property | Value |
|----------|-------|
| Font size | `var(--font-size-sm)` |
| Font weight | `var(--font-weight-normal)` |
| Color | `var(--color-text-secondary)` |
| Background | None (transparent) |
| Border | None |
| Padding | `var(--space-2) 0` |
| Margin | `0` |

---

## Section 4: Persistence Logic

### Session Storage Key

```
Key: "momentum_acknowledged"
Value: ISO timestamp of acknowledgment
Scope: sessionStorage (browser session only)
```

### Lifecycle

```
ON page load:
  acknowledged = sessionStorage.get("momentum_acknowledged")
  IF acknowledged IS NOT NULL:
    showAcknowledgment = false

ON action complete:
  acknowledged = sessionStorage.get("momentum_acknowledged")
  IF acknowledged IS NULL:
    showAcknowledgment = true
    sessionStorage.set("momentum_acknowledged", new Date().toISOString())
  ELSE:
    showAcknowledgment = false

ON browser close:
  sessionStorage is cleared automatically
  
ON new tab (same browser):
  sessionStorage is shared; acknowledgment state persists
```

### Persistence Rules

| Scenario | Acknowledgment Shows |
|----------|---------------------|
| First completion in session | YES |
| Second completion in session | NO |
| New browser tab (same session) | NO (already acknowledged) |
| Page refresh | NO (already acknowledged) |
| Browser restart | YES (new session) |
| Incognito window | YES (new session) |
| Different browser | YES (new session) |

---

## Section 5: Dismissal Logic

### Auto-Dismissal

| Property | Value |
|----------|-------|
| Duration | 5 seconds |
| Trigger | Time-based, no user action required |
| Transition | Opacity fade to 0 over 300ms, then remove from DOM |

### Manual Dismissal

| Property | Value |
|----------|-------|
| Mechanism | None (no close button, no click-to-dismiss) |
| Reason | Minimal interaction; auto-dismiss is sufficient |

### Dismissal Behavior

```
ON acknowledgment display:
  setTimeout(() => {
    fadeOut(300ms)
    removeFromDOM()
  }, 5000)
```

### Post-Dismissal

- Element is removed from DOM (not hidden)
- No state change (sessionStorage remains set)
- No callback or event fired
- Page layout remains stable (element space collapses)

---

## Section 6: Implementation Contract

### State Interface

```typescript
interface MomentumState {
  acknowledged: boolean;
  acknowledgedAt: string | null;
}

function getMomentumState(): MomentumState {
  const stored = sessionStorage.getItem("momentum_acknowledged");
  return {
    acknowledged: stored !== null,
    acknowledgedAt: stored,
  };
}

function setMomentumAcknowledged(): void {
  sessionStorage.setItem("momentum_acknowledged", new Date().toISOString());
}

function shouldShowAcknowledgment(): boolean {
  return !getMomentumState().acknowledged;
}
```

### Component Interface

```typescript
interface MomentumAcknowledgmentProps {
  actionType: "focus" | "quest" | "workout" | "habit" | "plan_item";
  onDismiss?: () => void;
}

// Usage:
// Render only if shouldShowAcknowledgment() returns true
// Call setMomentumAcknowledged() immediately on render
```

### Constraints

- No animations (except 300ms opacity fade on dismissal)
- No sounds
- No modals or popups
- No blocking UI
- No user interaction required
- No persistence beyond browser session

---

## Section 7: Integration Points

### Focus Completion

```typescript
// In FocusClient.tsx, after handleTimerComplete
if (mode === "focus" && shouldShowAcknowledgment()) {
  setShowMomentumAck(true);
  setMomentumAcknowledged();
}
```

### Quest Completion

```typescript
// In QuestsClient.tsx, after quest marked complete
if (shouldShowAcknowledgment()) {
  setShowMomentumAck(true);
  setMomentumAcknowledged();
}
```

### Plan Item Completion

```typescript
// In DailyPlan.tsx, after item marked complete
if (shouldShowAcknowledgment()) {
  setShowMomentumAck(true);
  setMomentumAcknowledged();
}
```

---

## Section 8: Non-Requirements

This specification explicitly excludes:

| Exclusion | Reason |
|-----------|--------|
| XP display | Not a reward system |
| Coin display | Not a reward system |
| Streak display | Not a reward system |
| Progress bar | Implies gamification |
| Celebratory copy | Neutral acknowledgment only |
| Sound effects | Minimal, non-intrusive |
| Confetti/particles | No animations |
| Modal/popup | Inline only |
| Share button | Not social |
| Undo option | Acknowledgment is informational |

---

## Appendix: Copy Rationale

### Why These Words

| Copy | Rationale |
|------|-----------|
| `Session started.` | Confirms the session is now in progress; factual |
| `First task done.` | Acknowledges completion without celebration |
| `Moving forward.` | Neutral directional language; implies progress without judgment |
| `Underway.` | Minimal; confirms activity has begun |
| `In progress.` | Status indicator; factual |

### Why Not These Words

| Avoided Copy | Reason |
|--------------|--------|
| `Great job!` | Celebratory |
| `Well done!` | Celebratory |
| `Keep going!` | Motivational |
| `You're on a roll!` | Gamified language |
| `+10 XP` | Reward system |
| `Streak: 1` | Gamification |
| `First of many!` | Motivational projection |

