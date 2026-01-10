# D1 Database Usage Inventory

**Generated:** January 6, 2026  
**Branch:** `refactor/stack-split`  
**Purpose:** Complete inventory of Cloudflare D1 database usage

---

## Summary

| Metric | Value |
|--------|-------|
| Database Name | `ignition` |
| Database ID | `40c2b3a5-7fa1-492f-bce9-3c30959b56a8` |
| Binding Name | `DB` |
| Total Tables | ~60 |
| Active Migration | `migrations/0100_master_reset.sql` |
| Deprecated Migrations | 27 files in `migrations/deprecated/` |

---

## D1 Access Patterns

### Pattern 1: Direct globalThis Access

**Location:** `src/lib/db/client.ts` lines 12-21

```typescript
export function getDB(): D1Database {
  const env = (globalThis as unknown as { env?: { DB?: D1Database } }).env;
  if (!env?.DB) {
    throw new Error("D1 Database not available...");
  }
  return env.DB;
}
```

### Pattern 2: Cloudflare Context

**Location:** `src/lib/perf/api-handler.ts` lines 64-75

```typescript
try {
  const cfContext = await getCloudflareContext({ async: true });
  db = (cfContext.env as unknown as { DB?: D1Database }).DB ?? null;
} catch {
  // Fallback for local dev
  const env = (globalThis as unknown as { env?: { DB?: D1Database } }).env;
  db = env?.DB ?? null;
}
```

### Pattern 3: Auth Adapter

**Location:** `src/lib/auth/index.ts` lines 35-42, 159

```typescript
function getD1Database(): D1Database | null {
  try {
    const env = (globalThis as unknown as { env?: { DB?: D1Database } }).env;
    return env?.DB ?? null;
  } catch {
    return null;
  }
}

// Usage:
adapter: D1Adapter(db),
```

---

## Database Client Files

| File | Purpose | Exports |
|------|---------|---------|
| `src/lib/db/client.ts` | Core D1 client | getDB, query, queryOne, execute, batch |
| `src/lib/db/utils.ts` | Query utilities | paginatedQuery, buildWhereClause |
| `src/lib/db/types.ts` | TypeScript types | Table row types |
| `src/lib/db/index.ts` | Barrel export | Re-exports all |
| `src/lib/db/learn-types.ts` | Learn module types | LearnTopic, LearnLesson, etc. |

---

## Repository Files

| File | Tables Accessed | Key Functions |
|------|-----------------|---------------|
| `repositories/users.ts` | users | ensureUserExists, getUser, updateUser |
| `repositories/userSettings.ts` | user_settings, user_interests, user_ui_modules | getSettings, updateSettings |
| `repositories/onboarding.ts` | user_onboarding_state, onboarding_flows, onboarding_steps | getState, updateStep |
| `repositories/focusSessions.ts` | focus_sessions, focus_pause_state | startSession, completeSession |
| `repositories/gamification.ts` | user_wallet, points_ledger, user_skills, user_achievements | addPoints, getWallet |
| `repositories/market.ts` | market_items, user_purchases, user_wallet | purchase, redeem |
| `repositories/quests.ts` | universal_quests, user_quest_progress | getQuests, updateProgress |
| `repositories/activity-events.ts` | activity_events, user_progress, user_streaks | logActivity, getStreaks |
| `repositories/calendarEvents.ts` | calendar_events | CRUD operations |
| `repositories/dailyPlans.ts` | daily_plans | CRUD operations |
| `repositories/infobase.ts` | infobase_entries | CRUD operations |
| `repositories/referenceTracks.ts` | reference_tracks | CRUD operations |
| `repositories/track-analysis.ts` | track_analysis_cache | getAnalysis, saveAnalysis |
| `repositories/projects.ts` | training_programs, program_weeks | UNKNOWN |

---

## Table Inventory by Domain

### Auth Tables (NextAuth.js)

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `users` | User accounts | id, name, email, role, approved, age_verified, tos_accepted |
| `accounts` | OAuth provider links | userId, provider, providerAccountId |
| `sessions` | Active sessions | sessionToken, userId, expires |
| `verification_tokens` | Email verification | identifier, token, expires |
| `authenticators` | WebAuthn/passkeys | credentialID, userId, credentialPublicKey |

### User Settings & Personalization

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `user_settings` | Preferences | user_id, nudge_intensity, default_focus_duration, theme |
| `user_interests` | Interest tags | user_id, interest_key, priority |
| `user_ui_modules` | UI customization | user_id, module_key, weight, enabled |

### Onboarding

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `onboarding_flows` | Flow definitions | id, version, name, is_active |
| `onboarding_steps` | Step definitions | flow_id, step_order, step_type, title |
| `user_onboarding_state` | User progress | user_id, flow_id, status, current_step_id |

### Gamification

| Table | Purpose | Status | Key Columns |
|-------|---------|--------|-------------|
| `skill_definitions` | Skill catalog | ACTIVE | key, name, category, max_level |
| `user_skills` | User skill progress | ACTIVE | user_id, skill_key, current_stars, current_level |
| `achievement_definitions` | Achievement catalog | ACTIVE | key, name, trigger_type, reward_coins |
| `user_achievements` | User achievements | ACTIVE | user_id, achievement_key, earned_at |
| `user_wallet` | Coins/XP balance | ACTIVE | user_id, coins, xp, level |
| `user_progress` | XP/Level tracking | **ACTIVE** | user_id, total_xp, current_level, coins |
| `points_ledger` | Transaction history | ACTIVE | user_id, amount, reason, created_at |
| `user_streaks` | Streak tracking | ACTIVE | user_id, streak_type, current_streak |
| `activity_events` | Activity log | ACTIVE | user_id, event_type, metadata_json |

**Evidence for user_progress (January 6, 2026):**
- Used in: `src/lib/db/repositories/activity-events.ts:132,143,146`
- INSERT/UPDATE on activity completion
- SELECT for level-up detection
- Included in backup, restore, delete, and export operations

### Market

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `market_items` | Available items | id, name, cost_coins, category |
| `user_purchases` | Purchase records | user_id, item_id, purchased_at, redeemed_at |

### Focus

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `focus_sessions` | Focus session records | user_id, mode, duration_seconds, started_at |
| `focus_pause_state` | Pause state | user_id, paused_at, remaining_seconds |

### Quests

| Table | Purpose | Status | Key Columns |
|-------|---------|--------|-------------|
| `quests` | User-specific quests | **ACTIVE** | user_id, title, domain_id, status, xp_value |
| `universal_quests` | System-wide quests | **ACTIVE** | id, title, type, target, xp_reward, coin_reward |
| `user_quest_progress` | User progress on universal quests | **ACTIVE** | user_id, quest_id, progress, completed |

**Evidence (January 6, 2026):**
- `quests` used in: `src/lib/db/repositories/quests.ts`, `src/app/api/exercise/route.ts:409`
- `universal_quests` used in: `src/app/api/quests/route.ts:33`, `src/lib/db/repositories/activity-events.ts:165`
- Both tables serve distinct purposes and must be migrated

### Habits

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `habits` | Habit definitions | user_id, name, frequency, streak |
| `habit_logs` | Completion logs | habit_id, completed_at |

### Goals

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `goals` | Goal definitions | user_id, title, status, target_date |
| `goal_milestones` | Goal milestones | goal_id, title, is_complete |

### Exercise/Fitness

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `exercises` | Exercise catalog | id, name, muscle_groups, equipment |
| `workouts` | Workout templates | user_id, name, type |
| `workout_sections` | Workout sections | workout_id, name, order |
| `workout_exercises` | Exercises in sections | section_id, exercise_id, sets, reps |
| `workout_sessions` | Completed workouts | user_id, workout_id, started_at |
| `exercise_sets` | Completed sets | session_id, exercise_id, weight, reps |
| `personal_records` | PR tracking | user_id, exercise_id, weight, reps |
| `training_programs` | Training programs | user_id, name, weeks |
| `program_weeks` | Program weeks | program_id, week_number |
| `program_workouts` | Workouts per week | week_id, workout_id, day |

### Books

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `books` | Book catalog | user_id, title, author, status |
| `reading_sessions` | Reading logs | book_id, pages_read, duration |

### Learn

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `learn_topics` | Topic catalog | id, name, category |
| `learn_lessons` | Lesson content | topic_id, title, content |
| `learn_drills` | Drill exercises | lesson_id, question, answer |
| `user_lesson_progress` | Progress tracking | user_id, lesson_id, completed |
| `user_drill_stats` | Drill performance | user_id, drill_id, attempts, correct |
| `flashcard_decks` | Flashcard decks | user_id, name, topic_id |
| `flashcards` | Individual cards | deck_id, front, back, next_review |

### Journal

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `journal_entries` | Journal entries | user_id, content, mood, created_at |

### Planning

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `calendar_events` | Calendar events | user_id, title, start_time, end_time |
| `daily_plans` | Daily plans | user_id, date, plan_json |
| `plan_templates` | Plan templates | user_id, name, template_json |

### Content

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `ignition_packs` | Content packs | id, name, content_json |
| `daw_shortcuts` | DAW shortcuts | daw_name, key, action |
| `glossary_terms` | Glossary | term, definition, category |
| `recipe_templates` | Recipe templates | name, template_json |
| `infobase_entries` | Knowledge base | user_id, title, content, category |
| `ideas` | Ideas capture | user_id, title, description, status |

### Reference/Audio

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `reference_tracks` | Audio tracks | user_id, name, r2_key, duration |
| `track_analysis_cache` | Audio analysis | track_id, analysis_json |

### System

| Table | Purpose | Status | Key Columns |
|-------|---------|--------|-------------|
| `feedback` | User feedback | ACTIVE | user_id, message, category, status |
| `notifications` | Notifications | ACTIVE | user_id, message, read_at |
| `admin_audit_log` | Admin actions | **UNUSED** | admin_id, action, target_id |
| `access_requests` | Access requests | ACTIVE | email, requested_at, status |

**Evidence (January 6, 2026):**
- `admin_audit_log`: Schema exists but NO code writes to it (grep returned 0 matches)
- Table can be reimplemented fresh in backend with proper audit logging
| `db_metadata` | Schema version | key, value |

---

## Query Patterns Used

### Parameterized Queries (✅ Correct)

All observed queries use parameterized binding:

```typescript
// ✅ Safe
db.prepare(`SELECT * FROM users WHERE id = ?`).bind(userId).first()
db.prepare(`UPDATE users SET name = ? WHERE id = ?`).bind(name, id).run()
db.prepare(`INSERT INTO ... VALUES (?, ?, ?)`).bind(a, b, c).run()
```

### Batch Operations

**Location:** `src/lib/db/client.ts` lines 89-103

```typescript
export async function batch(
  db: D1Database,
  statements: Array<{ sql: string; params?: unknown[] }>
): Promise<D1Result[]> {
  const prepared = statements.map(({ sql, params = [] }) =>
    db.prepare(sql).bind(...params)
  );
  const results = await db.batch(prepared);
  return results;
}
```

### Pagination

**Location:** `src/lib/db/utils.ts` lines 117-140

```typescript
export async function paginatedQuery<T>(
  db: D1Database,
  baseQuery: string,
  params: unknown[],
  options: { page: number; pageSize: number }
): Promise<PaginatedResult<T>>
```

---

## D1 Limitations Affecting Migration

| Limitation | Impact | Mitigation |
|------------|--------|------------|
| SQLite dialect | Postgres migration requires syntax changes | Schema rewrite |
| No concurrent writes | Scalability bottleneck | Postgres supports concurrent |
| 1M row limit | Growth ceiling | Postgres unlimited |
| No stored procedures | Logic in application code | Keep in Rust backend |
| No native JSON type | Using TEXT + JSON functions | Postgres JSONB |
| TEXT timestamps | ISO strings, not native | Postgres TIMESTAMPTZ |
| INTEGER booleans | 0/1 instead of true/false | Postgres BOOLEAN |

---

## Migration Considerations

### Schema Changes Required for Postgres

| D1 (SQLite) | Postgres Equivalent |
|-------------|---------------------|
| `TEXT PRIMARY KEY` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` or `TEXT` |
| `INTEGER` (boolean) | `BOOLEAN DEFAULT false` |
| `TEXT` (timestamp) | `TIMESTAMPTZ DEFAULT now()` |
| `datetime('now')` | `now()` |
| `INSERT OR IGNORE` | `INSERT ... ON CONFLICT DO NOTHING` |
| `COALESCE(NULLIF(...))` | Same syntax works |

### Indexes to Add

Review each table for:
- Foreign key indexes (D1 doesn't enforce, Postgres does)
- Frequently queried columns
- Composite indexes for common WHERE clauses

---

## UNKNOWN Items

| Item | Needs Investigation |
|------|---------------------|
| Full table definitions | Read entire `0100_master_reset.sql` |
| Index definitions | Check for CREATE INDEX statements |
| Trigger definitions | Check for CREATE TRIGGER statements |
| quests table vs universal_quests | Clarify usage |
| user_progress table | Not clear if active or deprecated |
| learn_exercises, learn_modules tables | Not clear if active |

