# Ignition Feature Summary, Data Flow, and Database Audit

**Generated:** January 5, 2026

---

## 1. Feature Summary

### Core Philosophy
Ignition is a **starter engine** - not a productivity app. It helps users **begin** with minimal friction.

### Feature Categories

#### START (Primary Entry Points)
| Feature | Route | Purpose | Data Source |
|---------|-------|---------|-------------|
| Today | `/today` | Main entry, state-aware starter | Server-computed TodayUserState |
| Focus | `/focus` | Single-task execution timer | `focus_sessions` table |
| Quests | `/quests` | Small, bounded micro-actions | `quests`, `user_quests` tables |
| Ignitions | `/ignitions` | Quick-start action suggestions | Static + user preferences |
| Progress | `/progress` | Identity feedback, skill tracking | `skills`, `activity_events` |

#### SHAPE (Planning - Optional)
| Feature | Route | Purpose | Data Source |
|---------|-------|---------|-------------|
| Planner | `/planner` | Daily plan widget | `daily_plan_items` table |
| Goals | `/goals` | Long-term objectives | `goals` table |
| Habits | `/habits` | Recurring patterns | `habits`, `habit_completions` |
| Exercise | `/exercise` | Workout tracking | `workout_sessions`, `exercises` |
| Books | `/books` | Reading tracker | `books`, `reading_sessions` |

#### REFLECT (Closure)
| Feature | Route | Purpose | Data Source |
|---------|-------|---------|-------------|
| Wins | `/wins` | Celebrate completed actions | `activity_events`, `focus_sessions` |
| Stats | `/stats` | Usage statistics | `activity_events` aggregate |
| Market | `/market` | Reward marketplace | `market_items`, `user_points` |

#### CREATE (Special Interests)
| Feature | Route | Purpose | Data Source |
|---------|-------|---------|-------------|
| Shortcuts | `/hub` | DAW keyboard shortcuts | Static JSON data |
| Arrange | `/arrange` | Song arrangement builder | localStorage + R2 |
| Templates | `/templates` | Reusable arrangement templates | Static + user-created |
| Reference | `/reference` | Reference track library | R2 blob storage |
| Harmonics | `/wheel` | Camelot/Circle of Fifths | Static data |
| Infobase | `/infobase` | Knowledge base entries | `infobase_entries` table |
| Ideas | `/ideas` | Creative idea capture | `ideas` table |

#### LEARN
| Feature | Route | Purpose | Data Source |
|---------|-------|---------|-------------|
| Learn | `/learn` | Learning modules | `learn_*` tables |
| Recipes | `/learn/recipes` | Production tutorials | Static + DB |
| Glossary | `/learn/glossary` | Term definitions | Static data |

---

## 2. Data Flow Tracks

### Track A: Authentication Flow

```
User clicks "Sign In"
    |
    v
OAuth Provider (Google/Microsoft)
    |
    v
[1] Provider returns profile { sub, name, email, picture }
    |
    v
[2] Auth.js profile() callback maps to { id, name, email, image }
    |
    v
[3] D1Adapter.createUser() inserts into users table
    |   - ISSUE: Adapter may insert NULL values before profile() runs
    |
    v
[4] createUser event fires (our handler)
    |   - Updates user with derived name, approval, role
    |   - Uses COALESCE to only update if NULL
    |
    v
[5] D1Adapter.linkAccount() creates account record
    |
    v
[6] signIn callback runs (our handler)
    |   - Can update name from profile if still missing
    |   - Returns true/false to allow/deny
    |
    v
[7] D1Adapter.createSession() creates session
    |
    v
[8] session callback adds user.id, approved, ageVerified
    |
    v
User redirected to /today
```

### Track B: Focus Session Flow

```
User starts focus session
    |
    v
POST /api/focus { duration, mode }
    |
    v
Insert into focus_sessions { user_id, started_at, planned_duration, status: 'active' }
    |
    v
Update users.last_activity_at
    |
    v
Client polls /api/focus/active every 30s
    |
    v
On complete/abandon:
    |
    v
PATCH /api/focus/[id]/complete or abandon
    |
    v
Update focus_sessions.status, completed_at
    |
    v
Insert activity_event { type: 'focus_complete', user_id }
```

### Track C: Today State Resolution Flow

```
User loads /today
    |
    v
Server-side data fetching:
    |
    +-- Fetch user from DB
    +-- Fetch active focus session
    +-- Fetch daily plan items
    +-- Fetch activity_events (last 24h)
    |
    v
Build TodayUserState:
    - isFirstDay: no activity_events ever
    - hasGap: last_activity_at > 48h ago
    - hasPlan: daily_plan_items.length > 0
    - focusActive: active focus_session exists
    - softLanding: from sessionStorage (client-side)
    |
    v
resolveNextAction(state):
    |
    +-- If softLanding -> minimal UI
    +-- If focusActive -> continue focus
    +-- If hasPlan incomplete -> continue plan
    +-- Default -> suggest Focus
    |
    v
Render Today with visibility rules applied
```

---

## 3. Database Schema (Auth Tables)

### users
```sql
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    name TEXT,                    -- Can be NULL (PROBLEM)
    email TEXT UNIQUE,            -- Can be NULL (PROBLEM)
    emailVerified INTEGER,
    image TEXT,
    created_at TEXT,
    updated_at TEXT,
    -- Extended columns from migrations:
    role TEXT DEFAULT 'user',
    approved INTEGER DEFAULT 0,
    age_verified INTEGER DEFAULT 0,
    tos_accepted INTEGER DEFAULT 0,
    tos_accepted_at TEXT,
    tos_version TEXT,
    last_activity_at TEXT,
    db_version INTEGER
);
```

### accounts
```sql
CREATE TABLE accounts (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,         -- FK to users.id
    type TEXT NOT NULL,           -- 'oauth'
    provider TEXT NOT NULL,       -- 'google', 'microsoft-entra-id'
    providerAccountId TEXT NOT NULL,
    refresh_token TEXT,
    access_token TEXT,
    expires_at INTEGER,
    ...
);
```

### sessions
```sql
CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    sessionToken TEXT UNIQUE NOT NULL,
    userId TEXT NOT NULL,
    expires TEXT NOT NULL
);
```

---

## 4. Identified Weaknesses

### CRITICAL: User Creation with NULL Values

**Problem:** Users are being created with `name = NULL` and sometimes `email = NULL`.

**Root Cause Analysis:**

1. **D1Adapter Timing Issue:**
   - The D1Adapter's `createUser()` method is called by Auth.js core
   - It receives the user object and inserts directly into the database
   - Our custom `profile()` callback may not be applying correctly
   - The `createUser` event fires AFTER the insert, so we can only UPDATE

2. **Profile Data Not Reaching Adapter:**
   - Auth.js flow: Profile callback -> User object -> Adapter
   - If profile callback returns incomplete data, adapter stores incomplete data
   - Google profile structure: `{ sub, name, email, picture, given_name, family_name }`

3. **Multiple Account Linking:**
   - Same email, different providers = multiple account records
   - Each sign-in may create a new session without checking user completeness

**Evidence from User Table:**
```
id                                    | name      | email                    | provider
723c3a45-... | Jacob Vetere | jvetere1999@gmail.com | google (working)
e40dd196-... | NULL         | NULL                   | unknown (broken)
a30b80f9-... | NULL         | NULL                   | unknown (broken)
```

### HIGH: Session/Account Orphaning

**Problem:** Users with NULL email have sessions but may not have linked accounts.

**Impact:**
- Cannot identify user
- Cannot check admin status
- Cannot sync profile data on subsequent logins

### MEDIUM: Focus Pause State Not Persisting

**Problem:** Focus pause state uses localStorage, which doesn't persist across devices.

**Current Implementation:**
```typescript
localStorage.setItem("focus_paused_state", JSON.stringify({
  mode, timeRemaining, pausedAt
}));
```

**Should Be:** Server-side in `focus_sessions` table with `paused_at`, `paused_remaining` columns.

### MEDIUM: TodayUserState Partially Client-Derived

**Problem:** Some state (softLanding, collapsedSections) comes from sessionStorage/localStorage.

**Impact:** Inconsistent behavior across devices/browsers.

### LOW: No Orphaned Data Cleanup

**Problem:** If a user is deleted, orphaned records may remain in:
- `activity_events`
- `focus_sessions`
- `daily_plan_items`
- etc.

**Note:** Foreign keys with ON DELETE CASCADE should handle this, but need verification.

---

## 5. Recommended Fixes

### Fix 1: Strengthen Profile Callback (IMMEDIATE)
```typescript
// In providers.ts
profile(profile) {
  // Log full profile for debugging
  console.log("[auth/google] Full profile:", profile);
  
  // REQUIRE email - reject if missing
  if (!profile.email) {
    throw new Error("Google profile missing email");
  }
  
  // Build name with multiple fallbacks
  const name = profile.name 
    || `${profile.given_name || ''} ${profile.family_name || ''}`.trim()
    || profile.email.split("@")[0]
    || "User";
  
  return {
    id: profile.sub,
    name,
    email: profile.email,
    image: profile.picture,
  };
}
```

### Fix 2: Add Database Constraints (MIGRATION)
```sql
-- Prevent NULL emails going forward
-- Note: Can't add NOT NULL to existing column with NULL values
-- Must clean up first, then add constraint

-- Step 1: Clean up orphaned users
DELETE FROM users WHERE email IS NULL;

-- Step 2: Add constraint (future migration)
-- ALTER TABLE users ALTER COLUMN email SET NOT NULL;
```

### Fix 3: Server-Side Focus Pause (FEATURE)
```sql
ALTER TABLE focus_sessions ADD COLUMN paused_at TEXT;
ALTER TABLE focus_sessions ADD COLUMN paused_remaining INTEGER;
```

### Fix 4: Cleanup API Enhancement
Add automatic orphan detection to admin cleanup:
```typescript
// Find users without valid accounts
SELECT u.id, u.email FROM users u
LEFT JOIN accounts a ON u.id = a.userId
WHERE a.id IS NULL;
```

---

## 6. Database Health Queries

### Find Users with NULL Values
```sql
SELECT id, name, email, created_at, role 
FROM users 
WHERE name IS NULL OR email IS NULL
ORDER BY created_at DESC;
```

### Find Orphaned Accounts (no user)
```sql
SELECT a.* FROM accounts a
LEFT JOIN users u ON a.userId = u.id
WHERE u.id IS NULL;
```

### Find Users Without Accounts
```sql
SELECT u.id, u.email, u.created_at FROM users u
LEFT JOIN accounts a ON u.id = a.userId
WHERE a.id IS NULL;
```

### Find Expired Sessions
```sql
SELECT * FROM sessions 
WHERE datetime(expires) < datetime('now');
```

### User Account Summary
```sql
SELECT 
  u.id,
  u.name,
  u.email,
  u.created_at,
  GROUP_CONCAT(a.provider) as providers,
  COUNT(s.id) as active_sessions
FROM users u
LEFT JOIN accounts a ON u.id = a.userId
LEFT JOIN sessions s ON u.id = s.userId AND datetime(s.expires) > datetime('now')
GROUP BY u.id
ORDER BY u.created_at DESC;
```

---

## 7. Action Items

1. [ ] **Deploy profile callback fix** - Ensure name is always derived
2. [ ] **Run cleanup API** - Remove NULL users from database
3. [ ] **Add database health endpoint** - `/api/admin/db-health`
4. [ ] **Add migration for focus pause** - Server-side pause state
5. [ ] **Document data flow** - Keep this document updated
6. [ ] **Add monitoring** - Log all user creations with full profile data

---

## Appendix: Current Auth Flow Code Locations

| Step | File | Function |
|------|------|----------|
| Provider config | `src/lib/auth/providers.ts` | `getProviders()` |
| Profile mapping | `src/lib/auth/providers.ts` | `profile()` callback |
| Auth config | `src/lib/auth/index.ts` | `createRuntimeConfig()` |
| User creation event | `src/lib/auth/index.ts` | `events.createUser` |
| Sign-in callback | `src/lib/auth/index.ts` | `callbacks.signIn` |
| Session callback | `src/lib/auth/index.ts` | `callbacks.session` |
| D1 Adapter | `node_modules/@auth/d1-adapter` | External package |

