# Prompt: Repository Discovery Inventory

Follow copilot instructions to the T.

## Role
You are Claude Opus reviewing the Passion OS codebase to inventory existing behavioral logic, data structures, and decision patterns.

## Goal
Map out where behavioral signals exist, what decisions are made implicitly, and what infrastructure is already in place for the Behavior Engine.

## Deliverables
- `agent/CURRENT_STATE.md` (create if missing, update: "Phase: Discovery")
- `agent/UNKNOWN.md` (record all ambiguities with UNKNOWN-###)
- `agent/gaps.md` (record action items with ACTION-###)

## Hard Constraints
- Read-only: no code changes, no file deletions
- Repo root: `/Users/Shared/passion-os-next`
- Evidence: cite exact file paths for all claims

## Required Inputs (Read These First)

```bash
# Frontend behavior
cat app/frontend/src/pages/today.tsx
cat app/frontend/src/lib/hooks/useServerSettings.ts
find app/frontend/src -name "*decision*" -o -name "*behavior*" -o -name "*logic*"

# Backend behavior
cat app/backend/crates/api/src/routes/daily_plan.rs
cat app/backend/crates/api/src/routes/gamification.rs
find app/backend/crates/api/src -name "*behavior*" -o -name "*logic*"

# Database
ls -la app/database/migrations/ | grep -E "today|behavior|decision"
cat docs/DATA_AND_BEHAVIORAL_MODELS_REFERENCE.md

# Existing behavioral systems
find . -type f -name "*.rs" -o -name "*.tsx" | xargs grep -l "soft.landing\|momentum\|decision"
```

## Questions to Answer

1. **Existing Behavioral Logic:**
   - Where does "Quick Picks" logic live? (file + lines)
   - What signals drive Today page rendering? (frequency, recency, time-of-day, goal context)
   - Is there any existing Neo4j or graph logic? (Y/N, where?)
   - What's the current decision-making process? (hard-coded? config-driven? API-driven?)

2. **Data Availability:**
   - Does `activity_events` table exist? (schema + columns)
   - Do we track `focus_completed`, `quest_completed`, etc.? (list event types)
   - Is there pause-state tracking? (table, columns, age)
   - User timezone data? (users table column?)

3. **Frontend Signals:**
   - How does Today page currently choose which sections to show?
   - Is there client-side state management? (Zustand, Context, Redux)
   - Any existing "recent" or "suggested" logic in React?

4. **API Contracts:**
   - Does `/api/today` return a Decision payload? (schema if yes)
   - What does the current response shape look like?
   - Are there query params for filtering? (`?mode=quick` etc?)

5. **Testing Baseline:**
   - Any existing tests for Today page logic? (file + count)
   - Any integration tests? (snapshot tests for decisions?)

## Validation Requirement
No code changes. This is inventory only.

## Evidence Format
Cite file paths for all findings:
```
**Finding:** Quick Picks uses frequency only
**Evidence:** 
  - app/frontend/src/pages/today.tsx:42-58 (sorting by executionCount)
  - app/backend/crates/api/src/routes/daily_plan.rs:120-145 (no recency calc)
```

## Output Format
Update `agent/CURRENT_STATE.md`:
```markdown
# Current State - Discovery Phase

**Phase:** Discovery (in progress)
**Goal:** Map behavioral logic + data structure

## Findings

### Frontend Behavior
- Quick Picks logic: [file + lines]
- Signal used: [frequency/recency/time-of-day]
- State management: [tool + files]

### Backend Behavior
- Today API: [file + response schema]
- Activity tracking: [tables + event types]
- Existing decisions: [location + logic]

### Unknowns
- UNKNOWN-001: [question + impact + where to research]
- UNKNOWN-002: ...

### Gaps
- ACTION-001: [task + priority + time estimate]
- ACTION-002: ...
```

Update `agent/UNKNOWN.md` for each ambiguity:
```markdown
## UNKNOWN-001: Quick Picks Selection Algorithm

**Question:** What's the current algorithm for selecting 3-5 "Quick Picks"?

**Where to research:**
- app/frontend/src/pages/today.tsx
- app/backend/crates/api/src/routes/daily_plan.rs

**Why unclear:** No comments, complex logic, multiple signals possible

**Impact:** Need to understand before Phase A (extraction)

**Evidence:** [cite specific lines where unclear]
```

## Time Estimate
1-2 hours for thorough inventory.

## When Done
- POST to `agent/` three files
- Return to main prompt for next step (01_unknowns_and_gaps_init)
