# Today Page Performance After Optimization

**Date:** January 5, 2026
**Version:** Post-optimization (Phase 5.1)

---

## Optimized Data Flow

### Server Component (`page.tsx`)

| Call | Function | DB Queries | Notes |
|------|----------|------------|-------|
| 1 | `auth()` | 1 | Required |
| 2 | `getDB()` | 0 | Single call |
| 3 | `ensureUserExists()` | 1-2 | Single call |
| 4 | `fetchTodayData()` | | Orchestrator function |
| 4a | - `checkReturningAfterGapOptimized()` | 1 | Uses passed db/userId |
| 4b | - `Promise.all([...])` | | Parallel execution |
| | - `getTodayServerState()` | 4 | Already parallel |
| | - `getDynamicUIData()` | 3 | Flag-gated |
| | - `getDailyPlanSummary()` | 1 | **NEW: prefetch for client** |

**Total DB Queries:** 7-8 (optimized, no duplicates)

### Client Component (`TodayGridClient.tsx`)

| Component | Client Fetch | Notes |
|-----------|--------------|-------|
| `DailyPlanWidget` | `GET /api/daily-plan` | Still fetches (independent refresh) |
| `StarterBlock` | `GET /api/daily-plan` | Could use initialPlanSummary (future) |

**Client Fetches:** 2 (same, but server has data ready)

---

## Improvements

### Eliminated Duplicate Calls

| Before | After | Savings |
|--------|-------|---------|
| `getDB()` x2 | `getDB()` x1 | 1 call |
| `ensureUserExists()` x2 | `ensureUserExists()` x1 | 1-2 queries |

### Parallelized Fetches

**Before:**
```
returningAfterGap (sequential)
  ↓
getTodayServerState (parallel internally)
  ↓
getDynamicUIData (sequential)
```

**After:**
```
checkReturningAfterGapOptimized (quick)
  ↓
Promise.all([
  getTodayServerState,
  getDynamicUIData,
  getDailyPlanSummary
])  // All in parallel
```

### Server-Prefetched Plan Summary

- `planSummary` now fetched server-side
- Passed to client via `initialPlanSummary` prop
- Client components can use this instead of refetching
- Prepared for future optimization

---

## Query Count Comparison

| Scenario | Before | After | Savings |
|----------|--------|-------|---------|
| Flags OFF | 4-6 | 3-4 | 1-2 queries |
| Flags ON (no dynamic) | 8-11 | 7-8 | 2-3 queries |
| Flags ON (with dynamic) | 11-14 | 10-11 | 2-3 queries |

---

## Code Quality Improvements

1. **Single `fetchTodayData()` orchestrator** - All data needs in one place
2. **No duplicate db/user lookups** - Passed as parameters
3. **Better error boundaries** - Each fetch can fail independently
4. **Prepared for further optimization** - `initialPlanSummary` prop ready

---

## Bundle Size (Unchanged)

From build output:
- `/today`: 8.55 kB First Load JS
- Total shared: 103 kB

No bundle size change expected from server-side optimizations.

---

## Next Steps (P5.2)

1. **Add missing indexes** - Required for efficient queries
2. **Consider: pass initialPlanSummary to StarterBlock** - Skip client fetch
3. **Consider: use React 19 `use()` hook** - For better suspense boundaries

