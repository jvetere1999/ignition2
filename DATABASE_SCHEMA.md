# Database Schema Documentation

**Last Updated**: January 18, 2026  
**Database**: PostgreSQL 15+  
**Purpose**: Complete reference for all tables, relationships, and data integrity rules

---

## Quick Navigation

- [Core Tables](#core-tables) - users, sessions, audit logs
- [Content Tables](#content-tables) - goals, habits, quests, focus sessions
- [Gamification Tables](#gamification-tables) - XP, coins, achievements, streaks
- [Settings Tables](#settings-tables) - user preferences, metadata
- [Audit & Logs](#audit--logs) - ledgers and event tracking
- [Relationships](#relationships) - foreign keys and joins
- [Data Integrity](#data-integrity) - constraints and validation
- [Query Patterns](#query-patterns) - common queries and optimization

---

## Core Tables

### 1. users

**Purpose**: Core user account information

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  display_name VARCHAR(255),
  oauth_provider VARCHAR(50),
  oauth_id VARCHAR(255),
  profile_picture_url VARCHAR(500),
  timezone VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP  -- Soft delete
);

-- Indexes for common queries
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_oauth ON users(oauth_provider, oauth_id);
CREATE INDEX idx_users_is_active ON users(is_active);
```

**Columns**:

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PRIMARY KEY | Generated on signup, immutable |
| email | VARCHAR(255) | UNIQUE, NOT NULL | Normalized to lowercase |
| display_name | VARCHAR(255) | NULLABLE | User-set display name |
| oauth_provider | VARCHAR(50) | NULLABLE | 'google' or 'azure' |
| oauth_id | VARCHAR(255) | NULLABLE | OAuth provider's user ID |
| profile_picture_url | VARCHAR(500) | NULLABLE | OAuth provider URL |
| timezone | VARCHAR(50) | NULLABLE | IANA timezone (e.g., 'America/New_York') |
| is_active | BOOLEAN | NOT NULL DEFAULT true | Soft delete flag (false = deleted) |
| created_at | TIMESTAMP | NOT NULL | Account creation |
| updated_at | TIMESTAMP | NOT NULL | Last modified |
| deleted_at | TIMESTAMP | NULLABLE | Soft delete timestamp |

**Data Integrity Rules**:
- Email must be unique across active users
- Either (oauth_provider, oauth_id) OR traditional login required
- Timezone must be valid IANA identifier
- Soft delete: Set is_active = false, do NOT delete row

---

### 2. sessions

**Purpose**: HTTP session management for authentication

```sql
CREATE TABLE sessions (
  id VARCHAR(255) PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  last_activity TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
```

**Columns**:

| Column | Type | Notes |
|--------|------|-------|
| id | VARCHAR(255) | Session token (secure random) |
| user_id | UUID | Foreign key to users |
| created_at | TIMESTAMP | Session creation time |
| expires_at | TIMESTAMP | Session expiration (typically 7 days) |
| last_activity | TIMESTAMP | Last user interaction |

**Data Integrity Rules**:
- Session ID must be cryptographically secure (no guessing)
- expires_at must be > created_at
- Expired sessions should be deleted on cleanup
- Deletion of user cascades to sessions (optional: soft delete sessions)

---

### 3. audit_logs

**Purpose**: Track all user actions for compliance and debugging

```sql
CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id VARCHAR(255),
  details JSONB,
  ip_address INET,
  user_agent VARCHAR(500),
  status VARCHAR(20),  -- 'success', 'failure'
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);
```

**Sample Actions**:
- `user.signin` - User logged in
- `goal.created` - Goal created
- `habit.completed` - Habit marked complete
- `achievement.unlocked` - Achievement earned
- `xp.awarded` - XP gained
- `settings.updated` - Preferences changed

---

## Content Tables

### 4. goals

**Purpose**: Long-term goals with progress tracking

```sql
CREATE TABLE goals (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50),  -- 'work', 'health', 'learning', 'personal'
  status VARCHAR(20) DEFAULT 'active',  -- 'active', 'completed', 'abandoned'
  priority INTEGER,  -- 1-5, lower = higher priority
  target_date DATE,
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_goals_user_status ON goals(user_id, status);
CREATE INDEX idx_goals_user_target ON goals(user_id, target_date);
CREATE INDEX idx_goals_user_active ON goals(user_id, is_active);
```

**Columns**:

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Immutable goal ID |
| user_id | UUID | Goal owner |
| title | VARCHAR(255) | Goal name (required) |
| description | TEXT | Detailed goal information |
| category | VARCHAR(50) | Classification (work, health, learning, personal) |
| status | VARCHAR(20) | active, completed, abandoned |
| priority | INTEGER | 1-5 (1 = highest) |
| target_date | DATE | When to complete (nullable) |
| metadata | JSONB | Custom fields: tags, color, custom_data |
| is_active | BOOLEAN | Soft delete (false = hidden) |
| created_at | TIMESTAMP | Goal creation |
| updated_at | TIMESTAMP | Last modified |

**Metadata Examples**:
```json
{
  "tags": ["health", "summer"],
  "color": "#ff6b6b",
  "custom_field": "value"
}
```

---

### 5. habits

**Purpose**: Recurring daily/weekly habits

```sql
CREATE TABLE habits (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  goal_id UUID REFERENCES goals(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50),
  frequency VARCHAR(20) DEFAULT 'daily',  -- 'daily', 'weekly', 'monthly'
  streak_days INTEGER DEFAULT 0,
  total_completions INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  archived BOOLEAN DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_habits_user_active ON habits(user_id, is_active);
CREATE INDEX idx_habits_goal_id ON habits(goal_id);
CREATE INDEX idx_habits_user_updated ON habits(user_id, updated_at DESC);
```

**Columns**:

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Immutable habit ID |
| user_id | UUID | Habit owner |
| goal_id | UUID | Parent goal (optional) |
| title | VARCHAR(255) | Habit name |
| description | TEXT | Why this habit matters |
| category | VARCHAR(50) | Classification |
| frequency | VARCHAR(20) | daily, weekly, monthly |
| streak_days | INTEGER | Current streak counter |
| total_completions | INTEGER | All-time completions |
| is_active | BOOLEAN | Active (true) or paused (false) |
| archived | BOOLEAN | Archived (hidden from lists) |
| created_at | TIMESTAMP | Habit creation |
| updated_at | TIMESTAMP | Last modified |

**Data Integrity Rules**:
- If goal_id changes, habit moves to new goal
- streak_days resets if completion missed on due date
- total_completions always increases (never decreases)
- is_active = false hides from daily view; archived = true hides completely

---

### 6. habit_completions

**Purpose**: Daily completion tracking for habits

```sql
CREATE TABLE habit_completions (
  id UUID PRIMARY KEY,
  habit_id UUID NOT NULL REFERENCES habits(id),
  user_id UUID NOT NULL REFERENCES users(id),
  completion_date DATE NOT NULL,
  completed_at TIMESTAMP NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(habit_id, completion_date)
);

CREATE INDEX idx_completions_habit_date ON habit_completions(habit_id, completion_date DESC);
CREATE INDEX idx_completions_user_date ON habit_completions(user_id, completion_date DESC);
```

**Purpose**: Track when habit was completed (supports streak calculation)

**Sample Query** (Streak Calculation):
```sql
-- Get user's habit streaks for today
SELECT 
  h.id,
  h.title,
  h.streak_days,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM habit_completions 
      WHERE habit_id = h.id 
      AND completion_date = CURRENT_DATE
    ) THEN 'completed_today'
    ELSE 'pending'
  END as status
FROM habits h
WHERE h.user_id = $1
  AND h.is_active = true
ORDER BY h.updated_at DESC;
```

---

### 7. quests

**Purpose**: Time-limited challenges and milestones

```sql
CREATE TABLE quests (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  quest_type VARCHAR(50),  -- 'habit_chain', 'goal_completion', 'daily', 'milestone'
  status VARCHAR(20) DEFAULT 'active',  -- 'active', 'completed', 'failed'
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  xp_reward INTEGER DEFAULT 100,
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_quests_user_status ON quests(user_id, status, end_date);
```

---

### 8. focus_sessions

**Purpose**: Pomodoro timer sessions and concentration tracking

```sql
CREATE TABLE focus_sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  goal_id UUID REFERENCES goals(id),
  session_type VARCHAR(50),  -- 'pomodoro', 'custom'
  duration_minutes INTEGER NOT NULL,
  actual_duration_minutes INTEGER,
  status VARCHAR(20) DEFAULT 'active',  -- 'active', 'paused', 'completed', 'abandoned'
  started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  paused_at TIMESTAMP,
  completed_at TIMESTAMP,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_focus_user_date ON focus_sessions(user_id, started_at DESC);
CREATE INDEX idx_focus_user_status ON focus_sessions(user_id, status);
```

---

## Gamification Tables

### 9. user_progress

**Purpose**: Denormalized user gamification metrics for fast queries

```sql
CREATE TABLE user_progress (
  id UUID PRIMARY KEY,
  user_id UUID UNIQUE NOT NULL REFERENCES users(id),
  total_xp BIGINT DEFAULT 0,
  total_coins BIGINT DEFAULT 0,
  current_level INTEGER DEFAULT 1,
  streaks_active INTEGER DEFAULT 0,  -- How many active habit streaks
  achievements_unlocked INTEGER DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT valid_xp CHECK (total_xp >= 0),
  CONSTRAINT valid_coins CHECK (total_coins >= 0),
  CONSTRAINT valid_level CHECK (current_level >= 1)
);

CREATE INDEX idx_progress_level ON user_progress(current_level DESC);
CREATE INDEX idx_progress_xp ON user_progress(total_xp DESC);
```

**Why Denormalization?**:
- User dashboard queries this for fast metrics display
- Denormalized values updated via triggers from points/coins ledgers
- Ensures consistent, always-available data (no aggregation needed)

**Update Trigger**:
```sql
-- When xp awarded, update user_progress
UPDATE user_progress
SET total_xp = total_xp + $1,
    updated_at = CURRENT_TIMESTAMP
WHERE user_id = $2;
```

---

### 10. points_ledger

**Purpose**: Immutable audit trail of all XP changes

```sql
CREATE TABLE points_ledger (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  points INTEGER NOT NULL,
  reason VARCHAR(100),  -- 'habit_completed', 'goal_completed', 'achievement_unlocked'
  resource_id UUID,
  resource_type VARCHAR(50),  -- 'habit', 'goal', 'achievement'
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_points_user ON points_ledger(user_id);
CREATE INDEX idx_points_reason ON points_ledger(reason);
```

**Data Integrity Rules**:
- APPEND ONLY - never delete or update
- Points can be positive or negative (penalties, reversals)
- Enables complete audit history and recalculation

---

### 11. coins_ledger

**Purpose**: Immutable audit trail of all currency changes

```sql
CREATE TABLE coins_ledger (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  coins INTEGER NOT NULL,
  transaction_type VARCHAR(50),  -- 'earned', 'spent', 'refund'
  reason VARCHAR(100),  -- 'quest_completed', 'battle_win', 'shop_purchase'
  resource_id UUID,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_coins_user ON coins_ledger(user_id);
CREATE INDEX idx_coins_type ON coins_ledger(transaction_type);
```

---

### 12. achievements

**Purpose**: Unlock conditions and achievement definitions

```sql
CREATE TABLE achievements (
  id UUID PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  icon_url VARCHAR(500),
  category VARCHAR(50),  -- 'progress', 'social', 'challenge'
  rarity VARCHAR(20),  -- 'common', 'rare', 'epic', 'legendary'
  xp_reward INTEGER DEFAULT 50,
  coins_reward INTEGER DEFAULT 10,
  unlock_condition JSONB NOT NULL,  -- Criteria to unlock
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

**unlock_condition Examples**:
```json
{
  "type": "habit_streak",
  "value": 30
}

{
  "type": "total_xp",
  "value": 1000
}

{
  "type": "goals_completed",
  "value": 5
}
```

---

### 13. user_achievements

**Purpose**: Track which achievements user has unlocked

```sql
CREATE TABLE user_achievements (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  achievement_id UUID NOT NULL REFERENCES achievements(id),
  unlocked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, achievement_id)
);

CREATE INDEX idx_user_achievements ON user_achievements(user_id);
```

---

## Settings Tables

### 14. user_settings

**Purpose**: User preferences and feature toggles

```sql
CREATE TABLE user_settings (
  id UUID PRIMARY KEY,
  user_id UUID UNIQUE NOT NULL REFERENCES users(id),
  theme VARCHAR(20) DEFAULT 'light',  -- 'light', 'dark', 'system'
  notifications_enabled BOOLEAN DEFAULT true,
  email_digest_enabled BOOLEAN DEFAULT true,
  email_digest_frequency VARCHAR(20) DEFAULT 'weekly',  -- 'daily', 'weekly', 'monthly'
  onboarding_completed BOOLEAN DEFAULT false,
  language VARCHAR(10) DEFAULT 'en',
  metadata JSONB DEFAULT '{}',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_settings_user ON user_settings(user_id);
```

**metadata Examples**:
```json
{
  "preferred_focus_duration": 25,
  "show_analytics": true,
  "hide_completed_habits": false,
  "color_scheme": "vibrant"
}
```

---

## Relationships

### Foreign Key Diagram

```
users (root)
├── sessions (user_id) → 1 user can have many sessions
├── audit_logs (user_id) → 1 user can have many audit logs
├── goals (user_id) → 1 user can have many goals
│   ├── habits (goal_id) → 1 goal can have many habits
│   │   └── habit_completions (habit_id) → 1 habit has many completions
│   └── focus_sessions (goal_id) → 1 goal has many focus sessions
├── quests (user_id) → 1 user can have many quests
├── focus_sessions (user_id) → 1 user has many focus sessions
├── user_progress (user_id) → 1:1 relationship
├── points_ledger (user_id) → 1 user has many transactions
├── coins_ledger (user_id) → 1 user has many transactions
├── user_achievements (user_id) → 1 user has many achievements
│   └── achievements (achievement_id) → many:many through user_achievements
└── user_settings (user_id) → 1:1 relationship
```

### Common Joins

**Get User's Active Goals with Habit Counts**:
```sql
SELECT 
  g.id,
  g.title,
  COUNT(h.id) as habit_count
FROM goals g
LEFT JOIN habits h ON g.id = h.goal_id AND h.is_active = true
WHERE g.user_id = $1
  AND g.status = 'active'
GROUP BY g.id
ORDER BY g.priority, g.created_at DESC;
```

**Get User's Progress Snapshot**:
```sql
SELECT 
  up.user_id,
  up.total_xp,
  up.total_coins,
  up.current_level,
  COUNT(ua.id) as achievements_count,
  COUNT(DISTINCT h.id) as active_habits_count
FROM user_progress up
LEFT JOIN user_achievements ua ON up.user_id = ua.user_id
LEFT JOIN habits h ON up.user_id = h.user_id AND h.is_active = true
WHERE up.user_id = $1
GROUP BY up.user_id;
```

---

## Data Integrity

### Constraints Applied

| Table | Constraint | Purpose |
|-------|-----------|---------|
| users | email UNIQUE | Prevent duplicate accounts |
| sessions | expires_at > created_at | Valid session duration |
| goals | priority >= 1 | Valid priority range |
| habits | streak_days >= 0 | Non-negative streak |
| user_progress | total_xp >= 0 | Valid XP balance |
| user_progress | total_coins >= 0 | Valid coin balance |
| user_progress | current_level >= 1 | Valid level |

### Soft Deletes

**Pattern**: Use boolean flag instead of hard delete

```sql
-- Hide a goal (soft delete)
UPDATE goals SET is_active = false WHERE id = $1;

-- Query ignores deleted records by default
SELECT * FROM goals WHERE user_id = $1 AND is_active = true;

-- Restore if needed (undo soft delete)
UPDATE goals SET is_active = true WHERE id = $1;
```

**Advantages**:
- Preserves audit trail (deleted_at timestamp)
- Allows recovery/restore
- Maintains referential integrity
- Soft-deleted rows don't break foreign keys

---

## Query Patterns

### Pattern 1: User Dashboard (Fast Queries)

```sql
-- Get user's summary for dashboard (< 50ms)
SELECT 
  u.id,
  u.display_name,
  up.total_xp,
  up.total_coins,
  up.current_level,
  COUNT(DISTINCT g.id) as goal_count,
  COUNT(DISTINCT h.id) as active_habit_count
FROM users u
JOIN user_progress up ON u.id = up.user_id
LEFT JOIN goals g ON u.id = g.user_id AND g.status = 'active'
LEFT JOIN habits h ON u.id = h.user_id AND h.is_active = true
WHERE u.id = $1
  AND u.is_active = true
GROUP BY u.id, up.id;
```

### Pattern 2: Daily Habit Status

```sql
-- Get user's habits for today
SELECT 
  h.id,
  h.title,
  h.streak_days,
  CASE 
    WHEN hc.completion_date = CURRENT_DATE THEN 'completed'
    ELSE 'pending'
  END as today_status
FROM habits h
LEFT JOIN habit_completions hc ON h.id = hc.habit_id 
  AND hc.completion_date = CURRENT_DATE
WHERE h.user_id = $1
  AND h.is_active = true
ORDER BY h.frequency DESC, h.updated_at DESC;
```

### Pattern 3: User Achievements Progress

```sql
-- Get achievement progress for user
SELECT 
  a.id,
  a.title,
  a.unlock_condition,
  CASE 
    WHEN ua.id IS NOT NULL THEN 'unlocked'
    ELSE 'locked'
  END as status,
  ua.unlocked_at
FROM achievements a
LEFT JOIN user_achievements ua ON a.id = ua.achievement_id 
  AND ua.user_id = $1
ORDER BY 
  CASE WHEN ua.id IS NULL THEN 0 ELSE 1 END DESC,
  a.rarity DESC;
```

### Pattern 4: Recent Activity (Audit Trail)

```sql
-- Get user's recent actions for audit
SELECT 
  action,
  resource_type,
  COUNT(*) as count,
  MAX(created_at) as last_at
FROM audit_logs
WHERE user_id = $1
  AND created_at > CURRENT_TIMESTAMP - INTERVAL '7 days'
GROUP BY action, resource_type
ORDER BY last_at DESC;
```

---

## Performance Optimization

### Indexing Strategy

**Hot Queries** (Used Frequently):
- `goals(user_id, status)` - Dashboard load
- `habits(user_id, is_active)` - Daily habit view
- `habit_completions(habit_id, completion_date)` - Streak calc
- `user_progress(total_xp, current_level)` - Leaderboards
- `points_ledger(user_id)` - XP history

**Result**: All high-traffic queries use covering indexes for fast execution

### Denormalization Benefits

| Field | Location | Reason |
|-------|----------|--------|
| total_xp | user_progress | Avoids summing entire points_ledger |
| total_coins | user_progress | Avoids summing entire coins_ledger |
| streak_days | habits | Avoids complex date calculations |
| total_completions | habits | Avoids counting habits table |

**Trade-off**: Update cost (trigger on ledger insert) vs. Read speed (direct field access)

---

## Maintenance Tasks

### Daily

```sql
-- Clean up expired sessions (runs once daily)
DELETE FROM sessions WHERE expires_at < NOW();

-- Check for broken audit logs
SELECT COUNT(*) FROM audit_logs WHERE user_id NOT IN (SELECT id FROM users);
```

### Weekly

```sql
-- Recalculate user streaks (ensure streak_days is accurate)
UPDATE habits
SET streak_days = (
  SELECT COUNT(DISTINCT completion_date)
  FROM habit_completions
  WHERE habit_id = habits.id
    AND completion_date >= CURRENT_DATE - INTERVAL '90 days'
)
WHERE is_active = true;
```

### Monthly

```sql
-- Archive completed goals
UPDATE goals
SET archived = true
WHERE status = 'completed'
  AND updated_at < CURRENT_TIMESTAMP - INTERVAL '30 days';

-- Analyze query performance
ANALYZE;

-- Vacuum to reclaim space
VACUUM;
```

---

## Testing Queries

### Verify Referential Integrity

```sql
-- Find goals without users (data corruption)
SELECT * FROM goals g
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = g.user_id);

-- Find habits without goals (orphans - should be allowed)
SELECT COUNT(*) FROM habits WHERE goal_id IS NULL;

-- Find sessions for deleted users (should be deleted)
SELECT * FROM sessions s
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = s.user_id);
```

### Calculate Statistics

```sql
-- User distribution by level
SELECT 
  current_level,
  COUNT(*) as user_count,
  ROUND(AVG(total_xp)::numeric, 0) as avg_xp
FROM user_progress
GROUP BY current_level
ORDER BY current_level;

-- Most common achievement
SELECT 
  a.title,
  COUNT(ua.id) as unlocked_count
FROM achievements a
LEFT JOIN user_achievements ua ON a.id = ua.achievement_id
GROUP BY a.id
ORDER BY unlocked_count DESC
LIMIT 10;
```

---

## Backup & Recovery

### Backup Strategy

**Full Backup** (Daily):
```bash
pg_dump passion-os > backup-$(date +%Y%m%d).sql
```

**Point-in-Time Recovery** (Weeks):
```bash
# Enable WAL archiving in postgresql.conf
wal_level = replica
archive_mode = on
archive_command = 'cp %p /wal-archive/%f'
```

**Recovery**:
```bash
# Restore specific point in time
pg_restore --data-only --jobs=4 backup-20260115.sql | psql passion-os
```

---

## Additional Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Query Performance Analysis](https://www.postgresql.org/docs/current/sql-explain.html)
- [Index Types and Usage](https://www.postgresql.org/docs/current/indexes-types.html)
- [Foreign Keys Best Practices](https://www.postgresql.org/docs/current/ddl-constraints.html)
- [JSONB Documentation](https://www.postgresql.org/docs/current/datatype-json.html)

---

**Last Updated**: January 18, 2026  
**Maintained By**: Backend & Database Team  
**Schema Version**: 2.0.0  
**Questions?** See ARCHITECTURE.md or check backend code at `app/backend/migrations/`
