# DATA FLOW MASTER MAP - SOURCE OF TRUTH

**Generated:** 2026-01-10  
**Purpose:** Complete mapping of Database → Backend → Frontend data flow with all conflicts identified

---

## LEGEND

- ✅ **ALIGNED** - All layers match perfectly
- ⚠️ **TYPE MISMATCH** - Field exists but type differs
- ❌ **MISSING** - Field expected but doesn't exist
- 🔧 **ACTION REQUIRED** - Must be fixed

---

## 1. USER PROGRESS & GAMIFICATION

### 1.1 USER_PROGRESS Table

**ACTUAL DATABASE SCHEMA:**
```sql
CREATE TABLE user_progress (
    id                UUID PRIMARY KEY,
    user_id           UUID UNIQUE NOT NULL,
    total_xp          INTEGER NOT NULL DEFAULT 0,
    current_level     INTEGER NOT NULL DEFAULT 1,
    xp_to_next_level  INTEGER NOT NULL DEFAULT 100,
    total_skill_stars INTEGER NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ NOT NULL,
    updated_at        TIMESTAMPTZ NOT NULL
);
```

**BACKEND EXPECTATION** (`gamification_models.rs`):
```rust
pub struct UserProgress {
    pub id: Uuid,
    pub user_id: Uuid,
    pub total_xp: i64,              // ⚠️ MISMATCH: DB has INTEGER, code expects i64
    pub current_level: i32,         // ✅ ALIGNED
    pub xp_to_next_level: i32,      // ✅ ALIGNED
    pub total_skill_stars: i32,     // ✅ ALIGNED
    pub created_at: DateTime<Utc>,  // ✅ ALIGNED
    pub updated_at: DateTime<Utc>,  // ✅ ALIGNED
}
```

**FRONTEND EXPECTATION** (`sync.ts`):
```typescript
export interface ProgressData {
  level: number;                     // ✅ Maps to current_level
  current_xp: number;                // ❌ NOT IN DB - calculated field
  xp_to_next_level: number;          // ✅ ALIGNED
  xp_progress_percent: number;       // ❌ NOT IN DB - calculated field
  coins: number;                     // ❌ WRONG TABLE - coins in user_wallet
  streak_days: number;               // ❌ WRONG TABLE - in user_streaks
}
```

**BACKEND QUERY** (`sync.rs` line 207-220):
```rust
// CURRENT (BROKEN):
SELECT 
    COALESCE(up.current_level, 1) as level,
    COALESCE(up.total_xp, 0) as total_xp,
    COALESCE(up.coins, 0) as coins,              // ❌ COLUMN DOESN'T EXIST
    COALESCE(up.streak_days, 0) as streak_days   // ❌ COLUMN DOESN'T EXIST
FROM users u
LEFT JOIN user_progress up ON u.id = up.user_id
WHERE u.id = $1
```

**🔧 REQUIRED FIX:**
```rust
// CORRECT:
SELECT 
    COALESCE(up.current_level, 1) as level,
    COALESCE(up.total_xp, 0) as total_xp,
    COALESCE(uw.coins, 0) as coins,
    COALESCE(us.current_streak, 0) as streak_days
FROM users u
LEFT JOIN user_progress up ON u.id = up.user_id
LEFT JOIN user_wallet uw ON u.id = uw.user_id
LEFT JOIN user_streaks us ON u.id = us.user_id AND us.streak_type = 'daily'
WHERE u.id = $1
```

---

### 1.2 USER_WALLET Table

**ACTUAL DATABASE SCHEMA:**
```sql
CREATE TABLE user_wallet (
    id           UUID PRIMARY KEY,
    user_id      UUID UNIQUE NOT NULL,
    coins        INTEGER NOT NULL DEFAULT 0,
    total_earned INTEGER NOT NULL DEFAULT 0,
    total_spent  INTEGER NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ NOT NULL,
    updated_at   TIMESTAMPTZ NOT NULL
);
```

**BACKEND EXPECTATION** (`gamification_models.rs`):
```rust
pub struct UserWallet {
    pub id: Uuid,
    pub user_id: Uuid,
    pub coins: i64,              // ⚠️ MISMATCH: DB has INTEGER, code expects i64
    pub total_earned: i64,       // ⚠️ MISMATCH: DB has INTEGER, code expects i64
    pub total_spent: i64,        // ⚠️ MISMATCH: DB has INTEGER, code expects i64
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
```

**STATUS:** ✅ Table EXISTS in production  
**ACTION:** ⚠️ Type mismatch benign (PostgreSQL INTEGER is 32-bit, Rust i64 can hold it)

---

### 1.3 USER_STREAKS Table

**ACTUAL DATABASE SCHEMA:**
```sql
CREATE TABLE user_streaks (
    id                 UUID PRIMARY KEY,
    user_id            UUID NOT NULL,
    streak_type        TEXT NOT NULL,
    current_streak     INTEGER NOT NULL DEFAULT 0,
    longest_streak     INTEGER NOT NULL DEFAULT 0,
    last_activity_date DATE,
    created_at         TIMESTAMPTZ NOT NULL,
    updated_at         TIMESTAMPTZ NOT NULL,
    UNIQUE(user_id, streak_type)
);
```

**BACKEND EXPECTATION** (`gamification_models.rs`):
```rust
pub struct UserStreak {
    pub id: Uuid,
    pub user_id: Uuid,
    pub streak_type: String,         // ✅ ALIGNED
    pub current_streak: i32,         // ✅ ALIGNED
    pub longest_streak: i32,         // ✅ ALIGNED
    pub last_activity_date: Option<NaiveDate>,  // ✅ ALIGNED
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
```

**STATUS:** ✅ FULLY ALIGNED

---

## 2. INBOX SYSTEM

### 2.1 INBOX_ITEMS Table

**ACTUAL DATABASE SCHEMA:**
```sql
CREATE TABLE inbox_items (
    id          UUID PRIMARY KEY,
    user_id     UUID NOT NULL,
    item_type   TEXT NOT NULL,
    title       TEXT NOT NULL,
    body        TEXT,
    action_url  TEXT,
    action_data JSONB,
    priority    INTEGER NOT NULL DEFAULT 0,
    is_read     BOOLEAN NOT NULL DEFAULT false,  -- ✅ EXISTS
    is_archived BOOLEAN NOT NULL DEFAULT false,
    expires_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL
    -- ❌ MISSING: read_at TIMESTAMPTZ
);
```

**BACKEND EXPECTATION** (`inbox_models.rs`):
```rust
pub struct InboxItem {
    pub id: Uuid,
    pub user_id: Uuid,
    pub item_type: String,
    pub title: String,
    pub body: Option<String>,
    pub action_url: Option<String>,
    pub action_data: Option<serde_json::Value>,
    pub priority: i32,
    pub is_read: bool,            // ✅ EXISTS
    pub is_archived: bool,
    pub expires_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    // ❌ MISSING: read_at field
}
```

**BROKEN BACKEND QUERY** (`sync.rs` line 349 & `today.rs` line 422):
```rust
// CURRENT (BROKEN):
"SELECT COUNT(*) FROM inbox_items WHERE user_id = $1 AND read_at IS NULL"
                                                              ^^^^^^^^^
                                                              ❌ COLUMN DOESN'T EXIST
```

**🔧 REQUIRED FIX:**
```rust
// CORRECT:
"SELECT COUNT(*) FROM inbox_items WHERE user_id = $1 AND is_read = false"
```

**DECISION REQUIRED:**
- **Option A:** Change all code to use `is_read` boolean (quick fix)
- **Option B:** Add `read_at TIMESTAMPTZ` column to DB (better tracking)

**RECOMMENDATION:** Option A for immediate fix, Option B for proper implementation

---

## 3. FOCUS SESSIONS

### 3.1 FOCUS_SESSIONS Table

**ACTUAL DATABASE SCHEMA:**
```sql
CREATE TABLE focus_sessions (
    id                       UUID PRIMARY KEY,
    user_id                  UUID NOT NULL,
    mode                     TEXT NOT NULL,
    duration_seconds         INTEGER NOT NULL,
    started_at               TIMESTAMPTZ NOT NULL,
    completed_at             TIMESTAMPTZ,
    abandoned_at             TIMESTAMPTZ,
    expires_at               TIMESTAMPTZ,
    paused_at                TIMESTAMPTZ,            -- ✅ EXISTS
    paused_remaining_seconds INTEGER,                -- ✅ EXISTS
    status                   TEXT NOT NULL DEFAULT 'active',
    xp_awarded               INTEGER NOT NULL DEFAULT 0,
    coins_awarded            INTEGER NOT NULL DEFAULT 0,
    task_id                  UUID,
    task_title               TEXT,
    created_at               TIMESTAMPTZ NOT NULL
);
```

**STATUS:** ✅ All expected fields exist in production

---

## 4. USERS & AUTH

### 4.1 USERS Table

**ACTUAL DATABASE SCHEMA:**
```sql
CREATE TABLE users (
    id               UUID PRIMARY KEY,
    name             TEXT,
    email            TEXT UNIQUE NOT NULL,
    email_verified   TIMESTAMPTZ,
    image            TEXT,
    role             TEXT NOT NULL DEFAULT 'user',
    approved         BOOLEAN NOT NULL DEFAULT false,
    age_verified     BOOLEAN NOT NULL DEFAULT false,
    tos_accepted     BOOLEAN NOT NULL DEFAULT false,
    tos_accepted_at  TIMESTAMPTZ,
    tos_version      TEXT,
    last_activity_at TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL,
    updated_at       TIMESTAMPTZ NOT NULL
);
```

**STATUS:** ✅ Core table fully aligned

### 4.2 SESSIONS Table

**ACTUAL DATABASE SCHEMA:**
```sql
CREATE TABLE sessions (
    id               UUID PRIMARY KEY,
    user_id          UUID NOT NULL,
    token            TEXT UNIQUE NOT NULL,
    expires_at       TIMESTAMPTZ NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL,
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    user_agent       TEXT,
    ip_address       TEXT,
    rotated_from     UUID
);
```

**STATUS:** ✅ Fully aligned

---

## CRITICAL FIXES REQUIRED (Priority Order)

### 🔴 CRITICAL - Backend Crashes

1. **Fix `sync.rs` - user_progress query (line ~207-220)**
   - Add JOIN to `user_wallet` for coins
   - Add JOIN to `user_streaks` for streak_days
   - Remove references to non-existent `up.coins` and `up.streak_days`

2. **Fix `sync.rs` - inbox query (line ~349)**
   - Change `read_at IS NULL` to `is_read = false`

3. **Fix `today.rs` - inbox query (line ~422)**
   - Change `read_at IS NULL` to `is_read = false`

### 🟡 MEDIUM - Type Mismatches (Non-Breaking)

4. **UserProgress.total_xp** - Backend uses i64, DB has INTEGER (32-bit)
   - Current: Safe (i64 can hold INTEGER values)
   - Consider: Change Rust type to i32 for consistency

5. **UserWallet** - Backend uses i64 for all coin fields, DB has INTEGER
   - Current: Safe (i64 can hold INTEGER values)
   - Consider: Change Rust types to i32 for consistency

### 🟢 LOW - Documentation & Consistency

6. **Add inline comments** to all queries explaining table joins
7. **Update SCHEMA_SPEC files** to reflect actual production state
8. **Create migration** to add `read_at` column if timestamp tracking needed

---

## VERIFICATION CHECKLIST

After fixes, verify:

- [ ] Backend compiles without errors
- [ ] `/api/sync/poll` returns 200 OK
- [ ] `/api/sync/progress` shows correct coins (from user_wallet)
- [ ] `/api/sync/badges` shows correct unread_inbox count
- [ ] `/api/today` loads without 500 errors
- [ ] Frontend dashboard displays XP/coins/streak
- [ ] No "column does not exist" errors in logs

---

## FILES TO MODIFY

```
app/backend/crates/api/src/routes/sync.rs     (2 fixes)
app/backend/crates/api/src/routes/today.rs    (1 fix)
```

**Total Changes:** 3 query modifications, all in backend Rust code.

---

**NEXT STEP:** Apply these 3 fixes, deploy, verify system is stable before any other changes.
