# FRONT-003: Data Creation Silent Failures

**Status**: Phase 2: DOCUMENT (Root Cause Analysis) 🔍

**Severity**: CRITICAL (9/10 - Blocks Core Features - Users Can't Save Data)

**Effort**: 2-3 hours for complete fix

**Impact**: 9 data creation endpoints fail silently without user notification

**Discovery Date**: 2026-01-16 (During session deadpage investigation)

---

## Phase 1: ISSUE ✅

Users attempt to create ideas, goals, quests, calendar events, learning items, focus sessions, or workouts. UI shows optimistic update (item appears), but request fails silently without error notification. User believes data was saved but backend never persists it.

### Affected Endpoints (9 Critical)

1. POST /api/ideas - Create idea
2. POST /api/goals - Create goal
3. POST /api/quests/{id}/complete - Mark quest complete
4. POST /api/calendar - Create calendar event
5. POST /api/learn/journal - Create journal entry
6. POST /api/focus - Create focus session
7. POST /api/workouts - Create workout
8. POST /api/habits - Create habit
9. PUT /api/goals/{id} - Update goal (multiple instances)

---

## Phase 2: DOCUMENT - Root Cause Analysis ✅

### Pattern Found

All `_Client.tsx` files use identical error handling pattern:

```typescript
// ❌ WRONG: Silent failure pattern found in IdeasClient, GoalsClient, QuestsClient, etc.
const response = await safeFetch(`${API_BASE_URL}/api/endpoint`, {
  method: "POST",
  body: JSON.stringify(data),
});
if (!response.ok) {
  console.error("Failed to save item");  // ← Only console.error, NO user notification
  return;  // ← SILENT FAILURE - function returns without error handling
}
// Process response...
```

### Code Locations of Silent Failures

- [IdeasClient.tsx:173-177](../../app/frontend/src/app/(app)/ideas/IdeasClient.tsx#L173-L177) - `saveIdea()` silent return
- [GoalsClient.tsx:171-172](../../app/frontend/src/app/(app)/goals/GoalsClient.tsx#L171-L172) - `createGoal()` silent return
- [GoalsClient.tsx:200-201](../../app/frontend/src/app/(app)/goals/GoalsClient.tsx#L200-L201) - `updateGoal()` silent return
- [GoalsClient.tsx:239-240](../../app/frontend/src/app/(app)/goals/GoalsClient.tsx#L239-L240) - `deleteGoal()` silent return
- [QuestsClient.tsx:192-193](../../app/frontend/src/app/(app)/quests/QuestsClient.tsx#L192-L193) - `syncCompletionToApi()` silent return
- [QuestsClient.tsx:287-289](../../app/frontend/src/app/(app)/quests/QuestsClient.tsx#L287-L289) - Similar pattern
- [MarketClient.tsx:237-240](../../app/frontend/src/app/(app)/market/MarketClient.tsx#L237-L240)
- [MarketClient.tsx:266-270](../../app/frontend/src/app/(app)/market/MarketClient.tsx#L266-L270)
- [PlannerClient.tsx:330-333](../../app/frontend/src/app/(app)/planner/PlannerClient.tsx#L330-L333)
- [PlannerClient.tsx:347-350](../../app/frontend/src/app/(app)/planner/PlannerClient.tsx#L347-L350)

### Root Cause

1. **No error notification integration**: Clients use `console.error()` only, not `useErrorStore`
2. **Optimistic updates commit before validation**: UI shows success before server confirms
3. **No error boundary**: When response.ok=false, function silently returns with no recovery
4. **No logging**: Users don't see the failure, no way to diagnose issue

### Why This Happens

- `safeFetch` in [client.ts:445-492](../../app/frontend/src/lib/api/client.ts#L445-L492) handles 401 errors correctly
- But for other error codes (400, 500, etc.), it returns the Response object as-is
- Callers must explicitly check `response.ok` and handle errors
- Current pattern just ignores the error

### Impact Chain

```
1. User creates idea with "Save my project plan"
2. IdeasClient.saveIdea() runs:
   - Calls safeFetch(POST /api/ideas)
   - safeFetch returns Response (status 500 or 400)
3. IdeasClient checks `if (!response.ok)`:
   - Sees error but only logs to console
   - Returns silently
4. UI still shows idea (from optimistic update)
5. User thinks data was saved
6. Next refresh: Idea is gone (never persisted)
7. User data lost, no indication why
```

### Evidence

- `safeFetch` returns Response as-is without parsing errors (line 492)
- `handle401()` function shows correct pattern: Check status, notify user, take action
- Other error codes not handled by safeFetch, left to callers
- Callers implemented incorrectly: Only console.error, no useErrorStore

---

## Phase 3: EXPLORER - Discovery Work

**TODO**: Need to investigate:
- [ ] Confirm exact HTTP status codes being returned by each endpoint
- [ ] Check backend logs for error responses
- [ ] Validate schema.json matches API response formats
- [ ] Check if response bodies contain error details
- [ ] Trace optimistic update rollback logic (is there any?)
- [ ] Test with network offline to see if offline queue is triggered

### Parallel Investigation Paths

**Path A: Backend Errors**
```bash
# Check backend logs for 400/500 responses
# Validate endpoint implementations
# Confirm schema matches request/response
```

**Path B: Frontend Recovery**
```bash
# Search for optimistic update rollback patterns
# Check if any clients properly remove failed items
# Validate error recovery in useErrorStore
```

**Path C: API Client Enhancement**
```bash
# Review safeFetch implementation
# Understand offline queue behavior
# Check error notification integration
```

---

## Phase 4: DECISION - Two Solution Paths

### Option A: Enhance safeFetch with Error Notifications (RECOMMENDED)

**Approach**:
- Integrate useErrorStore into safeFetch
- Auto-notify on non-2xx responses (except 401 which is handled)
- Let callers opt-in to additional handling
- Implement optimistic update rollback helper

**Implementation**:
```typescript
// In safeFetch after response
if (!response.ok && response.status !== 401) {
  const { useErrorStore } = await import('@/lib/hooks/useErrorNotification');
  const store = useErrorStore.getState();
  store.addError({
    id: `api-${Date.now()}`,
    timestamp: new Date(),
    message: `Failed to save data (${response.status})`,
    endpoint: url,
    method: method,
    status: response.status,
    type: 'error',
  });
}
```

**Changes Needed**:
- [client.ts:445-492](../../app/frontend/src/lib/api/client.ts#L445-L492) - Enhance error handling
- All `_Client.tsx` files - Add rollback on error

**Effort**: 1.5 hours
**Pros**: 
- Centralized error handling applies to all API calls
- Minimal client-side changes
- Consistent error messages
**Cons**: 
- Less granular control per-endpoint
- All errors get same message format

---

### Option B: Update Each Client to Use useErrorStore

**Approach**:
- Modify IdeasClient, GoalsClient, etc. individually
- Each checks response.ok and calls `useErrorStore.addError()`
- Add feature-specific error messages per client
- Implement rollback for optimistic updates

**Implementation** (per client):
```typescript
const { useErrorStore } = await import('@/lib/hooks/useErrorNotification');
const { addError } = useErrorStore();

if (!response.ok) {
  addError({
    id: `idea-save-${Date.now()}`,
    timestamp: new Date(),
    message: 'Failed to save idea. Please try again.',
    endpoint: '/api/ideas',
    method: 'POST',
    status: response.status,
    type: 'error',
  });
  
  // Rollback optimistic update
  setIdeas(prev => prev.filter(i => i.id !== idea.id));
  return;
}
```

**Changes Needed**:
- IdeasClient.tsx, GoalsClient.tsx, QuestsClient.tsx, etc.
- ~10 files with multiple updates each

**Effort**: 2+ hours (repetitive across 10+ files)
**Pros**: 
- Per-feature customization possible
- Clear intent in each client
- Can add feature-specific recovery
**Cons**: 
- Repetitive code across clients
- Harder to maintain consistency
- More places to update if pattern changes

---

### Recommended Path: Option A + Partial Option B

1. **Option A first** (1.5 hours): Enhance safeFetch with error notification
2. **Then Option B selectively** (0.5 hours): Add optimistic update rollback in high-impact clients (Ideas, Goals, Quests)
3. **Result**: Centralized notification + smart rollback for critical features

---

## Phase 5: FIX - Ready After User Decision

**Blocked on**: User selection of Option A, Option B, or Hybrid approach

**Testing Plan** (after fix):
1. Test Ideas creation with network error
2. Test Goals creation with invalid data (400)
3. Test Quests completion with server error (500)
4. Verify error notification appears
5. Verify data is not persisted
6. Verify UI correctly reverts optimistic update

---

## Summary for User

**Problem**: Data creation endpoints silently fail - user sees data in UI but it's never saved to backend.

**Root Cause**: 
- Optimistic updates show data before server confirms
- When server returns error, code silently returns with no notification
- User never learns that save failed

**Solution**: 
- Add error notifications when API fails
- Rollback optimistic updates on error
- Show user what went wrong

**Effort**: 1.5-2 hours to fix completely

**Impact**: Restores user confidence that their data is actually being saved
