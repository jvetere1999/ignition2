# gaps.md — Action Items Registry

**Created:** January 9, 2026  
**Purpose:** Track required actions for DB runtime error diagnosis and resolution

---

## Active Actions

### ACTION-001: Obtain Production Database Logs

| Attribute | Value |
|-----------|-------|
| **Priority** | 🔴 Critical |
| **Blocks** | Phase 1: Error Root Cause Analysis |
| **Owner** | TBD |
| **Description** | Retrieve recent error logs from Fly.io to identify exact DB error messages |
| **Steps** |
| 1. Run `fly logs --app ignition-api` |
| 2. Filter for `database_error`, `internal_error`, or `sqlx` mentions |
| 3. Capture specific error text (e.g., "relation X does not exist") |
| **Evidence Required** | Log output file or copy of relevant error lines |
| **Resolves** | UNKNOWN-004 |

---

### ACTION-002: Query Production Migration State

| Attribute | Value |
|-----------|-------|
| **Priority** | 🔴 Critical |
| **Blocks** | Phase 2: Schema Verification |
| **Owner** | TBD |
| **Description** | Verify which migrations have been applied to production |
| **Steps** |
| 1. Connect to production database |
| 2. Run: `SELECT version, checksum, installed_on FROM _sqlx_migrations ORDER BY version;` |
| 3. Compare against 14 expected migrations (0001-0014) |
| **Evidence Required** | Query results showing applied migrations |
| **Resolves** | UNKNOWN-002, UNKNOWN-003 |

---

### ACTION-003: Identify Production Database Provider

| Attribute | Value |
|-----------|-------|
| **Priority** | 🟡 High |
| **Blocks** | Understanding connection behavior |
| **Owner** | TBD |
| **Description** | Determine if production uses Neon, Fly Postgres, or another provider |
| **Steps** |
| 1. Check Fly.io secrets: `fly secrets list --app ignition-api` |
| 2. Inspect `DATABASE_URL` format (if accessible) |
| 3. Alternative: Check Fly dashboard for attached databases |
| **Evidence Required** | Provider name and connection format |
| **Resolves** | UNKNOWN-001, UNKNOWN-005 |

---

### ACTION-004: Verify Table Existence Post-Migration

| Attribute | Value |
|-----------|-------|
| **Priority** | 🟡 High |
| **Blocks** | Phase 3: Fix Implementation |
| **Owner** | TBD |
| **Description** | After confirming migrations, verify expected tables exist |
| **Steps** |
| 1. Query: `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;` |
| 2. Compare against tables used in `*_repos.rs` files |
| 3. Document any missing tables |
| **Expected Tables** |
| - users, accounts, sessions, verification_tokens |
| - user_progress, user_wallet, user_skills, user_achievements, user_streaks |
| - focus_sessions, focus_pause_state |
| - quests, universal_quests, user_quest_progress |
| - habits, habit_completions |
| - goals, goal_milestones |
| - calendar_events, daily_plans, daily_plan_items |
| - exercises, workouts, workout_sets, personal_records |
| - market_items, market_transactions |
| - reference_tracks, analysis_frames |
| - books, reading_sessions |
| - courses, lessons, user_course_progress, flashcard_decks, flashcards |
| - ideas, infobase_entries, feedback |
| - prompt_templates, platform_settings |
| **Evidence Required** | Table list diff |

---

### ACTION-005: Compare Column Schemas

| Attribute | Value |
|-----------|-------|
| **Priority** | 🟡 High |
| **Blocks** | Phase 3: Fix Implementation |
| **Owner** | TBD |
| **Description** | Verify columns in key tables match model expectations |
| **Steps** |
| 1. For each critical table, query: `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'X' ORDER BY ordinal_position;` |
| 2. Compare against `*_models.rs` struct fields |
| 3. Document mismatches |
| **Critical Tables** | users, focus_sessions, quests, habits, goals, calendar_events |
| **Evidence Required** | Column comparison report |

---

### ACTION-006: Test Health Endpoint

| Attribute | Value |
|-----------|-------|
| **Priority** | 🟢 Normal |
| **Blocks** | Nothing |
| **Owner** | TBD |
| **Description** | Verify API is running and can connect to DB |
| **Steps** |
| 1. `curl https://api.ecent.online/health` |
| 2. Check `schema_version` in response |
| **Expected Response** |
```json
{
  "status": "healthy",
  "version": "0.1.0",
  "schema_version": 14,
  "timestamp": "..."
}
```
| **Evidence Required** | HTTP response JSON |

---

### ACTION-007: Review Startup Logs for Migration Output

| Attribute | Value |
|-----------|-------|
| **Priority** | 🟡 High |
| **Blocks** | Confirming migration success |
| **Owner** | TBD |
| **Description** | Check recent deploy logs for migration messages |
| **Steps** |
| 1. Run `fly logs --app ignition-api` during or after deploy |
| 2. Look for: "Checking database migrations...", "Applied N new migration(s)", or "Database schema is up to date" |
| 3. Look for: "Migration failed:" errors |
| **Evidence Required** | Log lines showing migration status |
| **Resolves** | UNKNOWN-003 (partially) |

---

## Completed Actions

(None yet)

---

## Action Resolution Process

1. Execute the steps listed
2. Capture evidence (logs, query results, screenshots)
3. Move action to "Completed Actions" with:
   - Completion date
   - Evidence path (file or inline)
   - Any findings that update UNKNOWN.md
