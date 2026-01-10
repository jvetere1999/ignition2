# Ignition Current State Report and Gap Map

**Generated:** January 5, 2026
**Audit Purpose:** Cross-check against target spec (D1-everything, starter-engine-first, gamification, onboarding modal, auth invariants, reset workflow)

---

## 0) Repo and Runtime Fingerprint

| Property | Value |
|----------|-------|
| Repo root path | `/Users/Shared/passion-os-next` |
| Branch name | `main` |
| Current commit SHA | `4f1cfc39470cee5ece8d9e4c419f9731149f10a2` |
| Package manager | npm (package-lock.json present) |
| Node version expectation | `>=22.0.0` (from `package.json` engines) |
| Next.js version | `^15.1.3` |
| Auth.js version | `next-auth@^5.0.0-beta.25` |
| D1 Adapter version | `@auth/d1-adapter@^1.7.4` |
| Wrangler version | `wrangler@^4.53.0` |

---

## 1) Route Inventory and Feature Mapping

### START Routes

| Route | File Path(s) | Rendering | Data Sources | Feature Gates |
|-------|--------------|-----------|--------------|---------------|
| `/today` | `src/app/(app)/today/page.tsx`, `TodayGridClient.tsx` | RSC + Client hydration | D1: users, focus_sessions, activity_events, daily_plans; sessionStorage: soft landing, momentum | TOS required |
| `/focus` | `src/app/(app)/focus/page.tsx`, `FocusClient.tsx` | RSC + Client | D1: focus_sessions, focus_pause_state; localStorage: focus_paused_state (legacy) | TOS required |
| `/quests` | `src/app/(app)/quests/page.tsx`, `QuestsClient.tsx` | RSC + Client | D1: quests, user_quest_progress, activity_events | TOS required |
| `/ignitions` | `src/app/(app)/ignitions/page.tsx`, `IgnitionsClient.tsx` | RSC + Client | Static data + localStorage preferences | TOS required |
| `/progress` | `src/app/(app)/progress/page.tsx`, `ProgressClient.tsx` | RSC + Client | D1: skill_trees, reward_ledger, activity_events | TOS required |

### SHAPE Routes

| Route | File Path(s) | Rendering | Data Sources | Feature Gates |
|-------|--------------|-----------|--------------|---------------|
| `/planner` | `src/app/(app)/planner/page.tsx` | RSC + Client | D1: daily_plans, calendar_events | TOS required |
| `/goals` | `src/app/(app)/goals/page.tsx`, `GoalsClient.tsx` | RSC + Client | D1: goals, goal_milestones | TOS required |
| `/habits` | `src/app/(app)/habits/page.tsx`, `HabitsClient.tsx` | RSC + Client | D1: habits, habit_logs, user_streaks | TOS required |
| `/exercise` | `src/app/(app)/exercise/page.tsx`, `ExerciseClient.tsx` | RSC + Client | D1: exercises, workouts, workout_sessions | TOS required |
| `/books` | `src/app/(app)/books/page.tsx`, `BookTrackerClient.tsx` | RSC + Client | D1: books, reading_sessions | TOS required |

### REFLECT Routes

| Route | File Path(s) | Rendering | Data Sources | Feature Gates |
|-------|--------------|-----------|--------------|---------------|
| `/wins` | `src/app/(app)/wins/page.tsx`, `WinsClient.tsx` | RSC + Client | D1: activity_events, focus_sessions | TOS required |
| `/stats` | `src/app/(app)/stats/page.tsx`, `StatsClient.tsx` | RSC + Client | D1: activity_events aggregate | TOS required |
| `/market` | `src/app/(app)/market/page.tsx`, `MarketClient.tsx` | RSC + Client | **localStorage only**: WALLET_KEY, REWARDS_KEY, PURCHASES_KEY (NO D1!) | TOS required |

### CREATE Routes

| Route | File Path(s) | Rendering | Data Sources | Feature Gates |
|-------|--------------|-----------|--------------|---------------|
| `/hub` | `src/app/(app)/hub/page.tsx` | RSC + Client | Static JSON: shortcuts data | TOS required |
| `/arrange` | `src/app/(app)/arrange/page.tsx`, `ArrangeClient.tsx` | RSC + Client | localStorage + R2 for audio | TOS required |
| `/templates` | `src/app/(app)/templates/page.tsx` | RSC + Client | Static + D1: plan_templates | TOS required |
| `/reference` | `src/app/(app)/reference/page.tsx` | RSC + Client | R2: audio blobs; D1: track_analysis_cache | TOS required |
| `/wheel` | `src/app/(app)/wheel/page.tsx` | RSC + Client | Static data (Camelot/Circle of Fifths) | TOS required |
| `/infobase` | `src/app/(app)/infobase/page.tsx`, `InfobaseClient.tsx` | RSC + Client | D1: infobase_entries | TOS required |
| `/ideas` | `src/app/(app)/ideas/page.tsx`, `IdeasClient.tsx` | RSC + Client | D1: ideas table (if exists) or localStorage | TOS required |

### LEARN Routes

| Route | File Path(s) | Rendering | Data Sources | Feature Gates |
|-------|--------------|-----------|--------------|---------------|
| `/learn` | `src/app/(app)/learn/page.tsx` | RSC + Client | D1: courses, lessons, user_lesson_progress | TOS required |
| `/learn/recipes` | `src/app/(app)/learn/recipes/page.tsx` | RSC + Client | Static data + D1 | TOS required |
| `/learn/glossary` | `src/app/(app)/learn/glossary/page.tsx` | RSC + Client | Static data | TOS required |

---

## 2) Auth Pipeline: "As Implemented"

### Config File Paths
- Main config: `src/lib/auth/index.ts`
- Providers: `src/lib/auth/providers.ts`
- Admin check: `src/lib/admin/index.ts`

### Provider profile() - Google (exact code)
```typescript
// src/lib/auth/providers.ts lines 29-65
profile(profile) {
  console.log("[auth/google] Full profile received:", {
    sub: profile.sub,
    name: profile.name,
    given_name: profile.given_name,
    family_name: profile.family_name,
    email: profile.email,
    email_verified: profile.email_verified,
    picture: profile.picture,
  });

  if (!profile.email) {
    console.error("[auth/google] CRITICAL: Profile missing email!", profile);
    throw new Error("Google profile must have an email address");
  }

  let derivedName = profile.name;
  if (!derivedName && (profile.given_name || profile.family_name)) {
    derivedName = `${profile.given_name || ""} ${profile.family_name || ""}`.trim();
  }
  if (!derivedName) {
    derivedName = profile.email.split("@")[0];
  }
  if (!derivedName) {
    derivedName = "User";
  }

  return {
    id: profile.sub,
    name: derivedName,
    email: profile.email,
    image: profile.picture ?? null,
  };
}
```

### callbacks.signIn (database mode, exact code)
```typescript
// src/lib/auth/index.ts lines 236-267
signIn: async ({ user, account, profile }) => {
  console.log("[auth] signIn callback (database mode):", {
    userId: user?.id,
    userName: user?.name,
    userEmail: user?.email,
    provider: account?.provider,
    profileName: (profile as { name?: string })?.name,
    profileEmail: (profile as { email?: string })?.email,
  });

  if (!user?.email) {
    console.error("[auth] Rejected sign-in: no email");
    return false;
  }

  // Update user's name from profile if missing in DB
  if (user.id && profile) {
    try {
      const profileName = (profile as { name?: string })?.name;
      if (profileName) {
        await db
          .prepare(`UPDATE users SET name = COALESCE(name, ?) WHERE id = ? AND (name IS NULL OR name = '')`)
          .bind(profileName, user.id)
          .run();
      }
    } catch (e) {
      console.error("[auth] Failed to update user name:", e);
    }
  }
  return true;
}
```

### callbacks.session (database mode, exact code)
```typescript
// src/lib/auth/index.ts lines 269-296
session: async ({ session, user }) => {
  let approved = false;
  let ageVerified = false;

  try {
    const userRecord = await db
      .prepare(`SELECT approved, age_verified FROM users WHERE id = ?`)
      .bind(user.id)
      .first<{ approved: number; age_verified: number }>();

    if (userRecord) {
      approved = userRecord.approved === 1;
      ageVerified = userRecord.age_verified === 1;
    }
  } catch (e) {
    console.error("[auth] Failed to fetch user approval status:", e);
  }

  return {
    ...session,
    user: {
      ...session.user,
      id: user.id,
      approved,
      ageVerified,
    },
  };
}
```

### events.createUser (exact code)
```typescript
// src/lib/auth/index.ts lines 175-231
createUser: async ({ user }) => {
  console.log("[auth] createUser event fired:", {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
  });

  if (!user.id) {
    console.error("[auth] User created without ID - this should not happen");
    return;
  }

  try {
    const userName = user.name || (user.email ? user.email.split("@")[0] : "User");
    const adminEmails = (process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.length > 0);
    const isAdmin = user.email ? adminEmails.includes(user.email.toLowerCase()) : false;
    const role = isAdmin ? "admin" : "user";
    const tosAccepted = isAdmin ? 1 : 0;
    const now = new Date().toISOString();

    await db
      .prepare(`
        UPDATE users 
        SET name = COALESCE(name, ?),
            approved = 1,
            age_verified = 1,
            role = ?,
            tos_accepted = ?,
            tos_accepted_at = ${isAdmin ? "?" : "NULL"},
            tos_version = ${isAdmin ? "'1.0'" : "NULL"},
            updated_at = ? 
        WHERE id = ?
      `)
      .bind(userName, role, tosAccepted, ...(isAdmin ? [now] : []), now, user.id)
      .run();
  } catch (e) {
    console.error("[auth] Failed to set initial user status:", e);
  }
}
```

### Adapter Usage
```typescript
// src/lib/auth/index.ts line 162
adapter: D1Adapter(db),
```
The D1Adapter is used directly from `@auth/d1-adapter` with no wrapper logic.

### Auth Analysis

**Q: Can createUser ever insert NULL name/email today?**
**A: YES.** The D1Adapter inserts the user BEFORE `events.createUser` fires. The adapter receives the user object from Auth.js core. If the profile() callback returns a user with name/email, the adapter should insert those values. However:
- The `createUser` event can only UPDATE, not prevent insertion
- If profile() doesn't run correctly (edge case), or if the adapter's INSERT happens before profile() data is fully processed, NULL values can occur
- Evidence: Database shows users with NULL name/email

**Q: What fields are required to allow sign-in?**
**A:** Email is required. The signIn callback rejects if `!user?.email`.

**Q: How are accounts linked?**
**A:** By `providerAccountId` + `provider` unique constraint. No explicit email deduplication across providers.

**Q: Cookie/session token name?**
**A:** `passion-os.session-token` (set in `src/lib/auth/index.ts` lines 136-157)

---

## 3) D1 Database: Actual Schema and Migrations

### Migration Files (14 total)
1. `0001_create_auth_tables.sql` - Auth.js tables (users, accounts, sessions, verification_tokens, authenticators)
2. `0002_create_app_tables.sql` - Core app tables (log_events, quests, schedule_rules, plan_templates, skill_trees, reward_ledger, focus_sessions, projects)
3. `0003_add_planner_exercise.sql` - Planner and exercise tables
4. `0004_add_user_approval.sql` - User approval system (role, approved columns)
5. `0005_add_track_analysis_cache.sql` - Audio track analysis cache
6. `0006_add_focus_expiry.sql` - Focus session expiry
7. `0007_universal_quests_admin.sql` - Universal quests
8. `0008_learning_suite.sql` - Learning tables (courses, lessons, flashcards, journal)
9. `0009_goals_infobase_focus_pause.sql` - Goals, infobase_entries, focus_pause_state
10. `0010_habits_activities_infobase.sql` - Habits, activity_events, user_streaks, habit_logs
11. `0011_book_tracker.sql` - Books and reading_sessions
12. `0012_tos_db_version.sql` - TOS acceptance columns, db_metadata table
13. `0013_add_users_last_activity.sql` - users.last_activity_at column
14. `0014_add_performance_indexes.sql` - Additional indexes

### Core Auth Tables Schema

#### users
```sql
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    name TEXT,                          -- Can be NULL (PROBLEM)
    email TEXT UNIQUE,                  -- Can be NULL (PROBLEM)
    emailVerified INTEGER,
    image TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    -- Extended columns:
    role TEXT NOT NULL DEFAULT 'user',
    approved INTEGER NOT NULL DEFAULT 0,
    approval_requested_at TEXT,
    approved_at TEXT,
    approved_by TEXT,
    denial_reason TEXT,
    tos_accepted INTEGER NOT NULL DEFAULT 0,
    tos_accepted_at TEXT,
    tos_version TEXT,
    last_activity_at TEXT,
    age_verified INTEGER
);
```

#### accounts
```sql
CREATE TABLE accounts (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    type TEXT NOT NULL,
    provider TEXT NOT NULL,
    providerAccountId TEXT NOT NULL,
    refresh_token TEXT,    -- Contains sensitive data
    access_token TEXT,     -- Contains sensitive data
    expires_at INTEGER,
    token_type TEXT,
    scope TEXT,
    id_token TEXT,         -- Contains sensitive data
    session_state TEXT,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(provider, providerAccountId)
);
```

#### sessions
```sql
CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    sessionToken TEXT UNIQUE NOT NULL,  -- Contains sensitive data
    userId TEXT NOT NULL,
    expires TEXT NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);
```

### Key App Tables with FK/Cascade Behavior

| Table | Primary Key | Foreign Keys | ON DELETE |
|-------|-------------|--------------|-----------|
| focus_sessions | id | user_id -> users(id) | CASCADE |
| focus_pause_state | id | user_id -> users(id) | CASCADE |
| quests | id | user_id -> users(id), parent_id -> quests(id) | CASCADE, SET NULL |
| goals | id | user_id -> users(id) | CASCADE |
| habits | id | user_id -> users(id) | CASCADE |
| habit_logs | id | habit_id -> habits(id), user_id -> users(id) | CASCADE |
| activity_events | id | user_id -> users(id) | CASCADE |
| infobase_entries | id | user_id -> users(id) | CASCADE |
| reward_ledger | id | user_id -> users(id) | CASCADE |
| skill_trees | id | user_id -> users(id) | CASCADE |

### Data Source Analysis

| Data Type | Source | Evidence |
|-----------|--------|----------|
| User auth data | D1 | users, accounts, sessions tables |
| Focus sessions | D1 | focus_sessions, focus_pause_state tables |
| Quests | D1 | quests, user_quest_progress tables |
| Goals | D1 | goals table |
| Habits | D1 | habits, habit_logs, user_streaks tables |
| Activity events | D1 | activity_events table |
| Market/Wallet | **localStorage** | WALLET_KEY, REWARDS_KEY, PURCHASES_KEY in MarketClient.tsx |
| Theme | localStorage | passion-os-theme key |
| Soft landing | sessionStorage | passion_soft_landing_v1 key |
| Momentum | sessionStorage | passion_momentum_v1 key |
| Shortcuts | Static JSON | src/lib/data/shortcuts/ |
| DAW data | Static JSON | src/lib/data/ |

### FK Enforcement
- FKs are defined in migrations with `FOREIGN KEY` constraints
- SQLite FKs require `PRAGMA foreign_keys = ON` which may not be explicitly set
- All user-owned tables have `ON DELETE CASCADE` for user_id FK

### Tables That Would Block Safe Reset
- None identified - all have CASCADE configured
- However, if `PRAGMA foreign_keys` is OFF, orphan data may accumulate

---

## 4) TodayUserState: Exact Computation

### File Paths
- State types: `src/lib/today/todayVisibility.ts`
- Resolver: `src/lib/today/resolveNextAction.ts`
- Server data fetching: `src/lib/db/repositories/dailyPlans.ts` (function `getTodayServerState`)
- Page orchestration: `src/app/(app)/today/page.tsx`

### TodayUserState Fields

```typescript
interface TodayUserState {
  planExists: boolean;              // D1: daily_plans table
  hasIncompletePlanItems: boolean;  // D1: daily_plans items query
  returningAfterGap: boolean;       // D1: users.last_activity_at > 48h ago
  firstDay: boolean;                // D1: no activity_events for user
  focusActive: boolean;             // D1: active focus_session exists
  activeStreak: boolean;            // D1: user_streaks with current_streak >= 1
}
```

### Client-Derived State (sessionStorage/localStorage)

| State | Storage Key | Location |
|-------|-------------|----------|
| softLanding | `passion_soft_landing_v1` | sessionStorage |
| softLandingSource | `passion_soft_landing_source` | sessionStorage |
| momentumShown | `passion_momentum_v1` | sessionStorage |
| reducedModeDismissed | `passion_reduced_dismissed_v1` | sessionStorage |
| dailyPlanCollapsed | `passion_daily_plan_collapsed` | localStorage |
| exploreCollapsed | `passion_explore_collapsed` | localStorage |

### Starter Engine Priorities (from code)

```typescript
// src/lib/today/todayVisibility.ts lines 68-90
export function resolveUserState(state: TodayUserState): UserStateType {
  if (state.focusActive) return "focus_active";          // P1
  if (state.firstDay) return "first_day";               // P2
  if (state.returningAfterGap) return "returning_after_gap"; // P3
  if (state.planExists && state.hasIncompletePlanItems) return "plan_exists"; // P4
  if (state.activeStreak) return "active_streak";       // P5
  return "default";                                     // P6
}
```

### What Would Change with Onboarding/Personalization
- `firstDay` state would trigger onboarding modal instead of just reduced UI
- User preferences table would need to be created
- Interest primers would need persistent storage in D1 instead of dynamic inference

---

## 5) Focus Sessions: Exact Lifecycle

### API Endpoints

| Endpoint | File | Purpose |
|----------|------|---------|
| `POST /api/focus` | `src/app/api/focus/route.ts` | Start session |
| `GET /api/focus` | `src/app/api/focus/route.ts` | List sessions |
| `GET /api/focus/active` | `src/app/api/focus/active/route.ts` | Get active session |
| `PATCH /api/focus/[id]/complete` | `src/app/api/focus/[id]/complete/route.ts` | Complete session |
| `PATCH /api/focus/[id]/abandon` | `src/app/api/focus/[id]/abandon/route.ts` | Abandon session |
| `GET/POST /api/focus/pause` | `src/app/api/focus/pause/route.ts` | Pause state sync |

### focus_sessions Schema
```sql
CREATE TABLE focus_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    started_at TEXT NOT NULL,
    ended_at TEXT,
    planned_duration INTEGER NOT NULL,
    actual_duration INTEGER,
    status TEXT NOT NULL,      -- 'active', 'completed', 'abandoned'
    mode TEXT NOT NULL,        -- 'focus', 'break', 'long_break'
    metadata TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    expires_at TEXT,           -- Added in migration 0006
    linked_library_id TEXT,    -- Added in migration 0006
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### focus_pause_state Schema (server-side pause)
```sql
CREATE TABLE focus_pause_state (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    mode TEXT NOT NULL DEFAULT 'focus',
    time_remaining INTEGER NOT NULL,
    paused_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Current Pause Handling

**Server-side (D1):**
```typescript
// src/app/api/focus/pause/route.ts
// POST with action: "save" - saves to focus_pause_state table
// POST with action: "clear" - deletes from focus_pause_state table
// GET - retrieves pause state, auto-clears if > 1 hour old
```

**Client-side (legacy):**
```typescript
// src/components/shell/UnifiedBottomBar.tsx lines 387-401
const checkPausedState = useCallback(() => {
  const stored = localStorage.getItem("focus_paused_state");
  if (stored) {
    const parsed = JSON.parse(stored) as PausedState;
    // Check if < 1 hour old
  }
});
```

### Current Status
- **Server-side pause exists** in `focus_pause_state` table
- **Client still uses localStorage** as primary pause mechanism
- **API endpoint exists** but client doesn't call it consistently

### What's Needed for Safe Server-Side Pause/Resume
1. Remove localStorage fallback
2. Client must always call `/api/focus/pause` on pause
3. Client must restore from `/api/focus/pause` on page load
4. Handle expiry (1 hour) server-side (already implemented)

---

## 6) Gamification and Points: Current State

### Existing Tables

| Table | Purpose | Evidence |
|-------|---------|----------|
| `skill_trees` | User skill progression | One row per user with JSON nodes |
| `reward_ledger` | XP/coin transactions | Append-only ledger with amount, reason |
| `user_streaks` | Streak tracking | current_streak, longest_streak, streak_shields |
| `activity_events` | Event log | event_type, xp_earned, coins_earned |

### reward_ledger Usage
```typescript
// src/app/api/quests/route.ts lines 129-136
await db.prepare(`INSERT INTO reward_ledger (id, user_id, domain_id, reward_type, amount, reason, created_at) 
  VALUES (?, ?, 'quests', 'xp', ?, ?, ?)`)
await db.prepare(`INSERT INTO reward_ledger (id, user_id, domain_id, reward_type, amount, reason, created_at) 
  VALUES (?, ?, 'quests', 'coins', ?, ?, ?)`)
```

### activity_events Types Currently Emitted
- `focus_start`
- `focus_complete`
- `quest_complete`
- `workout_complete`
- `lesson_complete`
- `review_complete`
- `habit_complete`

### What's Implemented vs Missing

| Feature | Status | Evidence |
|---------|--------|----------|
| XP earning | Implemented | activity_events.xp_earned, reward_ledger |
| Coins earning | Implemented | activity_events.coins_earned, reward_ledger |
| Skill trees | Implemented | skill_trees table with JSON nodes |
| Streaks | Implemented | user_streaks table |
| Streak shields | Schema exists | streak_shields column in user_streaks |
| Market items (D1) | **NOT IMPLEMENTED** | No market_items table; uses localStorage |
| Achievements | Partial | skill_trees.achievements JSON, no dedicated table |
| Leaderboards | NOT IMPLEMENTED | No tables or API |

---

## 7) Onboarding: Current State

### Existing Onboarding UI
- **TOS Modal**: `src/components/shell/TOSModal.tsx` - Shows on first login if TOS not accepted
- **No tutorial/tour**: No onboarding flow, no step-by-step guide
- **No interest selection**: No preference capture on signup

### Persistence
- TOS acceptance: D1 `users.tos_accepted`, `users.tos_accepted_at`, `users.tos_version`
- No onboarding_progress table
- No user_preferences table beyond TOS

### First-Day Handling
```typescript
// src/lib/today/todayVisibility.ts
case "first_day":
  return {
    showStarterBlock: true,
    showDailyPlan: false,
    showExplore: true,
    forceExploreCollapsed: true,
    showRewards: false,
    maxQuickLinks: 3,
  };
```
First-day users get reduced UI but **no modal tutorial, no guided onboarding**.

### Cross-Device Resume
- **Cannot resume onboarding cross-device** because there is no onboarding
- TOS acceptance persists in D1 (cross-device)
- First-day detection uses activity_events (D1, cross-device)

---

## 8) Cloudflare Integration: D1/R2/Wrangler + Reset Viability

### wrangler.toml Key Excerpts
```toml
name = "ignition"
compatibility_date = "2025-01-02"
compatibility_flags = ["nodejs_compat"]

main = ".open-next/worker.js"

[assets]
directory = ".open-next/assets"
binding = "ASSETS"

[[d1_databases]]
binding = "DB"
database_name = "ignition"
database_id = "40c2b3a5-7fa1-492f-bce9-3c30959b56a8"

# R2 is commented out
# [[r2_buckets]]
# binding = "BLOBS"
# bucket_name = "ignition-blobs"

[vars]
NODE_ENV = "production"
NEXT_PUBLIC_APP_URL = "https://ignition.ecent.online"
AUTH_URL = "https://ignition.ecent.online"
ADMIN_EMAILS = "jvetere1999@gmail.com"
```

### Migration Commands
```bash
npm run db:migrate:local    # wrangler d1 migrations apply passion_os --local
npm run db:migrate:prod     # wrangler d1 migrations apply passion_os --remote
npm run db:reset:local      # rm -rf .wrangler/state && npm run db:migrate:local
```

### Admin Endpoints for DB Health/Cleanup/Reset

| Endpoint | Purpose |
|----------|---------|
| `GET /api/admin/db-health` | Diagnostic queries (NULL users, orphans, sessions) |
| `DELETE /api/admin/db-health` | Cleanup expired sessions, orphaned accounts |
| `POST /api/admin/backup` | Create full DB backup JSON |
| `POST /api/admin/restore` | Restore from backup JSON |
| `DELETE /api/admin/cleanup-users` | Remove NULL users |

### Safest Path to Full D1 Reset

**Local:**
```bash
npm run db:reset:local
```

**Production (Cloudflare Dashboard):**
1. Export backup via `/api/admin/backup`
2. Delete database via Cloudflare Dashboard
3. Create new database with same ID
4. Run migrations: `npm run db:migrate:prod`
5. Restore data if needed via `/api/admin/restore`

**Via Cloudflare API:**
- Would need `CF_ACCOUNT_ID` and `CF_API_TOKEN` environment variables
- API endpoints: `DELETE /accounts/{account_id}/d1/database/{database_id}`
- Then recreate and run migrations
- Script location: Does not exist yet

---

## 9) Gap Map Against Target Spec

### Gap 1: Market Uses localStorage Instead of D1
**Evidence:** `src/app/(app)/market/MarketClient.tsx` lines 23-26
```typescript
const WALLET_KEY = "passion_wallet_v1";
const REWARDS_KEY = "passion_rewards_v1";
const PURCHASES_KEY = "passion_purchases_v1";
```
**Risk Level:** HIGH
**Change Surface:** Schema (add market_items, user_purchases tables), API (new endpoints), UI (fetch from API)
**Dependencies:** None

### Gap 2: No Onboarding Modal/Tutorial System
**Evidence:** Grep search for "onboarding" and "tutorial" returned no results
**Risk Level:** MEDIUM
**Change Surface:** UI (new modal component), Schema (onboarding_progress table), API (new endpoints)
**Dependencies:** User preferences table

### Gap 3: Focus Pause Client Uses localStorage Instead of D1 API
**Evidence:** `src/components/shell/UnifiedBottomBar.tsx` lines 387-401
```typescript
const stored = localStorage.getItem("focus_paused_state");
```
**Risk Level:** MEDIUM
**Change Surface:** UI (update to use API), API (ensure consistent usage)
**Dependencies:** API already exists, just needs client integration

### Gap 4: Users Table Allows NULL name/email
**Evidence:** `migrations/0001_create_auth_tables.sql` - no NOT NULL constraint on name, email allows NULL
**Risk Level:** CRITICAL
**Change Surface:** Schema (migration to clean up and add constraints), Auth (prevent at adapter level)
**Dependencies:** Data cleanup first

### Gap 5: No market_items Table (Rewards Are Hardcoded)
**Evidence:** `src/app/(app)/market/MarketClient.tsx` uses DEFAULT_REWARDS constant
**Risk Level:** MEDIUM
**Change Surface:** Schema (market_items table), API (CRUD endpoints), Admin (management UI)
**Dependencies:** Gap 1

### Gap 6: R2 Binding Commented Out
**Evidence:** `wrangler.toml` lines 25-27 are commented
**Risk Level:** LOW (audio works via other means)
**Change Surface:** Ops (uncomment and configure)
**Dependencies:** R2 bucket creation in Cloudflare

### Gap 7: No User Preferences Table
**Evidence:** No `user_preferences` table in migrations
**Risk Level:** MEDIUM
**Change Surface:** Schema (new table), API (preferences endpoints)
**Dependencies:** None

### Gap 8: Achievements Are JSON Blob, Not Structured Table
**Evidence:** `skill_trees.achievements TEXT` (JSON)
**Risk Level:** LOW
**Change Surface:** Schema (achievements table), API (query logic)
**Dependencies:** None

### Gap 9: No Cloudflare API Reset Script
**Evidence:** No script in `scripts/` for programmatic D1 reset
**Risk Level:** LOW
**Change Surface:** Ops (new script)
**Dependencies:** CF API credentials

### Gap 10: Some TodayUserState Fields Client-Derived
**Evidence:** `src/lib/storage/keys.ts` - softLanding, momentum in sessionStorage
**Risk Level:** LOW (by design for session-scoped features)
**Change Surface:** None needed (intentional)
**Dependencies:** N/A

### Gap 11: No Streak Shields Purchase Flow
**Evidence:** `user_streaks.streak_shields` column exists but no purchase mechanism
**Risk Level:** LOW
**Change Surface:** API (purchase endpoint), UI (market integration)
**Dependencies:** Gap 1 (Market D1)

### Gap 12: First-Day Users Get Reduced UI But No Guidance
**Evidence:** `todayVisibility.ts` case "first_day" just hides sections
**Risk Level:** MEDIUM
**Change Surface:** UI (add onboarding flow)
**Dependencies:** Gap 2

---

## 10) Information Still Needed From Owner

1. **R2 bucket status:** Is `ignition-blobs` bucket created in Cloudflare? Should R2 binding be enabled?

2. **Cloudflare API credentials:** Are `CF_ACCOUNT_ID` and `CF_API_TOKEN` available for programmatic D1 operations?

3. **Market intent:** Should market rewards be:
   - User-customizable (CRUD)?
   - Admin-defined globally?
   - Mix of default + custom?

4. **Onboarding design:** What should the onboarding flow contain?
   - Interest selection?
   - Feature tour?
   - Goal setting?
   - Just TOS + welcome?

5. **Multi-provider account linking:** Should users with same email across Google/Microsoft be merged? Current: No merge, separate accounts.

6. **Data retention policy:** How long to keep:
   - activity_events?
   - focus_sessions?
   - Expired sessions (currently cleaned by admin endpoint)?

7. **Streak shields:** How are they earned/purchased? Price? Effect?

8. **Achievement system:** Full achievement system needed or current JSON blob sufficient?

9. **Production database:** Any concerns about running cleanup scripts on production data (NULL users, orphans)?

10. **PWA requirements:** Any specific PWA manifest or service worker requirements for iOS mini-player?

---

## Appendix: Quick Reference

### Key File Locations
- Auth config: `src/lib/auth/index.ts`
- Today logic: `src/lib/today/`
- DB repositories: `src/lib/db/repositories/`
- Feature flags: `src/lib/flags/index.ts`
- Storage keys: `src/lib/storage/keys.ts`
- Admin API: `src/app/api/admin/`

### Key Environment Variables (non-secret)
- `NODE_ENV`
- `NEXT_PUBLIC_APP_URL`
- `AUTH_URL`
- `ADMIN_EMAILS`

### Key D1 Tables
- Auth: users, accounts, sessions
- Focus: focus_sessions, focus_pause_state
- Gamification: reward_ledger, skill_trees, user_streaks, activity_events
- Content: quests, goals, habits, books, courses, lessons

### Key localStorage Keys
- `passion_wallet_v1` (Market wallet - **should be D1**)
- `passion_rewards_v1` (Market rewards - **should be D1**)
- `passion_purchases_v1` (Market purchases - **should be D1**)
- `focus_paused_state` (Focus pause - **should use API**)
- `theme` (Theme preference)

### Key sessionStorage Keys
- `passion_momentum_v1`
- `passion_soft_landing_v1`
- `passion_reduced_dismissed_v1`

