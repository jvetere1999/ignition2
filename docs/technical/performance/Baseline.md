# Today Page Performance Baseline

**Date:** January 5, 2026
**Version:** Pre-optimization

---

## Current Data Flow

### Server Component (`page.tsx`)

| Call | Function | DB Queries | Notes |
|------|----------|------------|-------|
| 1 | `auth()` | 1 (session lookup) | Required |
| 2 | `getDB()` | 0 | Gets DB binding |
| 3 | `ensureUserExists()` | 1-2 (SELECT + possible INSERT) | First call |
| 4 | `checkReturningAfterGap()` | | Nested call... |
| 4a | - `getDB()` | 0 | **DUPLICATE** |
| 4b | - `ensureUserExists()` | 1-2 | **DUPLICATE** |
| 4c | - `isReturningAfterGap()` | 1 | Checks last_activity_at |
| 5 | `getTodayServerState()` | 4 (parallel) | Efficient |
| 6 | `getDynamicUIData()` | 3 (parallel) | Flag-gated |

**Total DB Queries:** 8-11 (with duplicates)

### Client Component (`TodayGridClient.tsx`)

| Component | Client Fetch | Notes |
|-----------|--------------|-------|
| `DailyPlanWidget` | `GET /api/daily-plan` | Fetches plan again |
| `StarterBlock` | `GET /api/daily-plan` | **DUPLICATE** |

**Client Fetches:** 2 (1 duplicate)

---

## Issues Identified

### Issue 1: Duplicate `ensureUserExists()` Calls
- Called in `TodayPage` main body
- Called again in `checkReturningAfterGap()`
- **Impact:** 1-2 extra DB queries per page load

### Issue 2: Duplicate `getDB()` Calls
- Called in `TodayPage` main body
- Called again in `checkReturningAfterGap()`
- **Impact:** Minor overhead, code duplication

### Issue 3: Client-Side Plan Refetch
- Server has access to plan data via `getTodayServerState()`
- Client fetches plan again in `DailyPlanWidget` and `StarterBlock`
- **Impact:** 2 unnecessary API calls

### Issue 4: Sequential Awaits
- `checkReturningAfterGap()` runs before `getTodayServerState()`
- Could be parallelized if they share the db/user

---

## Query Patterns

### High-Frequency Queries (per Today page load)

1. `SELECT * FROM users WHERE id = ?` - User lookup
2. `SELECT approved, age_verified FROM users WHERE id = ?` - Auth check
3. `SELECT last_activity_at FROM users WHERE id = ?` - Gap check
4. `SELECT * FROM daily_plans WHERE user_id = ? AND plan_date = ?` - Plan lookup
5. `SELECT 1 FROM activity_events WHERE user_id = ? LIMIT 1` - First day check
6. `SELECT * FROM focus_sessions WHERE user_id = ? AND status = 'active'` - Active focus
7. `SELECT current_streak, last_activity_date FROM user_streaks WHERE user_id = ?` - Streak check

### Indexes Required

| Table | Column(s) | Exists? |
|-------|-----------|---------|
| daily_plans | (user_id, plan_date) | **NO** |
| activity_events | (user_id, created_at) | **NO** |
| focus_sessions | (user_id, status) | PARTIAL |
| user_streaks | (user_id) | YES |

---

## Bundle Size (Today route)

From build output:
- `/today`: 8.55 kB First Load JS
- Total shared: 103 kB

---

## Recommendations

1. **Eliminate duplicate calls** - Pass db/user to `checkReturningAfterGap()`
2. **Parallelize all server queries** - Single Promise.all for all state
3. **Pass plan data to client** - Avoid client refetch
4. **Add missing indexes** - See P5.2
5. **Consider caching** - User state rarely changes mid-session

