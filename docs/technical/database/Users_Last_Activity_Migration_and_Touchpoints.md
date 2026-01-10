# Users Last Activity Migration and Touchpoints

**Version:** 1.0
**Date:** 2026-01-04
**Status:** Ready for Implementation

---

## Table of Contents

1. [Migration SQL](#1-migration-sql)
2. [Backfill Strategy](#2-backfill-strategy)
3. [Exact Code Touchpoints](#3-exact-code-touchpoints)
4. [Risk Notes and Rollback](#4-risk-notes-and-rollback)
5. [Validation Checklist](#5-validation-checklist)

---

## 1. Migration SQL

### 1.1 Migration File

**File:** `migrations/0013_add_users_last_activity.sql`

```sql
-- Migration: 0013_add_users_last_activity.sql
-- Add last_activity_at column to users table for efficient activity tracking
-- 
-- Column type: TEXT (ISO 8601 timestamp string)
-- Justification: D1/SQLite TEXT aligns with existing timestamp columns
--   (created_at, updated_at use TEXT). Consistent with project conventions.
--   ISO string allows direct comparison and human-readable debugging.

-- Add last_activity_at column (nullable for backward compatibility)
ALTER TABLE users ADD COLUMN last_activity_at TEXT;

-- Index for efficient queries (e.g., finding inactive users)
CREATE INDEX IF NOT EXISTS idx_users_last_activity ON users(last_activity_at);

-- Backfill from activity_events table
-- Sets last_activity_at to the most recent activity event per user
UPDATE users
SET last_activity_at = (
    SELECT MAX(created_at)
    FROM activity_events
    WHERE activity_events.user_id = users.id
)
WHERE EXISTS (
    SELECT 1 FROM activity_events WHERE activity_events.user_id = users.id
);
```

### 1.2 Down Migration (Manual Rollback)

```sql
-- Rollback: 0013_add_users_last_activity.sql
-- Run manually if rollback needed

DROP INDEX IF EXISTS idx_users_last_activity;

-- SQLite does not support DROP COLUMN directly
-- To remove column, recreate table (expensive, only for full rollback)
-- In practice, leave column and ignore it

-- Alternative: Just stop updating and using the column
-- The column will remain but be unused
```

---

## 2. Backfill Strategy

### 2.1 Approach: In-Migration Backfill

**Decision:** Backfill inline during migration using `activity_events.created_at`.

**Rationale:**
- `activity_events` table already tracks all user activities
- Has index on `user_id` and `created_at` for efficient queries
- Single SQL statement, atomic with migration
- No separate job required

### 2.2 Backfill Query Analysis

```sql
UPDATE users
SET last_activity_at = (
    SELECT MAX(created_at)
    FROM activity_events
    WHERE activity_events.user_id = users.id
)
WHERE EXISTS (
    SELECT 1 FROM activity_events WHERE activity_events.user_id = users.id
);
```

**Performance Notes:**
- Uses existing index `idx_activity_events_user`
- Subquery per user, but user count is bounded
- For 1,000 users with 100k events: ~1-2 seconds expected
- For 10,000 users: may take 5-10 seconds
- D1 has statement timeout of 30s - should be safe

### 2.3 Alternative Considered: No Backfill

**Rejected because:**
- Reduced mode check currently uses `MAX(activity_events.created_at)` per request
- Having `last_activity_at` on users enables O(1) lookup
- Backfill is safe and bounded

### 2.4 Users Without Activity

Users with no activity events will have `last_activity_at = NULL`.

**Handling:**
- `shouldShowReducedMode()` already handles null (returns false)
- New users will get `last_activity_at` updated on first activity
- Null-safe comparison in all reads

---

## 3. Exact Code Touchpoints

### 3.1 New Helper Function

**File:** `src/lib/db/repositories/users.ts`

**Add function:**

```typescript
/**
 * Update user's last activity timestamp
 * Best-effort update - failure does not propagate
 * 
 * @param db - D1 database instance
 * @param userId - User ID to update
 * @param timestamp - ISO timestamp (defaults to now)
 */
export async function touchUserActivity(
  db: D1Database,
  userId: string,
  timestamp?: string
): Promise<void> {
  const now = timestamp || new Date().toISOString();
  try {
    await db
      .prepare(`UPDATE users SET last_activity_at = ?, updated_at = datetime('now') WHERE id = ?`)
      .bind(now, userId)
      .run();
  } catch (error) {
    // Best-effort: log but don't throw
    console.error(`[touchUserActivity] Failed to update last_activity_at for user ${userId}:`, error);
  }
}
```

### 3.2 Integrate into logActivityEvent

**File:** `src/lib/db/repositories/activity-events.ts`

**Location:** Inside `logActivityEvent()` function, after inserting the activity event.

**Current code (line ~90-95):**
```typescript
  // Insert activity event
  await db
    .prepare(`INSERT INTO activity_events ...`)
    .bind(...)
    .run();

  // Update user progress
  if (xpEarned > 0 || coinsEarned > 0) {
    await updateUserProgress(db, userId, xpEarned, coinsEarned, skillId);
  }
```

**Add after activity event insert:**
```typescript
  // Insert activity event
  await db
    .prepare(`INSERT INTO activity_events ...`)
    .bind(...)
    .run();

  // Update user's last activity timestamp (best-effort)
  await touchUserActivity(db, userId, now);

  // Update user progress
  if (xpEarned > 0 || coinsEarned > 0) {
    await updateUserProgress(db, userId, xpEarned, coinsEarned, skillId);
  }
```

**Import required:**
```typescript
import { touchUserActivity } from "./users";
```

### 3.3 Update shouldShowReducedMode

**File:** `src/lib/db/repositories/activity-events.ts`

**Current implementation (line ~293):**
```typescript
export async function shouldShowReducedMode(db: D1Database, userId: string): Promise<boolean> {
  const lastActivityDate = await getLastActivityDate(db, userId);
  // ...
}
```

**Updated implementation:**
```typescript
/**
 * Check if user should see reduced mode (inactive for > 48 hours)
 * Uses users.last_activity_at if available, falls back to activity_events query
 */
export async function shouldShowReducedMode(db: D1Database, userId: string): Promise<boolean> {
  // Try to get from users.last_activity_at first (O(1))
  const user = await db
    .prepare(`SELECT last_activity_at FROM users WHERE id = ?`)
    .bind(userId)
    .first<{ last_activity_at: string | null }>();

  let lastActivityDate: string | null = user?.last_activity_at || null;

  // Fallback to activity_events query if users.last_activity_at is null
  // (for users who haven't been updated yet or have no activity)
  if (!lastActivityDate) {
    lastActivityDate = await getLastActivityDate(db, userId);
  }

  if (!lastActivityDate) {
    // No activity recorded - could be new user, show normal mode
    return false;
  }

  const lastActivity = new Date(lastActivityDate);
  const now = new Date();
  const hoursSinceActivity = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60);

  return hoursSinceActivity > 48;
}
```

### 3.4 Update User Type

**File:** `src/lib/db/types.ts`

**Add to User type (if exists) or create:**

```typescript
// In the users section, add to any User interface
export interface User {
  id: string;
  name: string | null;
  email: string | null;
  emailVerified: number | null;
  image: string | null;
  created_at: string;
  updated_at: string;
  last_activity_at: string | null;  // NEW
}
```

### 3.5 Events That Trigger Update

Because `touchUserActivity` is called inside `logActivityEvent`, all of these event types will automatically update `last_activity_at`:

| Event Type | API Route | Already Uses logActivityEvent |
|------------|-----------|-------------------------------|
| `focus_start` | `/api/focus` POST | YES |
| `focus_complete` | `/api/focus/[id]/complete` POST | YES |
| `habit_complete` | `/api/habits` POST | YES |
| `quest_complete` | (via logActivityEvent) | YES |
| `workout_complete` | (via logActivityEvent) | YES |
| `lesson_complete` | (via logActivityEvent) | YES |
| `review_complete` | (via logActivityEvent) | YES |

**No additional touchpoints needed** - the centralized approach means all activity types update `last_activity_at` automatically.

---

## 4. Risk Notes and Rollback

### 4.1 Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Migration timeout | Low | Medium | Backfill is bounded; D1 30s timeout sufficient |
| Backfill incorrect data | Low | Low | Uses existing verified `activity_events.created_at` |
| touchUserActivity failure | Low | None | Best-effort with try/catch; doesn't affect primary action |
| Type mismatch | Low | Low | TEXT type matches existing convention |

### 4.2 Rollback Procedure

**Level 1: Stop Using (No Migration Rollback)**
1. Revert code changes to `shouldShowReducedMode()` (use fallback only)
2. Remove `touchUserActivity()` call from `logActivityEvent()`
3. Column remains but is unused

**Level 2: Full Rollback (Requires Table Rebuild)**
```sql
-- SQLite doesn't support DROP COLUMN
-- Must recreate table without column
-- NOT RECOMMENDED for production data
```

### 4.3 Backward Compatibility

- **Existing rows:** `last_activity_at` is NULL, handled gracefully
- **New rows:** `last_activity_at` set on first activity
- **Fallback query:** Still works if column is NULL
- **No API changes:** Internal implementation only

---

## 5. Validation Checklist

### 5.1 Migration Validation

```
[ ] Migration file created: migrations/0013_add_users_last_activity.sql
[ ] Migration applies locally: wrangler d1 migrations apply passion_os --local
[ ] Migration applies to preview: wrangler d1 migrations apply passion_os --remote --env preview
[ ] Column exists: SELECT last_activity_at FROM users LIMIT 1;
[ ] Index exists: SELECT name FROM sqlite_master WHERE type='index' AND name='idx_users_last_activity';
[ ] Backfill ran: SELECT COUNT(*) FROM users WHERE last_activity_at IS NOT NULL;
```

### 5.2 Code Validation

```
[ ] touchUserActivity function added to users.ts
[ ] touchUserActivity imported in activity-events.ts
[ ] touchUserActivity called in logActivityEvent
[ ] shouldShowReducedMode updated to use users.last_activity_at
[ ] User type updated in types.ts
[ ] Build passes: npm run build
[ ] Unit tests pass: npm run test:unit
```

### 5.3 Runtime Validation

**Test Case 1: Focus Complete Updates last_activity_at**
```
1. Note user's current last_activity_at: SELECT last_activity_at FROM users WHERE id = '<user_id>';
2. Complete a focus session
3. Check updated: SELECT last_activity_at FROM users WHERE id = '<user_id>';
4. Verify: last_activity_at should be within last minute
```

**Test Case 2: Habit Complete Updates last_activity_at**
```
1. Note user's current last_activity_at
2. Complete a habit
3. Check updated
4. Verify: last_activity_at should be updated
```

**Test Case 3: Null-Safe Read**
```
1. Create user with no activity (last_activity_at = NULL)
2. Call shouldShowReducedMode for user
3. Verify: Returns false (not reduced mode)
4. Verify: No error thrown
```

**Test Case 4: Reduced Mode Detection**
```
1. Set user's last_activity_at to 3 days ago: 
   UPDATE users SET last_activity_at = datetime('now', '-3 days') WHERE id = '<user_id>';
2. Navigate to /today
3. Verify: If FLAG_TODAY_REDUCED_MODE_V1=true, reduced mode banner shows
4. Complete an action
5. Verify: last_activity_at updated to now
6. Refresh /today
7. Verify: Reduced mode no longer active
```

### 5.4 Database Version Update

**File:** `src/app/api/admin/backup/route.ts`

Update version constants:
```typescript
const CURRENT_DB_VERSION = 13;
const CURRENT_DB_VERSION_NAME = "add_users_last_activity";
```

**File:** `src/app/api/admin/restore/route.ts`

Update version and add migration:
```typescript
const CURRENT_DB_VERSION = 13;

// In migrateData function, add:
if (version < 13) {
  // users.last_activity_at migration
  // No data migration needed - column is derived from activity_events
  version = 13;
}
```

---

## Appendix A: Complete Migration File

**File:** `migrations/0013_add_users_last_activity.sql`

```sql
-- Migration: 0013_add_users_last_activity.sql
-- Add last_activity_at column to users table for efficient activity tracking
--
-- Purpose: Enables O(1) lookup for reduced mode check instead of
--          scanning activity_events table per request.
--
-- Type: TEXT (ISO 8601 timestamp string)
-- Nullable: YES (backward compatible with existing rows)
-- Updated by: logActivityEvent() in activity-events.ts

-- Add column
ALTER TABLE users ADD COLUMN last_activity_at TEXT;

-- Add index for efficient queries
CREATE INDEX IF NOT EXISTS idx_users_last_activity ON users(last_activity_at);

-- Backfill from activity_events (most recent per user)
UPDATE users
SET last_activity_at = (
    SELECT MAX(created_at)
    FROM activity_events
    WHERE activity_events.user_id = users.id
)
WHERE EXISTS (
    SELECT 1 FROM activity_events WHERE activity_events.user_id = users.id
);
```

---

## Appendix B: Complete touchUserActivity Implementation

**File:** `src/lib/db/repositories/users.ts`

```typescript
/**
 * Update user's last activity timestamp
 * 
 * Best-effort update - failure does not propagate to caller.
 * This ensures the primary action (focus complete, habit complete, etc.)
 * is not affected by a failure to update last_activity_at.
 * 
 * @param db - D1 database instance
 * @param userId - User ID to update
 * @param timestamp - ISO timestamp (defaults to now)
 */
export async function touchUserActivity(
  db: D1Database,
  userId: string,
  timestamp?: string
): Promise<void> {
  const now = timestamp || new Date().toISOString();
  try {
    await db
      .prepare(
        `UPDATE users SET last_activity_at = ?, updated_at = datetime('now') WHERE id = ?`
      )
      .bind(now, userId)
      .run();
  } catch (error) {
    // Best-effort: log but don't throw
    // Primary action should not fail due to activity tracking
    console.error(
      `[touchUserActivity] Failed to update last_activity_at for user ${userId}:`,
      error
    );
  }
}
```

---

**End of Document**

