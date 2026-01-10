# Database Schema Documentation

**Current Version:** 14 (0014_add_performance_indexes)  
**Last Updated:** January 5, 2026

---

## Version History

| Version | Migration | Date | Changes |
|---------|-----------|------|---------|
| 1 | 0001_create_auth_tables | 2026-01-02 | Auth.js tables (users, accounts, sessions, verification_tokens) |
| 2 | 0002_create_app_tables | 2026-01-02 | Core app tables (focus_sessions, quests, user_progress, etc.) |
| 3 | 0003_add_planner_exercise | 2026-01-02 | Calendar events, exercises, workouts, personal records |
| 4 | 0004_add_user_approval | 2026-01-02 | User approval flow (approved, denial_reason columns) |
| 5 | 0005_add_track_analysis_cache | 2026-01-02 | Track analysis caching |
| 6 | 0006_add_focus_expiry | 2026-01-03 | Focus session expiry tracking |
| 7 | 0007_universal_quests_admin | 2026-01-03 | Universal quests, admin columns, age verification |
| 8 | 0008_learning_suite | 2026-01-03 | Courses, lessons, flashcards, journal, recipes |
| 9 | 0009_goals_infobase_focus_pause | 2026-01-04 | Goals, infobase entries, focus pause state |
| 10 | 0010_habits_activities_infobase | 2026-01-04 | Habits, activity events, infobase sync |
| 11 | 0011_book_tracker | 2026-01-04 | Books, reading sessions |
| 12 | 0012_tos_db_version | 2026-01-04 | TOS acceptance, db_metadata table |
| 13 | 0013_add_users_last_activity | 2026-01-04 | users.last_activity_at column + index |
| 14 | 0014_add_performance_indexes | 2026-01-05 | Performance indexes for Today page queries |

---

## Core Tables

### users
Primary user table (extended from Auth.js).

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | User ID (from Auth.js) |
| name | TEXT | Display name |
| email | TEXT UNIQUE | Email address |
| emailVerified | TEXT | Email verification timestamp |
| image | TEXT | Avatar URL |
| role | TEXT | User role (user, admin) |
| approved | INTEGER | Approval status (0=pending, 1=approved) |
| denial_reason | TEXT | Reason if denied |
| age_verified | INTEGER | Age verification status |
| age_verified_at | TEXT | Age verification timestamp |
| tos_accepted | INTEGER | TOS acceptance status |
| tos_accepted_at | TEXT | TOS acceptance timestamp |
| tos_version | TEXT | TOS version accepted |
| last_activity_at | TEXT | Last activity timestamp (ISO format, for gap detection) |
| created_at | TEXT | Creation timestamp |
| updated_at | TEXT | Last update timestamp |

### accounts
OAuth provider accounts (Auth.js).

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | Account ID |
| userId | TEXT FK | Reference to users.id |
| type | TEXT | Account type |
| provider | TEXT | OAuth provider (google, azure-ad) |
| providerAccountId | TEXT | Provider's account ID |
| refresh_token | TEXT | OAuth refresh token |
| access_token | TEXT | OAuth access token |
| expires_at | INTEGER | Token expiry |
| token_type | TEXT | Token type |
| scope | TEXT | OAuth scope |
| id_token | TEXT | ID token |
| session_state | TEXT | Session state |

### sessions
Active user sessions.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | Session ID |
| sessionToken | TEXT UNIQUE | Session token |
| userId | TEXT FK | Reference to users.id |
| expires | TEXT | Expiry timestamp |

### db_metadata
Database version and metadata tracking.

| Column | Type | Description |
|--------|------|-------------|
| key | TEXT PK | Metadata key |
| value | TEXT | Metadata value |
| updated_at | TEXT | Last update |

---

## User Progress Tables

### user_progress
XP, levels, coins, and skill tracking.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | Progress ID |
| user_id | TEXT FK | Reference to users.id |
| total_xp | INTEGER | Total XP earned |
| level | INTEGER | Current level |
| coins | INTEGER | Current coin balance |
| knowledge_xp | INTEGER | Knowledge skill XP |
| guts_xp | INTEGER | Guts skill XP |
| proficiency_xp | INTEGER | Proficiency skill XP |
| kindness_xp | INTEGER | Kindness skill XP |
| charm_xp | INTEGER | Charm skill XP |
| created_at | TEXT | Creation timestamp |
| updated_at | TEXT | Last update |

### activity_events
Append-only activity log for XP distribution.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | Event ID |
| user_id | TEXT FK | Reference to users.id |
| event_type | TEXT | Event type (focus_complete, workout_complete, etc.) |
| entity_id | TEXT | Related entity ID |
| xp_earned | INTEGER | XP awarded |
| coins_earned | INTEGER | Coins awarded |
| skill_id | TEXT | Skill that received XP |
| metadata | TEXT | JSON metadata |
| created_at | TEXT | Event timestamp |

---

## Focus Tables

### focus_sessions
Focus session tracking.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | Session ID |
| user_id | TEXT FK | Reference to users.id |
| mode | TEXT | Session mode (focus, short_break, long_break) |
| duration | INTEGER | Duration in seconds |
| status | TEXT | Status (active, completed, abandoned) |
| started_at | TEXT | Start timestamp |
| completed_at | TEXT | Completion timestamp |
| expires_at | TEXT | Expiry timestamp |
| paused_at | TEXT | Pause timestamp |
| pause_remaining | INTEGER | Remaining time when paused |

---

## Planner Tables

### calendar_events
Calendar/planner events.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | Event ID |
| user_id | TEXT FK | Reference to users.id |
| title | TEXT | Event title |
| description | TEXT | Event description |
| event_type | TEXT | Type (meeting, workout, focus, appointment) |
| start_time | TEXT | Start timestamp |
| end_time | TEXT | End timestamp |
| all_day | INTEGER | All-day flag |
| color | TEXT | Display color |
| recurrence | TEXT | Recurrence pattern |
| linked_workout_id | TEXT | Linked workout |
| completed | INTEGER | Completion status |
| created_at | TEXT | Creation timestamp |
| updated_at | TEXT | Last update |

---

## Quest Tables

### quests
Universal quest definitions (admin-created).

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | Quest ID |
| title | TEXT | Quest title |
| description | TEXT | Quest description |
| type | TEXT | Quest type (daily, weekly, one_time) |
| target | INTEGER | Target count |
| xp_reward | INTEGER | XP reward |
| coin_reward | INTEGER | Coin reward |
| skill_id | TEXT | Associated skill |
| is_universal | INTEGER | Universal (all users) flag |
| is_active | INTEGER | Active flag |
| created_by | TEXT | Creator user ID |
| created_at | TEXT | Creation timestamp |

### user_quest_progress
User progress on quests.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | Progress ID |
| user_id | TEXT FK | Reference to users.id |
| quest_id | TEXT FK | Reference to quests.id |
| current_count | INTEGER | Current progress |
| completed | INTEGER | Completion flag |
| completed_at | TEXT | Completion timestamp |
| last_reset | TEXT | Last reset timestamp |

---

## Fitness Tables

### exercises
Exercise library.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | Exercise ID |
| name | TEXT | Exercise name |
| category | TEXT | Category (strength, cardio, etc.) |
| muscle_groups | TEXT | JSON array of muscle groups |
| equipment | TEXT | Required equipment |
| instructions | TEXT | How-to instructions |
| is_custom | INTEGER | Custom exercise flag |
| created_by | TEXT | Creator user ID |

### workouts
Workout templates.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | Workout ID |
| user_id | TEXT FK | Reference to users.id |
| name | TEXT | Workout name |
| description | TEXT | Workout description |
| estimated_duration | INTEGER | Duration in minutes |
| created_at | TEXT | Creation timestamp |
| updated_at | TEXT | Last update |

### workout_sections
Sections within workouts.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | Section ID |
| workout_id | TEXT FK | Reference to workouts.id |
| name | TEXT | Section name (Warmup, Main, Cooldown, etc.) |
| section_type | TEXT | Type (warmup, main, cooldown, superset, circuit) |
| order_index | INTEGER | Display order |

### workout_exercises
Exercises within workout sections.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | Entry ID |
| section_id | TEXT FK | Reference to workout_sections.id |
| exercise_id | TEXT FK | Reference to exercises.id |
| sets | INTEGER | Target sets |
| reps | TEXT | Target reps (can be range) |
| weight | REAL | Target weight |
| rest_seconds | INTEGER | Rest between sets |
| order_index | INTEGER | Display order |
| notes | TEXT | Exercise notes |

### workout_sessions
Logged workout sessions.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | Session ID |
| user_id | TEXT FK | Reference to users.id |
| workout_id | TEXT | Source workout (nullable for freeform) |
| started_at | TEXT | Start timestamp |
| completed_at | TEXT | Completion timestamp |
| notes | TEXT | Session notes |

### workout_sets
Individual set logs.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | Set ID |
| session_id | TEXT FK | Reference to workout_sessions.id |
| exercise_id | TEXT FK | Reference to exercises.id |
| set_number | INTEGER | Set number |
| weight | REAL | Weight used |
| reps | INTEGER | Reps completed |
| rpe | REAL | Rate of perceived exertion (1-10) |
| notes | TEXT | Set notes |
| created_at | TEXT | Log timestamp |

### personal_records
PR tracking.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | Record ID |
| user_id | TEXT FK | Reference to users.id |
| exercise_id | TEXT FK | Reference to exercises.id |
| weight | REAL | Record weight |
| reps | INTEGER | Reps at weight |
| achieved_at | TEXT | Achievement timestamp |
| set_id | TEXT | Source set |

---

## Learning Tables

### courses
Course definitions.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | Course ID |
| title | TEXT | Course title |
| description | TEXT | Course description |
| category | TEXT | Course category |
| difficulty | TEXT | Difficulty level |
| estimated_hours | INTEGER | Estimated duration |
| image_url | TEXT | Cover image |
| is_published | INTEGER | Published flag |
| created_at | TEXT | Creation timestamp |

### lessons
Lessons within courses.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | Lesson ID |
| course_id | TEXT FK | Reference to courses.id |
| title | TEXT | Lesson title |
| content | TEXT | Lesson content (markdown) |
| order_index | INTEGER | Display order |
| duration_minutes | INTEGER | Estimated duration |
| xp_reward | INTEGER | XP for completion |

### user_lesson_progress
User progress on lessons.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | Progress ID |
| user_id | TEXT FK | Reference to users.id |
| lesson_id | TEXT FK | Reference to lessons.id |
| completed | INTEGER | Completion flag |
| completed_at | TEXT | Completion timestamp |

### flashcard_decks
Flashcard deck definitions.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | Deck ID |
| user_id | TEXT FK | Reference to users.id |
| title | TEXT | Deck title |
| description | TEXT | Deck description |
| card_count | INTEGER | Number of cards |
| created_at | TEXT | Creation timestamp |
| updated_at | TEXT | Last update |

### flashcards
Individual flashcards.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | Card ID |
| deck_id | TEXT FK | Reference to flashcard_decks.id |
| front | TEXT | Front content |
| back | TEXT | Back content |
| next_review | TEXT | Next review timestamp |
| interval | INTEGER | Review interval (days) |
| ease_factor | REAL | Ease factor for SRS |
| review_count | INTEGER | Number of reviews |

### journal_entries
Daily journal entries.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | Entry ID |
| user_id | TEXT FK | Reference to users.id |
| date | TEXT | Entry date |
| content | TEXT | Entry content |
| mood | INTEGER | Mood rating (1-5) |
| created_at | TEXT | Creation timestamp |
| updated_at | TEXT | Last update |

---

## Habit Tables

### habits
Habit definitions.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | Habit ID |
| user_id | TEXT FK | Reference to users.id |
| name | TEXT | Habit name |
| description | TEXT | Habit description |
| frequency | TEXT | Frequency (daily, weekly) |
| target_count | INTEGER | Target per period |
| streak_current | INTEGER | Current streak |
| streak_best | INTEGER | Best streak |
| created_at | TEXT | Creation timestamp |
| updated_at | TEXT | Last update |

### habit_logs
Daily habit completions.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | Log ID |
| habit_id | TEXT FK | Reference to habits.id |
| user_id | TEXT FK | Reference to users.id |
| date | TEXT | Log date |
| count | INTEGER | Completion count |
| notes | TEXT | Notes |
| created_at | TEXT | Log timestamp |

---

## Goal Tables

### goals
Long-term goals.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | Goal ID |
| user_id | TEXT FK | Reference to users.id |
| title | TEXT | Goal title |
| description | TEXT | Goal description |
| target_date | TEXT | Target completion date |
| skill_id | TEXT | Associated skill |
| status | TEXT | Status (active, completed, abandoned) |
| progress | INTEGER | Progress percentage |
| created_at | TEXT | Creation timestamp |
| updated_at | TEXT | Last update |

### goal_milestones
Milestones within goals.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | Milestone ID |
| goal_id | TEXT FK | Reference to goals.id |
| title | TEXT | Milestone title |
| target_date | TEXT | Target date |
| completed | INTEGER | Completion flag |
| completed_at | TEXT | Completion timestamp |
| order_index | INTEGER | Display order |

---

## Book Tracker Tables

### books
Book entries.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | Book ID |
| user_id | TEXT FK | Reference to users.id |
| title | TEXT | Book title |
| author | TEXT | Author name |
| total_pages | INTEGER | Total pages |
| current_page | INTEGER | Current page |
| status | TEXT | Status (reading, completed, want-to-read, dnf) |
| rating | INTEGER | Rating (1-5) |
| started_at | TEXT | Start timestamp |
| finished_at | TEXT | Finish timestamp |
| notes | TEXT | Notes |
| cover_url | TEXT | Cover image URL |
| genre | TEXT | Genre |
| created_at | TEXT | Creation timestamp |
| updated_at | TEXT | Last update |

### reading_sessions
Reading session logs.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | Session ID |
| user_id | TEXT FK | Reference to users.id |
| book_id | TEXT FK | Reference to books.id |
| pages_read | INTEGER | Pages read |
| duration | INTEGER | Duration in minutes |
| notes | TEXT | Session notes |
| date | TEXT | Session date |

---

## Market Tables

### rewards
Market reward definitions.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | Reward ID |
| user_id | TEXT FK | Reference to users.id (null for global) |
| name | TEXT | Reward name |
| description | TEXT | Reward description |
| cost | INTEGER | Cost in coins |
| is_global | INTEGER | Global reward flag |
| is_active | INTEGER | Active flag |
| created_at | TEXT | Creation timestamp |

### reward_purchases
User reward purchases.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | Purchase ID |
| user_id | TEXT FK | Reference to users.id |
| reward_id | TEXT FK | Reference to rewards.id |
| redeemed | INTEGER | Redemption flag |
| redeemed_at | TEXT | Redemption timestamp |
| purchased_at | TEXT | Purchase timestamp |

---

## Admin Tables

### skill_definitions
Skill configuration (admin-managed).

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | Skill ID (knowledge, guts, etc.) |
| name | TEXT | Display name |
| description | TEXT | Skill description |
| color | TEXT | Display color (hex) |
| max_level | INTEGER | Maximum level |
| xp_scaling_base | INTEGER | Base XP for level 1 |
| xp_scaling_multiplier | REAL | XP growth rate |
| display_order | INTEGER | Display order |
| is_active | INTEGER | Active flag |
| created_at | TEXT | Creation timestamp |
| updated_at | TEXT | Last update |

### user_feedback
User-submitted feedback.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | Feedback ID |
| user_id | TEXT FK | Reference to users.id |
| type | TEXT | Type (bug, feature, other) |
| title | TEXT | Feedback title |
| description | TEXT | Feedback content |
| status | TEXT | Status (open, in_progress, resolved, closed) |
| priority | TEXT | Priority (low, medium, high, critical) |
| admin_notes | TEXT | Admin notes |
| created_at | TEXT | Submission timestamp |
| updated_at | TEXT | Last update |

---

## API Routes

### Public Routes (No Auth)
- `GET /` - Landing page
- `GET /about` - Features page
- `GET /privacy` - Privacy policy
- `GET /terms` - Terms of service
- `GET /contact` - Contact page
- `GET /help/*` - Help documentation
- `GET /age-verification` - Age verification
- `POST /api/auth/*` - Auth.js handlers

### Protected Routes (Auth Required)
- `GET/POST /api/focus` - Focus session management
- `GET /api/focus/active` - Active session check
- `POST /api/focus/[id]/complete` - Complete session
- `POST /api/focus/[id]/abandon` - Abandon session
- `GET/POST/PUT/DELETE /api/calendar` - Planner events
- `GET/POST/PUT/DELETE /api/quests` - Quest management
- `GET/POST/PUT/DELETE /api/habits` - Habit management
- `GET/POST/PUT/DELETE /api/goals` - Goal management
- `GET/POST /api/exercise` - Exercise/workout management
- `GET/POST/DELETE /api/books` - Book tracking
- `GET/POST /api/learn/*` - Learning suite
- `GET/POST /api/progress` - XP and leveling
- `GET/POST /api/market` - Rewards
- `GET /api/auth/approval-status` - Check approval
- `POST /api/auth/verify-age` - Verify age
- `POST /api/auth/accept-tos` - Accept TOS
- `POST /api/user/delete` - Delete all user data
- `GET /api/user/export` - Export user data

### Admin Routes (Admin Only)
- `GET/PATCH /api/admin/users` - User management
- `GET/POST/PATCH/DELETE /api/admin/quests` - Quest management
- `GET/PATCH /api/admin/feedback` - Feedback management
- `GET/POST/PATCH/DELETE /api/admin/skills` - Skill definitions
- `GET /api/admin/stats` - Platform statistics
- `POST /api/admin/backup` - Create database backup
- `POST /api/admin/restore` - Restore from backup

---

## Backup Format

Backups are JSON files with the following structure:

```json
{
  "version": 12,
  "versionName": "0012_tos_db_version",
  "createdAt": "2026-01-04T00:00:00.000Z",
  "tables": {
    "users": [...],
    "accounts": [...],
    "sessions": [...],
    "user_progress": [...],
    // ... all tables
  }
}
```

### Version Migration

When restoring from an older version, the restore function applies migrations:
- v1-v3: No user_progress columns, need initialization
- v4-v6: No universal quests, need skill columns
- v7-v11: Missing TOS columns, need defaults
- v12+: Current format

---

## Indexes

```sql
-- Users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_approved ON users(approved);
CREATE INDEX idx_users_tos ON users(tos_accepted);

-- Sessions
CREATE INDEX idx_sessions_userId ON sessions(userId);
CREATE INDEX idx_sessions_token ON sessions(sessionToken);

-- Focus
CREATE INDEX idx_focus_user ON focus_sessions(user_id);
CREATE INDEX idx_focus_status ON focus_sessions(status);

-- Calendar
CREATE INDEX idx_calendar_user ON calendar_events(user_id);
CREATE INDEX idx_calendar_start ON calendar_events(start_time);

-- Quests
CREATE INDEX idx_quests_universal ON quests(is_universal);
CREATE INDEX idx_quest_progress_user ON user_quest_progress(user_id);

-- Habits
CREATE INDEX idx_habits_user ON habits(user_id);
CREATE INDEX idx_habit_logs_date ON habit_logs(date);

-- Books
CREATE INDEX idx_books_user ON books(user_id);
CREATE INDEX idx_reading_sessions_book ON reading_sessions(book_id);

-- Users (migration 0013)
CREATE INDEX idx_users_last_activity ON users(last_activity_at);

-- Performance Indexes (migration 0014)
CREATE INDEX idx_daily_plans_user_date ON daily_plans(user_id, plan_date);
CREATE INDEX idx_activity_events_user_created ON activity_events(user_id, created_at);
CREATE INDEX idx_activity_events_user_type ON activity_events(user_id, event_type);
CREATE INDEX idx_focus_sessions_user_status ON focus_sessions(user_id, status);
CREATE INDEX idx_user_streaks_user ON user_streaks(user_id);
```

---

*Last updated: January 5, 2026 - Version 14*

