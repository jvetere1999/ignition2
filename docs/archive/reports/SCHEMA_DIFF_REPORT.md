# Schema Diff Report and Error Evidence Matrix

**Date:** January 6, 2026
**Status:** ANALYSIS COMPLETE
**Production:** https://ignition.ecent.online

---

## 1. Executive Summary

The production environment is experiencing widespread HTTP 500 errors due to **schema mismatches** between:
1. The deployed code expectations (API routes and repositories)
2. The actual D1 database schema
3. The documented schema in `database.md`

**Root Cause:** The `0100_master_reset.sql` migration does NOT include all tables and columns from prior migrations (0001-0027), causing missing table/column errors.

---

## 2. Error Evidence Matrix

| Endpoint | Method | HTTP Status | Error Type | Root Cause |
|----------|--------|-------------|------------|------------|
| `/api/calendar` | POST | 500 | D1_ERROR: table calendar_events has no column named location | Missing `location` column |
| `/api/quests` | GET | 500 | D1_ERROR: no such table: universal_quests | Table renamed/not created |
| `/api/focus/pause` | GET/POST | 500 | Likely missing columns | Schema mismatch |
| `/api/habits` | GET/POST | 500 | Missing columns | `progress`, `completed` missing |
| `/api/exercise` | GET | 500 | Missing columns/tables | Schema mismatch |
| `/api/books` | GET/POST | 500 | Missing columns | Schema mismatch |
| `/api/market` | GET | 500 | Missing columns/tables | Schema mismatch |
| `/api/ideas` | GET/POST | 500 | Schema mismatch | Missing columns |
| `/api/infobase` | POST | 500 | Schema mismatch | Missing columns |

---

## 3. Schema Diff: Expected vs Actual

### 3.1 Missing Tables

Tables expected by code but NOT in `0100_master_reset.sql`:

| Table | Used By | Status |
|-------|---------|--------|
| `universal_quests` | `/api/quests` | MISSING - uses `quests` with different schema |
| `user_settings` | User preferences | IN EARLIER MIGRATIONS ONLY |
| `user_interests` | Personalization | IN EARLIER MIGRATIONS ONLY |
| `user_ui_modules` | UI customization | IN EARLIER MIGRATIONS ONLY |
| `onboarding_flows` | Onboarding | IN EARLIER MIGRATIONS ONLY |
| `onboarding_steps` | Onboarding | IN EARLIER MIGRATIONS ONLY |
| `user_onboarding_state` | Onboarding | IN EARLIER MIGRATIONS ONLY |
| `points_ledger` | Gamification | IN EARLIER MIGRATIONS ONLY |
| `user_wallet` | Market | IN EARLIER MIGRATIONS ONLY |
| `skill_definitions` | Gamification | IN EARLIER MIGRATIONS ONLY |
| `user_skills` | Gamification | IN EARLIER MIGRATIONS ONLY |
| `achievement_definitions` | Gamification | IN EARLIER MIGRATIONS ONLY |
| `user_achievements` | Gamification | IN EARLIER MIGRATIONS ONLY |
| `user_streaks` | Gamification | IN EARLIER MIGRATIONS ONLY |
| `activity_events` | Gamification | IN EARLIER MIGRATIONS ONLY |
| `market_items` | Market | IN EARLIER MIGRATIONS ONLY |
| Auth tables (users, accounts, sessions, etc.) | Auth | AT TOP OF 0100 |

### 3.2 Column Mismatches

#### calendar_events

**In 0100_master_reset.sql:**
```sql
CREATE TABLE calendar_events (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    event_type TEXT NOT NULL DEFAULT 'general',
    start_time TEXT NOT NULL,
    end_time TEXT,
    all_day INTEGER NOT NULL DEFAULT 0,
    workout_id TEXT,
    recurrence_rule TEXT,
    recurrence_end TEXT,
    color TEXT,
    created_at TEXT,
    updated_at TEXT,
    ...
);
```

**API expects (in calendarEvents.ts):**
- `location` - MISSING
- `parent_event_id` - MISSING
- `reminder_minutes` - MISSING
- `metadata` - MISSING

#### quests vs universal_quests

**In 0100_master_reset.sql: `quests` table:**
- Has: category, difficulty, is_universal, status, expires_at, is_repeatable, etc.
- Missing: `type`, `target`, `skill_id`

**API expects: `universal_quests` table:**
- Needs: type, xp_reward, coin_reward, target, skill_id, is_active

#### user_quest_progress

**In 0100_master_reset.sql:**
- Has: id, user_id, quest_id, status, accepted_at, completed_at, created_at

**API expects:**
- `progress` INTEGER - MISSING
- `completed` INTEGER - MISSING (has `completed_at` but not boolean flag)
- `updated_at` - MISSING

#### habits

**Needs verification** - likely missing columns that API expects

#### focus_sessions

**In 0100_master_reset.sql:**
- Has: id, user_id, started_at, ended_at, planned_duration, actual_duration, status, mode, xp_earned, created_at

**May be missing:**
- `expires_at` - for session expiry
- `pause_state` columns if used

---

## 4. Migration Ordering Issues

The migration files show conflicting strategies:

1. **Individual migrations (0001-0027):** Incrementally add features
2. **0019_drop_all_tables.sql:** Drops all tables
3. **0020_schema_reset_v2.sql:** Attempts clean slate
4. **0100_master_reset.sql:** Supposed to be comprehensive but missing tables

**Issue:** The `0100_master_reset.sql` was created as a "clean slate" but doesn't include:
- All the gamification tables from earlier migrations
- The `universal_quests` table from 0007
- Column additions from later migrations

---

## 5. Recommended Fix Strategy

### Option A: Patch 0100_master_reset.sql (Recommended)

Add all missing tables and columns to `0100_master_reset.sql` to make it truly comprehensive:

1. Add `universal_quests` table (or rename `quests` usage in API)
2. Add missing columns to `calendar_events`
3. Add missing columns to `user_quest_progress`
4. Add all gamification tables
5. Add all personalization tables
6. Add all onboarding tables

### Option B: Apply All Migrations in Order

Apply migrations 0001-0101 in order, skipping drops. This is complex and error-prone.

### Option C: Update API Code to Match Schema

Change the API routes to use the columns/tables that exist. This is more work but might be cleaner.

---

## 6. Immediate Actions Required

1. **Create comprehensive migration fix** that adds all missing tables/columns
2. **Apply migration to production D1**
3. **Verify all endpoints return 2xx/4xx (not 5xx)**
4. **Run smoke tests**

---

## 7. D1 Schema Verification Commands

To verify the actual production schema:

```bash
# List all tables
wrangler d1 execute passion_os --remote --command "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"

# Check calendar_events columns
wrangler d1 execute passion_os --remote --command "PRAGMA table_info(calendar_events);"

# Check if universal_quests exists
wrangler d1 execute passion_os --remote --command "SELECT name FROM sqlite_master WHERE type='table' AND name='universal_quests';"

# Check quests table columns
wrangler d1 execute passion_os --remote --command "PRAGMA table_info(quests);"
```

---

## 8. Files Affected

### API Routes with Schema Dependencies

| File | Tables Used | Status |
|------|-------------|--------|
| `src/app/api/calendar/route.ts` | calendar_events | BROKEN - missing columns |
| `src/app/api/quests/route.ts` | universal_quests, user_quest_progress | BROKEN - wrong table name |
| `src/app/api/habits/route.ts` | habits, habit_logs | NEEDS VERIFICATION |
| `src/app/api/focus/route.ts` | focus_sessions | NEEDS VERIFICATION |
| `src/app/api/focus/pause/route.ts` | D1 or user_settings? | NEEDS VERIFICATION |
| `src/app/api/market/route.ts` | user_wallet, market_items | LIKELY BROKEN |
| `src/app/api/goals/route.ts` | goals, goal_milestones | NEEDS VERIFICATION |
| `src/app/api/ideas/route.ts` | ideas | NEEDS VERIFICATION |
| `src/app/api/infobase/route.ts` | infobase_entries | NEEDS VERIFICATION |
| `src/app/api/books/route.ts` | books, reading_sessions | NEEDS VERIFICATION |
| `src/app/api/exercise/*.ts` | exercises, workout_sessions, etc. | NEEDS VERIFICATION |

---

## 9. Next Steps

1. [x] Identify missing tables and columns (DONE)
2. [x] Create migration fix SQL (`migrations/0102_schema_fix.sql`) (DONE)
3. [ ] Apply migration to production D1 with:
   ```bash
   wrangler d1 execute passion_os --remote --file=migrations/0102_schema_fix.sql
   ```
4. [ ] Verify all endpoints work
5. [ ] Update database.md to match final schema

---

## 10. Migration Fix Created

**File:** `migrations/0102_schema_fix.sql`

**Tables Added:**
- `focus_pause_state` - Focus pause sync across devices
- `universal_quests` - Universal quest definitions
- `user_settings` - User preferences
- `user_interests` - User interest tracking
- `user_ui_modules` - UI module weights
- `onboarding_flows` - Onboarding flow definitions
- `onboarding_steps` - Onboarding step definitions
- `user_onboarding_state` - User onboarding progress
- `points_ledger` - XP/points history
- `user_wallet` - User coins/XP balance
- `skill_definitions` - Skill definitions
- `user_skills` - User skill progress
- `achievement_definitions` - Achievement definitions
- `user_achievements` - User earned achievements
- `user_streaks` - User streak tracking
- `activity_events` - Activity event log
- `market_items` - Market item definitions

**Columns Added:**
- `calendar_events.location`
- `calendar_events.parent_event_id`
- `calendar_events.reminder_minutes`
- `calendar_events.metadata`
- `user_quest_progress.progress`
- `user_quest_progress.completed`
- `user_quest_progress.updated_at`
- `exercises.is_builtin`
- `focus_sessions.expires_at`

**Column Fixes in Tables:**
- `user_streaks`: uses `current_streak`, `longest_streak` (API expects these names)
- `user_wallet`: added `xp_to_next_level`, `total_skill_stars`
- `market_items`: uses `cost_coins`, `is_global`, `created_by_user_id`

**Seed Data:**
- 8 universal quests (daily and weekly)

