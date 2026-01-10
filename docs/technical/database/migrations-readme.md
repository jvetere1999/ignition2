# Migrations

This folder contains the database migrations for Ignition.

## Current Schema

**`0100_master_reset.sql`** - The single, consolidated master migration containing:
- Complete database schema (all tables, indexes, foreign keys)
- Seed data for:
  - Skill definitions
  - Achievement definitions
  - Market items
  - Learn topics, lessons, and drills
  - Universal quests
  - Ignition packs
  - DAW shortcuts
  - Glossary terms

## Usage

### Fresh Deployment
```bash
wrangler d1 execute passion_os --remote --file=migrations/0100_master_reset.sql
```

### Local Development
```bash
wrangler d1 execute passion_os --local --file=migrations/0100_master_reset.sql
```

## Deprecated Migrations

All previous migrations have been consolidated into `0100_master_reset.sql` and moved to `deprecated/`. These are kept for historical reference only and should NOT be run on production.

Deprecated files:
- 0001-0014: Original incremental migrations
- 0019-0027: Reset and cleanup migrations
- 0101-0102: Post-reset additions

## Schema Version

The current schema version is tracked in the `db_metadata` table:
- `db_version`: 100
- `db_version_name`: 0100_master_reset_consolidated

## Making Schema Changes

1. **DO NOT** modify `0100_master_reset.sql` for incremental changes
2. Create a new migration file (e.g., `0103_add_feature.sql`)
3. Apply to production with `wrangler d1 execute`
4. Update `db_metadata` version in the new migration
5. Once stable, consolidate into `0100_master_reset.sql` for fresh deployments

## Key Tables

| Category | Tables |
|----------|--------|
| Auth | users, accounts, sessions, verification_tokens, authenticators |
| Gamification | skill_definitions, user_skills, user_wallet, user_achievements, user_streaks, points_ledger, activity_events |
| Focus | focus_sessions, focus_pause_state |
| Quests | quests, universal_quests, user_quest_progress |
| Market | market_items, user_purchases |
| Habits | habits, habit_logs |
| Goals | goals, goal_milestones |
| Exercise | exercises, workouts, workout_sessions, exercise_sets |
| Books | books, reading_sessions |
| Learn | learn_topics, learn_lessons, learn_drills, flashcards |
| Planning | calendar_events, daily_plans, plan_templates |
| Content | ignition_packs, infobase_entries, ideas |
| Reference | reference_tracks, track_analysis_cache |

