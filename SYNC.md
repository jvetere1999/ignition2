# Real-Time Sync Contracts

## Overview

This document defines the real-time synchronization requirements for each feature/page in Passion OS. Any performance optimization must preserve these contracts.

---

## Sync Mechanism Summary

| Mechanism | Description | Use Case |
|-----------|-------------|----------|
| **Polling** | Client fetches at fixed interval | Focus session status, planner events |
| **localStorage** | Local browser storage | Timer settings, paused state |
| **Storage Events** | Cross-tab localStorage sync | Tab-to-tab state sharing |
| **Optimistic Updates** | Update UI immediately, sync later | Quest completion, habit logging |

---

## Per-Feature Sync Contracts

### Focus Timer (`/focus`, BottomBar, FocusIndicator)

| Aspect | Requirement | Implementation |
|--------|-------------|----------------|
| **Cross-device sync** | Active session visible on all devices | 30s polling to `/api/focus/active` |
| **Cross-tab sync** | Paused state shared between tabs | localStorage + Storage events |
| **Staleness window** | 30 seconds | Acceptable for session status |
| **Mutation triggers** | Start/stop/pause session | Immediate POST + refetch |
| **Visibility behavior** | Continue polling when hidden | Timer accuracy required |

**Optimization constraints:**
- CANNOT increase polling interval beyond 30s
- CANNOT skip polling when tab hidden (timer must stay accurate)
- CAN deduplicate polling between BottomBar and FocusIndicator

---

### Daily Plan (`/today`)

| Aspect | Requirement | Implementation |
|--------|-------------|----------------|
| **Cross-device sync** | Plan visible on all devices | Fetch on mount |
| **Staleness window** | 5 minutes | User refreshes page for updates |
| **Mutation triggers** | Generate plan, complete item | Optimistic update + POST |
| **Visibility behavior** | No auto-refresh | User-initiated only |

**Optimization constraints:**
- CAN add focus-based refetch
- CAN add visibility-based refetch
- No strict real-time requirement

---

### Planner (`/planner`)

| Aspect | Requirement | Implementation |
|--------|-------------|----------------|
| **Cross-device sync** | Events visible on all devices | 30s polling |
| **Staleness window** | 30 seconds | Calendar accuracy |
| **Mutation triggers** | Add/edit/delete event | POST + refetch |
| **Visibility behavior** | Pause when hidden | Acceptable |

**Optimization constraints:**
- CAN pause polling when tab hidden
- CAN add focus-based refetch
- CAN reduce polling to 60s if no recent activity

---

### Quests (`/quests`)

| Aspect | Requirement | Implementation |
|--------|-------------|----------------|
| **Cross-device sync** | Progress visible on all devices | Fetch on mount |
| **Staleness window** | 1 minute | Acceptable |
| **Mutation triggers** | Update progress, complete quest | Optimistic update + POST |
| **Visibility behavior** | Refetch on focus | After >1 min away |

**Optimization constraints:**
- CAN add focus-based refetch
- No strict real-time requirement

---

### Habits (`/habits`)

| Aspect | Requirement | Implementation |
|--------|-------------|----------------|
| **Cross-device sync** | Today's logs visible on all devices | Fetch on mount |
| **Staleness window** | 1 minute | Acceptable |
| **Mutation triggers** | Log habit, create habit | Optimistic update + POST |
| **Visibility behavior** | Refetch on focus | After >1 min away |

**Optimization constraints:**
- CAN add focus-based refetch
- No strict real-time requirement

---

### Progress (`/progress`)

| Aspect | Requirement | Implementation |
|--------|-------------|----------------|
| **Cross-device sync** | Stats visible on all devices | Fetch on mount + focus refetch |
| **Staleness window** | 1 minute | Acceptable for dashboard |
| **Mutation triggers** | Focus sessions, skill updates | Refetch on focus |
| **Visibility behavior** | Refetch on focus | After >1 min away |

**Optimization constraints:**
- CAN add focus-based refetch [IMPLEMENTED]
- No strict real-time requirement

---

### Books (`/books`)

| Aspect | Requirement | Implementation |
|--------|-------------|----------------|
| **Cross-device sync** | Reading progress visible on all devices | Fetch on mount + focus refetch |
| **Staleness window** | 2 minutes | Acceptable for book tracking |
| **Mutation triggers** | Add book, log session, complete | POST + refetch |
| **Visibility behavior** | Refetch on focus | After >2 min away |

**Optimization constraints:**
- CAN add focus-based refetch [IMPLEMENTED]
- Disabled during form interactions (add book, log session)
- No strict real-time requirement

---

### Admin (`/admin`)

| Aspect | Requirement | Implementation |
|--------|-------------|----------------|
| **Cross-device sync** | Not required | Admin-only, single user |
| **Staleness window** | N/A | Manual refresh |
| **Mutation triggers** | CRUD operations | POST + refetch |
| **Visibility behavior** | No auto-refresh | Manual only |

**Optimization constraints:**
- No real-time requirements
- CAN remove any automatic polling

---

## Cross-Cutting Sync Requirements

### Authentication State

| Aspect | Requirement |
|--------|-------------|
| **Session validity** | Must be current (not expired) |
| **Cross-tab sync** | Login/logout reflected across tabs |
| **Implementation** | NextAuth session with cookies |

**Constraint:** CANNOT cache session across different users

---

### TOS Acceptance Check

| Aspect | Requirement |
|--------|-------------|
| **When checked** | On AppShell mount |
| **Staleness window** | Once per session |
| **Cross-device sync** | Acceptance persisted in D1 |

**Optimization:** CAN cache TOS check result in session/cookie

---

## Optimization Strategies (Sync-Safe)

### 1. Polling Deduplication [IMPLEMENTED]

**Before:** Both BottomBar and FocusIndicator poll `/api/focus/active` every 30s
**After:** Single polling source via FocusStateContext (shared React context)

Implementation:
- `src/lib/focus/FocusStateContext.tsx` - Centralized polling and state
- `src/components/shell/AppShell.tsx` - Wraps app with FocusStateProvider
- `src/components/shell/BottomBar.tsx` - Uses useFocusState() hook

### 2. Visibility-Based Pause

**Safe for:** Planner, Quests, Habits, Admin
**NOT safe for:** Focus timer (must keep ticking)

### 3. Focus-Based Refetch

**Pattern:** Refetch when tab regains focus after >N seconds away
**Safe for:** All features
**Staleness:** Respects per-feature staleness window

### 4. Page Unload/Reload Handling [IMPLEMENTED]

**Pattern:** Pause all refresh activity on page unload, soft refresh on reload if stale

Implementation (`src/lib/hooks/useAutoRefresh.ts`):
- Listens to `pagehide` and `beforeunload` events to pause activity
- Listens to `pageshow` for bfcache restoration
- Persists last fetch time to `sessionStorage` (keyed by `refreshKey`)
- On mount/reload, checks if data is stale and triggers soft refresh
- Respects `enabled` flag to disable during form interactions

**Behavior:**
- Page unload: All polling stops, no new fetches triggered
- Page reload: If data is stale (per staleness window), triggers soft refresh
- bfcache restore: Triggers refresh if stale, resumes polling

**Safe for:** All features with `refreshKey` configured
**Pages using this:**
- Planner (refreshKey: "planner")
- Quests (refreshKey: "quests")
- Habits (refreshKey: "habits")
- Progress (refreshKey: "progress")
- Books (refreshKey: "books")
- Daily Plan (refreshKey: "daily-plan")

### 5. Delta Fetching

**Pattern:** Use `If-None-Match` / `ETag` to avoid full payload
**Safe for:** All GET endpoints
**Requirement:** Backend must support conditional responses

### 5. Optimistic Updates with Reconciliation

**Pattern:** Update UI immediately, POST mutation, single refetch to reconcile
**Safe for:** All mutation flows
**Constraint:** Must handle conflicts (server wins)

---

## Validation Criteria

For any optimization to be shipped:

1. **Staleness preserved:** Data never older than contract specifies
2. **Triggers preserved:** All mutation triggers still cause updates
3. **Cross-device works:** Changes on one device visible on another within staleness window
4. **Cross-tab works:** localStorage sync still functions
5. **No data mixing:** User A never sees User B's data

---

## Monitoring

After deployment, monitor:
- Focus session sync complaints
- Planner event visibility issues
- Quest progress discrepancies
- Habit log sync failures

Any increase in these indicates sync regression.

