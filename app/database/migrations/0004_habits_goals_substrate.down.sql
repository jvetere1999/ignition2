-- ============================================================================
-- Migration: 0004_habits_goals_substrate (DOWN)
-- Created: January 7, 2026
-- Purpose: Rollback habits and goals substrate tables
-- ============================================================================

-- Drop views
DROP VIEW IF EXISTS goals_with_milestones;
DROP VIEW IF EXISTS habits_today;

-- Drop functions
DROP FUNCTION IF EXISTS update_goal_progress(UUID);
DROP FUNCTION IF EXISTS complete_habit(UUID, TEXT);

-- Drop triggers
DROP TRIGGER IF EXISTS update_goals_updated_at ON goals;
DROP TRIGGER IF EXISTS update_habits_updated_at ON habits;

-- Drop tables
DROP TABLE IF EXISTS goal_milestones;
DROP TABLE IF EXISTS goals;
DROP TABLE IF EXISTS habit_logs;
DROP TABLE IF EXISTS habits;

