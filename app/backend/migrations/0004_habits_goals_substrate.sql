-- ============================================================================
-- Migration: 0004_habits_goals_substrate
-- Created: January 7, 2026
-- Purpose: Habits and Goals tracking tables
--
-- This migration implements:
--   - habits: Habit definitions per user
--   - habit_logs: Habit completion logs
--   - goals: Goal definitions per user
--   - goal_milestones: Goal milestones
--
-- D1 → Postgres Changes:
--   - TEXT PRIMARY KEY → UUID with gen_random_uuid()
--   - INTEGER (boolean) → BOOLEAN
--   - TEXT timestamps → TIMESTAMPTZ
--   - Added proper indexes and constraints
--
-- References:
--   - d1_usage_inventory.md: D1 habits/goals tables
--   - feature_porting_playbook.md: Wave 1.3, 1.4
-- ============================================================================

-- ============================================================================
-- SECTION 1: HABITS
-- ============================================================================

-- Habit definitions
-- Maps 1:1 from D1 habits
CREATE TABLE habits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Habit info
    name TEXT NOT NULL,
    description TEXT,

    -- Frequency
    frequency TEXT NOT NULL DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekly', 'custom')),
    target_count INTEGER NOT NULL DEFAULT 1,
    custom_days TEXT,  -- JSON array of day numbers for custom frequency

    -- Display
    icon TEXT,
    color TEXT,

    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,

    -- Streak tracking (denormalized for performance)
    current_streak INTEGER NOT NULL DEFAULT 0,
    longest_streak INTEGER NOT NULL DEFAULT 0,
    last_completed_at TIMESTAMPTZ,

    -- Ordering
    sort_order INTEGER NOT NULL DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_habits_user ON habits(user_id);
CREATE INDEX idx_habits_user_active ON habits(user_id) WHERE is_active = true;

-- Auto-update updated_at
CREATE TRIGGER update_habits_updated_at
    BEFORE UPDATE ON habits
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SECTION 2: HABIT LOGS
-- ============================================================================

-- Habit completion logs
-- Maps 1:1 from D1 habit_logs
CREATE TABLE habit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Completion details
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_date DATE NOT NULL DEFAULT CURRENT_DATE,

    -- Optional notes
    notes TEXT,

    -- Prevent duplicate completions on same day
    UNIQUE(habit_id, completed_date)
);

-- Indexes
CREATE INDEX idx_habit_logs_habit ON habit_logs(habit_id);
CREATE INDEX idx_habit_logs_user ON habit_logs(user_id);
CREATE INDEX idx_habit_logs_date ON habit_logs(completed_date);
CREATE INDEX idx_habit_logs_user_date ON habit_logs(user_id, completed_date);

-- ============================================================================
-- SECTION 3: GOALS
-- ============================================================================

-- Goal definitions
-- Maps 1:1 from D1 goals
CREATE TABLE goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Goal info
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,

    -- Timing
    target_date DATE,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    -- Status
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned', 'paused')),
    progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),

    -- Priority
    priority INTEGER NOT NULL DEFAULT 0,

    -- Ordering
    sort_order INTEGER NOT NULL DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_goals_user ON goals(user_id);
CREATE INDEX idx_goals_user_status ON goals(user_id, status);
CREATE INDEX idx_goals_target_date ON goals(target_date) WHERE target_date IS NOT NULL;

-- Auto-update updated_at
CREATE TRIGGER update_goals_updated_at
    BEFORE UPDATE ON goals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SECTION 4: GOAL MILESTONES
-- ============================================================================

-- Goal milestones (sub-goals)
-- Maps 1:1 from D1 goal_milestones
CREATE TABLE goal_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,

    -- Milestone info
    title TEXT NOT NULL,
    description TEXT,

    -- Status
    is_completed BOOLEAN NOT NULL DEFAULT false,
    completed_at TIMESTAMPTZ,

    -- Ordering
    sort_order INTEGER NOT NULL DEFAULT 0
);

-- Indexes
CREATE INDEX idx_goal_milestones_goal ON goal_milestones(goal_id);

-- ============================================================================
-- SECTION 5: HELPER FUNCTIONS
-- ============================================================================

-- Function to log habit completion
CREATE OR REPLACE FUNCTION complete_habit(
    p_habit_id UUID,
    p_notes TEXT DEFAULT NULL
)
RETURNS TABLE(new_streak INTEGER, xp_awarded INTEGER, streak_bonus BOOLEAN) AS $$
DECLARE
    v_habit habits%ROWTYPE;
    v_last_date DATE;
    v_today DATE := CURRENT_DATE;
    v_new_streak INTEGER;
    v_xp INTEGER := 5;  -- Base XP for habit completion
    v_streak_bonus BOOLEAN := false;
BEGIN
    -- Get habit with lock
    SELECT * INTO v_habit FROM habits WHERE id = p_habit_id FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Habit not found';
    END IF;

    -- Check if already completed today
    IF EXISTS (SELECT 1 FROM habit_logs WHERE habit_id = p_habit_id AND completed_date = v_today) THEN
        -- Already completed, return current state
        RETURN QUERY SELECT v_habit.current_streak, 0, false;
        RETURN;
    END IF;

    -- Get last completion date
    SELECT completed_date INTO v_last_date
    FROM habit_logs
    WHERE habit_id = p_habit_id
    ORDER BY completed_date DESC
    LIMIT 1;

    -- Calculate new streak
    IF v_last_date IS NULL THEN
        v_new_streak := 1;
    ELSIF v_last_date = v_today - 1 THEN
        v_new_streak := v_habit.current_streak + 1;
    ELSE
        v_new_streak := 1;  -- Streak broken
    END IF;

    -- Check for streak milestones (bonus XP)
    IF v_new_streak IN (7, 14, 30, 60, 100, 365) THEN
        v_xp := v_xp + v_new_streak;  -- Bonus XP equal to streak length
        v_streak_bonus := true;
    END IF;

    -- Insert log
    INSERT INTO habit_logs (habit_id, user_id, notes)
    VALUES (p_habit_id, v_habit.user_id, p_notes);

    -- Update habit
    UPDATE habits
    SET current_streak = v_new_streak,
        longest_streak = GREATEST(longest_streak, v_new_streak),
        last_completed_at = NOW()
    WHERE id = p_habit_id;

    -- Award XP
    PERFORM award_xp(v_habit.user_id, v_xp, 'habit_complete', 'Completed habit: ' || v_habit.name);

    -- Update global streak
    PERFORM update_streak(v_habit.user_id, 'habit');

    RETURN QUERY SELECT v_new_streak, v_xp, v_streak_bonus;
END;
$$ LANGUAGE plpgsql;

-- Function to update goal progress
CREATE OR REPLACE FUNCTION update_goal_progress(
    p_goal_id UUID
)
RETURNS INTEGER AS $$
DECLARE
    v_total INTEGER;
    v_completed INTEGER;
    v_progress INTEGER;
BEGIN
    -- Count milestones
    SELECT COUNT(*), COUNT(*) FILTER (WHERE is_completed)
    INTO v_total, v_completed
    FROM goal_milestones
    WHERE goal_id = p_goal_id;

    -- Calculate progress
    IF v_total = 0 THEN
        v_progress := 0;
    ELSE
        v_progress := (v_completed * 100) / v_total;
    END IF;

    -- Update goal
    UPDATE goals
    SET progress = v_progress,
        status = CASE WHEN v_progress = 100 THEN 'completed' ELSE status END,
        completed_at = CASE WHEN v_progress = 100 THEN NOW() ELSE completed_at END
    WHERE id = p_goal_id;

    RETURN v_progress;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SECTION 6: VIEWS
-- ============================================================================

-- View: Habits with today's completion status
CREATE VIEW habits_today AS
SELECT
    h.*,
    CASE WHEN hl.id IS NOT NULL THEN true ELSE false END as completed_today
FROM habits h
LEFT JOIN habit_logs hl ON h.id = hl.habit_id AND hl.completed_date = CURRENT_DATE
WHERE h.is_active = true;

-- View: Goals with milestone counts
CREATE VIEW goals_with_milestones AS
SELECT
    g.*,
    COUNT(gm.id) as total_milestones,
    COUNT(gm.id) FILTER (WHERE gm.is_completed) as completed_milestones
FROM goals g
LEFT JOIN goal_milestones gm ON g.id = gm.goal_id
GROUP BY g.id;

