-- ============================================================================
-- Migration: 0005_quests_substrate (DOWN)
-- Created: January 7, 2026
-- Purpose: Rollback quests substrate tables
-- ============================================================================

-- Drop views
DROP VIEW IF EXISTS quest_completion_stats;
DROP VIEW IF EXISTS user_available_quests;

-- Drop functions
DROP FUNCTION IF EXISTS claim_quest_rewards(UUID, UUID);
DROP FUNCTION IF EXISTS update_quest_progress(UUID, UUID, INTEGER);
DROP FUNCTION IF EXISTS accept_universal_quest(UUID, UUID);

-- Drop triggers
DROP TRIGGER IF EXISTS update_quests_updated_at ON quests;
DROP TRIGGER IF EXISTS update_user_quest_progress_updated_at ON user_quest_progress;
DROP TRIGGER IF EXISTS update_universal_quests_updated_at ON universal_quests;

-- Drop tables
DROP TABLE IF EXISTS quests;
DROP TABLE IF EXISTS user_quest_progress;
DROP TABLE IF EXISTS universal_quests;

