-- ============================================================================
-- Migration: 0002_gamification_substrate (DOWN)
-- Created: January 7, 2026
-- Purpose: Rollback gamification substrate tables
-- ============================================================================

-- Drop views first
DROP VIEW IF EXISTS user_gamification_summary;

-- Drop functions
DROP FUNCTION IF EXISTS update_streak(UUID, TEXT, DATE);
DROP FUNCTION IF EXISTS spend_coins(UUID, INTEGER, TEXT);
DROP FUNCTION IF EXISTS award_coins(UUID, INTEGER, TEXT, TEXT);
DROP FUNCTION IF EXISTS award_xp(UUID, INTEGER, TEXT, TEXT);

-- Drop triggers
DROP TRIGGER IF EXISTS update_user_streaks_updated_at ON user_streaks;
DROP TRIGGER IF EXISTS update_user_wallet_updated_at ON user_wallet;
DROP TRIGGER IF EXISTS update_user_progress_updated_at ON user_progress;
DROP TRIGGER IF EXISTS update_user_skills_updated_at ON user_skills;

-- Drop tables in dependency order
DROP TABLE IF EXISTS user_streaks;
DROP TABLE IF EXISTS points_ledger;
DROP TABLE IF EXISTS user_wallet;
DROP TABLE IF EXISTS user_progress;
DROP TABLE IF EXISTS user_achievements;
DROP TABLE IF EXISTS user_skills;
DROP TABLE IF EXISTS achievement_definitions;
DROP TABLE IF EXISTS skill_definitions;

