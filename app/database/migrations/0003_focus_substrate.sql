-- ============================================================================
-- Migration: 0003_focus_substrate
-- Created: January 7, 2026
-- Purpose: Focus session tracking tables
--
-- This migration implements:
--   - focus_sessions: Focus/break/long_break session records
--   - focus_pause_state: Current pause state for resumable sessions
--
-- D1 → Postgres Changes:
--   - TEXT PRIMARY KEY → UUID with gen_random_uuid()
--   - TEXT timestamps → TIMESTAMPTZ
--   - INTEGER duration → INTEGER (seconds)
--   - Added proper indexes and constraints
--
-- References:
--   - d1_usage_inventory.md: D1 focus tables
--   - feature_porting_playbook.md: Wave 1.2
-- ============================================================================

-- ============================================================================
-- SECTION 1: FOCUS SESSIONS
-- ============================================================================

-- Focus session records
-- Maps 1:1 from D1 focus_sessions
CREATE TABLE focus_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Session type
    mode TEXT NOT NULL DEFAULT 'focus' CHECK (mode IN ('focus', 'break', 'long_break')),

    -- Duration (in seconds)
    duration_seconds INTEGER NOT NULL,

    -- Timing
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    abandoned_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,

    -- Pause state
    paused_at TIMESTAMPTZ,
    paused_remaining_seconds INTEGER,

    -- Status
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'abandoned', 'expired')),

    -- Rewards (populated on completion)
    xp_awarded INTEGER NOT NULL DEFAULT 0,
    coins_awarded INTEGER NOT NULL DEFAULT 0,

    -- Optional task reference
    task_id UUID,
    task_title TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for session queries
CREATE INDEX idx_focus_sessions_user ON focus_sessions(user_id);
CREATE INDEX idx_focus_sessions_status ON focus_sessions(status);
CREATE INDEX idx_focus_sessions_user_status ON focus_sessions(user_id, status);
CREATE INDEX idx_focus_sessions_started ON focus_sessions(started_at);
CREATE INDEX idx_focus_sessions_user_time ON focus_sessions(user_id, started_at DESC);

-- Partial index for active sessions
CREATE INDEX idx_focus_sessions_active ON focus_sessions(user_id) WHERE status = 'active';

-- ============================================================================
-- SECTION 2: FOCUS PAUSE STATE
-- ============================================================================

-- Pause state for resumable sessions
-- Maps 1:1 from D1 focus_pause_state
-- Note: This could be merged into focus_sessions, but kept separate for D1 parity
CREATE TABLE focus_pause_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,

    -- Reference to paused session
    session_id UUID REFERENCES focus_sessions(id) ON DELETE CASCADE,

    -- Pause details
    mode TEXT NOT NULL DEFAULT 'focus' CHECK (mode IN ('focus', 'break', 'long_break')),
    time_remaining_seconds INTEGER NOT NULL DEFAULT 0,
    paused_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for user lookup
CREATE INDEX idx_focus_pause_user ON focus_pause_state(user_id);

-- Auto-update updated_at
CREATE TRIGGER update_focus_pause_state_updated_at
    BEFORE UPDATE ON focus_pause_state
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SECTION 3: HELPER FUNCTIONS
-- ============================================================================

-- Function to start a focus session
CREATE OR REPLACE FUNCTION start_focus_session(
    p_user_id UUID,
    p_mode TEXT DEFAULT 'focus',
    p_duration_seconds INTEGER DEFAULT 1500,  -- 25 minutes default
    p_task_id UUID DEFAULT NULL,
    p_task_title TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_session_id UUID;
BEGIN
    -- Cancel any existing active session
    UPDATE focus_sessions
    SET status = 'abandoned',
        abandoned_at = NOW()
    WHERE user_id = p_user_id AND status IN ('active', 'paused');

    -- Clear pause state
    DELETE FROM focus_pause_state WHERE user_id = p_user_id;

    -- Create new session
    INSERT INTO focus_sessions (
        user_id, mode, duration_seconds,
        expires_at, task_id, task_title
    )
    VALUES (
        p_user_id, p_mode, p_duration_seconds,
        NOW() + (p_duration_seconds || ' seconds')::INTERVAL,
        p_task_id, p_task_title
    )
    RETURNING id INTO v_session_id;

    RETURN v_session_id;
END;
$$ LANGUAGE plpgsql;

-- Function to complete a focus session
CREATE OR REPLACE FUNCTION complete_focus_session(
    p_session_id UUID
)
RETURNS TABLE(xp_awarded INTEGER, coins_awarded INTEGER, leveled_up BOOLEAN) AS $$
DECLARE
    v_session focus_sessions%ROWTYPE;
    v_xp INTEGER;
    v_coins INTEGER;
    v_level_result RECORD;
BEGIN
    -- Get session with lock
    SELECT * INTO v_session
    FROM focus_sessions
    WHERE id = p_session_id
    FOR UPDATE;

    -- Validate session can be completed
    IF v_session.status NOT IN ('active', 'paused') THEN
        RAISE EXCEPTION 'Session cannot be completed (status: %)', v_session.status;
    END IF;

    -- Calculate rewards based on mode and duration
    CASE v_session.mode
        WHEN 'focus' THEN
            v_xp := GREATEST(5, v_session.duration_seconds / 60);  -- 1 XP per minute, min 5
            v_coins := GREATEST(2, v_session.duration_seconds / 300);  -- 1 coin per 5 minutes, min 2
        WHEN 'break' THEN
            v_xp := 2;
            v_coins := 0;
        WHEN 'long_break' THEN
            v_xp := 3;
            v_coins := 1;
        ELSE
            v_xp := 0;
            v_coins := 0;
    END CASE;

    -- Update session
    UPDATE focus_sessions
    SET status = 'completed',
        completed_at = NOW(),
        xp_awarded = v_xp,
        coins_awarded = v_coins
    WHERE id = p_session_id;

    -- Clear pause state
    DELETE FROM focus_pause_state WHERE user_id = v_session.user_id;

    -- Award XP and coins
    SELECT * INTO v_level_result FROM award_xp(v_session.user_id, v_xp, 'focus_complete', 'Focus session completed');
    PERFORM award_coins(v_session.user_id, v_coins, 'focus_complete', 'Focus session completed');

    -- Update streak
    PERFORM update_streak(v_session.user_id, 'focus');

    RETURN QUERY SELECT v_xp, v_coins, v_level_result.leveled_up;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SECTION 4: VIEWS
-- ============================================================================

-- View: User's active focus session
CREATE VIEW active_focus_session AS
SELECT
    fs.*,
    GREATEST(0, EXTRACT(EPOCH FROM (fs.expires_at - NOW()))::INTEGER) as time_remaining_seconds
FROM focus_sessions fs
WHERE fs.status = 'active';

-- View: Focus session stats per user
CREATE VIEW user_focus_stats AS
SELECT
    user_id,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_sessions,
    COUNT(*) FILTER (WHERE status = 'abandoned') as abandoned_sessions,
    SUM(duration_seconds) FILTER (WHERE status = 'completed') as total_focus_seconds,
    SUM(xp_awarded) as total_xp_earned,
    SUM(coins_awarded) as total_coins_earned,
    MAX(completed_at) as last_session_at
FROM focus_sessions
GROUP BY user_id;

