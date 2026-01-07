"Feature table migration notes - D1 to Postgres translation documentation."

# Feature Table Migration Notes

**Date:** January 7, 2026  
**Branch:** `refactor/stack-split`  
**Purpose:** Document D1 → Postgres schema translation decisions

---

## Overview

This document records the decisions and changes made when translating D1 (SQLite) schema to Postgres for feature tables.

**Policy:** 1:1 schema translation by default. Any optimizations require explicit documentation in `schema_exceptions.md`.

---

## Migration Files Created

| File | Tables | Wave | Priority |
|------|--------|------|----------|
| `0001_auth_substrate.sql` | users, accounts, sessions, roles, entitlements, audit_log, activity_events | 0 | Substrate |
| `0002_gamification_substrate.sql` | skill_definitions, user_skills, achievement_definitions, user_achievements, user_progress, user_wallet, points_ledger, user_streaks | 1 | 1.1 |
| `0003_focus_substrate.sql` | focus_sessions, focus_pause_state | 1 | 1.2 |
| `0004_habits_goals_substrate.sql` | habits, habit_logs, goals, goal_milestones | 1 | 1.3, 1.4 |
| `0005_quests_substrate.sql` | universal_quests, user_quest_progress, quests | 2 | 2.1 |
| `0006_planning_substrate.sql` | calendar_events, daily_plans, plan_templates | 2 | 2.2, 2.3 |
| `0007_market_substrate.sql` | market_items, user_purchases | 3 | 3.4 |

---

## Type Mappings Applied

| D1 (SQLite) | Postgres | Notes |
|-------------|----------|-------|
| `TEXT PRIMARY KEY` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` | Proper UUIDs |
| `TEXT` (UUID-like) | `UUID` | With REFERENCES where applicable |
| `INTEGER` (boolean) | `BOOLEAN` | Proper boolean type |
| `TEXT` (timestamp) | `TIMESTAMPTZ` | With timezone |
| `datetime('now')` | `NOW()` | Postgres function |
| `TEXT` (JSON) | `JSONB` | Indexable JSON |
| `INTEGER` | `INTEGER` | Unchanged |
| `REAL` | `REAL` or `DOUBLE PRECISION` | As appropriate |

---

## Schema Enhancements (Non-Breaking)

The following enhancements were made without changing D1 semantics:

### 1. Proper Foreign Keys

D1 foreign keys are not enforced; Postgres enforces them.

```sql
-- D1 (not enforced)
FOREIGN KEY (user_id) REFERENCES users(id)

-- Postgres (enforced with cascade)
user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
```

### 2. Auto-Updating Timestamps

```sql
-- Added trigger for updated_at columns
CREATE TRIGGER update_<table>_updated_at
    BEFORE UPDATE ON <table>
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### 3. CHECK Constraints

```sql
-- D1 has no CHECK constraints
-- Postgres adds validation
status TEXT NOT NULL CHECK (status IN ('active', 'completed', 'abandoned'))
```

### 4. Partial Indexes

```sql
-- Postgres-specific optimization for common queries
CREATE INDEX idx_focus_sessions_active ON focus_sessions(user_id) WHERE status = 'active';
```

### 5. Views for Common Queries

Views added to simplify complex queries without changing underlying schema.

---

## Table-by-Table Notes

### Gamification Tables

#### skill_definitions
- No changes from D1 structure
- Added `created_at` column

#### user_skills
- Added `created_at` column
- Changed `updated_at` from TEXT to TIMESTAMPTZ

#### achievement_definitions
- Changed `trigger_config_json` from TEXT to JSONB (`trigger_config`)
- Added indexes for category and trigger_type

#### user_achievements
- No structural changes

#### user_progress
- Separated from user_wallet for clarity (D1 had overlapping columns)
- Added `total_skill_stars` aggregate column

#### user_wallet
- Separated from user_progress
- Added `total_earned` and `total_spent` for statistics

#### points_ledger
- Changed `event_id` from TEXT to UUID
- Added `skill_key` as nullable FK

#### user_streaks
- Changed `last_activity_date` from TEXT to DATE
- Added longest_streak tracking

### Focus Tables

#### focus_sessions
- Combined `duration` (INTEGER) into `duration_seconds`
- Added `task_id` and `task_title` for optional task association
- Added CHECK constraint for status values

#### focus_pause_state
- Added `session_id` FK to focus_sessions
- Simplified structure

### Habits/Goals Tables

#### habits
- Added `current_streak` and `longest_streak` (denormalized for performance)
- Added `custom_days` for custom frequency support
- Added `sort_order` for ordering

#### habit_logs
- Added `completed_date` DATE column for easier querying
- Added UNIQUE constraint to prevent duplicate completions

#### goals
- Added `priority` column
- Added `started_at` column
- Added CHECK constraint for progress (0-100)

#### goal_milestones
- Added `description` column
- Renamed `is_completed` → `is_completed` (BOOLEAN)

### Quest Tables

#### universal_quests
- Changed `skill_id` to `skill_key` (FK to skill_definitions)
- Added `target_type` and `target_config` for flexible targeting
- Added `sort_order`

#### user_quest_progress
- Added `claimed_at` for reward claim tracking
- Added `times_completed` for repeatable quests
- Added `last_reset_at` for daily/weekly reset

#### quests
- Added `source_quest_id` to link personal quests to universal quests
- Added `is_universal` flag

### Planning Tables

#### calendar_events
- Changed `metadata` from TEXT to JSONB
- Added `habit_id` and `goal_id` FKs
- Added `timezone` column
- Added parent_event_id for recurring event instances

#### daily_plans
- Changed `items_json` from TEXT to JSONB (`items`)
- Kept UNIQUE(user_id, date) constraint

#### plan_templates
- Changed `items_json` from TEXT to JSONB (`items`)
- Added `use_count` for tracking

### Market Tables

#### market_items
- Added `image_url` column
- Added `uses_per_purchase` for consumables
- Added `total_stock` and `remaining_stock` for inventory

#### user_purchases
- Added `quantity` column
- Added `uses_remaining` for consumables
- Added `status` column for lifecycle tracking
- Added refund tracking columns

---

## Helper Functions Added

| Function | Purpose | Tables Affected |
|----------|---------|-----------------|
| `award_xp()` | Award XP with level-up detection | user_progress, points_ledger |
| `award_coins()` | Award coins | user_wallet, points_ledger |
| `spend_coins()` | Spend coins with balance check | user_wallet, points_ledger |
| `update_streak()` | Update streak for a type | user_streaks |
| `start_focus_session()` | Start new focus session | focus_sessions, focus_pause_state |
| `complete_focus_session()` | Complete and award rewards | focus_sessions |
| `complete_habit()` | Log habit completion | habit_logs, habits |
| `update_goal_progress()` | Recalculate goal progress | goals, goal_milestones |
| `accept_universal_quest()` | Accept a quest | user_quest_progress |
| `update_quest_progress()` | Update quest progress | user_quest_progress |
| `claim_quest_rewards()` | Claim quest rewards | user_quest_progress |
| `purchase_item()` | Purchase market item | user_purchases, user_wallet |
| `redeem_purchase()` | Redeem a purchase | user_purchases |

---

## Views Added

| View | Purpose |
|------|---------|
| `user_gamification_summary` | Aggregated user gamification stats |
| `active_focus_session` | User's current active session |
| `user_focus_stats` | Focus session statistics per user |
| `habits_today` | Habits with today's completion status |
| `goals_with_milestones` | Goals with milestone counts |
| `user_available_quests` | Available quests for user |
| `quest_completion_stats` | Quest completion statistics |
| `todays_events` | Calendar events for today |
| `this_weeks_events` | Calendar events for this week |
| `available_market_items` | Active market items |
| `user_unredeemed_purchases` | User's unredeemed purchases |
| `market_stats` | Market statistics |

---

## Remaining Tables (Not Yet Migrated)

The following tables from D1 are not yet migrated:

### Wave 3: Complex Features

| Table | D1 Location | Priority |
|-------|-------------|----------|
| exercises | 0100_master_reset.sql | 3.1 |
| workouts | 0100_master_reset.sql | 3.1 |
| workout_sections | 0100_master_reset.sql | 3.1 |
| workout_exercises | 0100_master_reset.sql | 3.1 |
| workout_sessions | 0100_master_reset.sql | 3.1 |
| exercise_sets | 0100_master_reset.sql | 3.1 |
| personal_records | 0100_master_reset.sql | 3.1 |
| training_programs | 0100_master_reset.sql | 3.3 |
| program_weeks | 0100_master_reset.sql | 3.3 |
| program_workouts | 0100_master_reset.sql | 3.3 |
| books | 0100_master_reset.sql | 3.2 |
| reading_sessions | 0100_master_reset.sql | 3.2 |

### Wave 4: Specialized Features

| Table | D1 Location | Priority |
|-------|-------------|----------|
| learn_topics | 0100_master_reset.sql | 4.1 |
| learn_lessons | 0100_master_reset.sql | 4.1 |
| learn_drills | 0100_master_reset.sql | 4.1 |
| user_lesson_progress | 0100_master_reset.sql | 4.1 |
| user_drill_stats | 0100_master_reset.sql | 4.1 |
| flashcard_decks | 0100_master_reset.sql | 4.1 |
| flashcards | 0100_master_reset.sql | 4.1 |
| reference_tracks | 0100_master_reset.sql | 4.2 |
| track_analysis_cache | 0100_master_reset.sql | 4.2 |
| user_settings | 0100_master_reset.sql | 4.3 |
| user_interests | 0100_master_reset.sql | 4.3 |
| user_ui_modules | 0100_master_reset.sql | 4.3 |
| onboarding_flows | 0100_master_reset.sql | 4.3 |
| onboarding_steps | 0100_master_reset.sql | 4.3 |
| user_onboarding_state | 0100_master_reset.sql | 4.3 |
| infobase_entries | 0100_master_reset.sql | 4.4 |
| ideas | 0100_master_reset.sql | 4.5 |
| journal_entries | 0100_master_reset.sql | 4.6 |

### System Tables

| Table | D1 Location | Notes |
|-------|-------------|-------|
| feedback | 0100_master_reset.sql | Migrate with admin |
| notifications | 0100_master_reset.sql | Migrate with admin |
| admin_audit_log | 0100_master_reset.sql | Already in 0001 as audit_log |
| access_requests | 0100_master_reset.sql | Migrate with admin |
| db_metadata | 0100_master_reset.sql | May not be needed |

### Content Tables (Static)

| Table | D1 Location | Notes |
|-------|-------------|-------|
| ignition_packs | 0100_master_reset.sql | Seed data |
| daw_shortcuts | 0100_master_reset.sql | Seed data |
| glossary_terms | 0100_master_reset.sql | Seed data |
| recipe_templates | 0100_master_reset.sql | Seed data |

---

## Data Migration Notes

### ID Mapping

D1 uses TEXT IDs (often UUIDs as strings). Postgres uses native UUID type.

**Strategy:** On migration, convert TEXT UUIDs to native UUIDs. For non-UUID TEXT IDs, generate new UUIDs and maintain a mapping table for reconciliation.

### Timestamps

D1 stores timestamps as TEXT in ISO format. Postgres uses TIMESTAMPTZ.

**Strategy:** Parse TEXT timestamps during migration. Assume UTC if no timezone.

### Booleans

D1 uses INTEGER (0/1) for booleans. Postgres uses BOOLEAN.

**Strategy:** Convert 0 → false, non-zero → true.

### JSON

D1 stores JSON as TEXT. Postgres uses JSONB.

**Strategy:** Parse and validate JSON during migration. Invalid JSON should be logged and handled.

---

## References

- [d1_usage_inventory.md](./d1_usage_inventory.md) - D1 schema inventory
- [feature_porting_playbook.md](./feature_porting_playbook.md) - Migration priorities
- [schema_exceptions.md](./schema_exceptions.md) - Optimization exceptions
- [data_migration_reconciliation_plan.md](./data_migration_reconciliation_plan.md) - Data migration

