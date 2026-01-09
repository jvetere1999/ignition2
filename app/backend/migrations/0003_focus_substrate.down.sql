-- ============================================================================
-- Migration: 0003_focus_substrate (DOWN)
-- Created: January 7, 2026
-- Purpose: Rollback focus substrate tables
-- ============================================================================

-- Drop views
DROP VIEW IF EXISTS user_focus_stats;
DROP VIEW IF EXISTS active_focus_session;

-- Drop functions
DROP FUNCTION IF EXISTS complete_focus_session(UUID);
DROP FUNCTION IF EXISTS start_focus_session(UUID, TEXT, INTEGER, UUID, TEXT);

-- Drop triggers
DROP TRIGGER IF EXISTS update_focus_pause_state_updated_at ON focus_pause_state;

-- Drop tables
DROP TABLE IF EXISTS focus_pause_state;
DROP TABLE IF EXISTS focus_sessions;

