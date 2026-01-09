-- ============================================================================
-- Migration: 0002_gamification_substrate
-- Created: January 7, 2026
-- Purpose: Gamification system tables (XP, wallet, achievements, skills, streaks)
--
-- This migration implements:
--   - user_progress: XP/level tracking (consolidated wallet)
--   - user_wallet: Coins balance (separate from XP for clarity)
--   - points_ledger: Transaction history for auditing
--   - skill_definitions: Skill catalog
--   - user_skills: User skill progress
--   - achievement_definitions: Achievement catalog
--   - user_achievements: User earned achievements
--   - user_streaks: Streak tracking by type
--
-- D1 → Postgres Changes:
--   - TEXT PRIMARY KEY → UUID with gen_random_uuid()
--   - INTEGER (boolean) → BOOLEAN
--   - TEXT timestamps → TIMESTAMPTZ
--   - datetime('now') → NOW()
--   - Added proper foreign keys and indexes
--
-- References:
--   - d1_usage_inventory.md: D1 gamification tables
--   - feature_porting_playbook.md: Wave 1.1
--   - schema_exceptions.md: No optimizations (1:1 translation)
-- ============================================================================

-- ============================================================================
-- SECTION 1: SKILL DEFINITIONS
-- ============================================================================

-- Skill catalog (admin-managed definitions)
-- Maps 1:1 from D1 skill_definitions
CREATE TABLE skill_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Unique key for referencing
    key TEXT NOT NULL UNIQUE,

    -- Display info
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    icon TEXT,

    -- Progression config
    max_level INTEGER NOT NULL DEFAULT 10,
    stars_per_level INTEGER NOT NULL DEFAULT 10,

    -- Ordering
    sort_order INTEGER NOT NULL DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for category filtering
CREATE INDEX idx_skill_definitions_category ON skill_definitions(category);
CREATE INDEX idx_skill_definitions_sort ON skill_definitions(sort_order);

-- ============================================================================
-- SECTION 2: USER SKILLS
-- ============================================================================

-- User skill progress
-- Maps 1:1 from D1 user_skills
CREATE TABLE user_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_key TEXT NOT NULL REFERENCES skill_definitions(key) ON DELETE CASCADE,

    -- Progress
    current_stars INTEGER NOT NULL DEFAULT 0,
    current_level INTEGER NOT NULL DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- One record per user per skill
    UNIQUE(user_id, skill_key)
);

-- Indexes
CREATE INDEX idx_user_skills_user ON user_skills(user_id);
CREATE INDEX idx_user_skills_skill ON user_skills(skill_key);

-- Auto-update updated_at
CREATE TRIGGER update_user_skills_updated_at
    BEFORE UPDATE ON user_skills
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SECTION 3: ACHIEVEMENT DEFINITIONS
-- ============================================================================

-- Achievement catalog (admin-managed definitions)
-- Maps 1:1 from D1 achievement_definitions
CREATE TABLE achievement_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Unique key for referencing
    key TEXT NOT NULL UNIQUE,

    -- Display info
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    icon TEXT,

    -- Trigger config
    trigger_type TEXT NOT NULL,  -- e.g., 'streak', 'count', 'milestone'
    trigger_config JSONB,        -- Flexible trigger conditions

    -- Rewards
    reward_coins INTEGER NOT NULL DEFAULT 0,
    reward_xp INTEGER NOT NULL DEFAULT 0,

    -- Display options
    is_hidden BOOLEAN NOT NULL DEFAULT false,
    sort_order INTEGER NOT NULL DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_achievement_definitions_category ON achievement_definitions(category);
CREATE INDEX idx_achievement_definitions_trigger ON achievement_definitions(trigger_type);
CREATE INDEX idx_achievement_definitions_sort ON achievement_definitions(sort_order);

-- ============================================================================
-- SECTION 4: USER ACHIEVEMENTS
-- ============================================================================

-- User earned achievements
-- Maps 1:1 from D1 user_achievements
CREATE TABLE user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_key TEXT NOT NULL REFERENCES achievement_definitions(key) ON DELETE CASCADE,

    -- When earned
    earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Notification tracking
    notified BOOLEAN NOT NULL DEFAULT false,

    -- One achievement per user
    UNIQUE(user_id, achievement_key)
);

-- Indexes
CREATE INDEX idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX idx_user_achievements_key ON user_achievements(achievement_key);
CREATE INDEX idx_user_achievements_unnotified ON user_achievements(user_id) WHERE notified = false;

-- ============================================================================
-- SECTION 5: USER PROGRESS (XP/Level Tracking)
-- ============================================================================

-- User progress - consolidated XP and level tracking
-- Maps from D1 user_progress (note: user_wallet exists separately for coins)
CREATE TABLE user_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,

    -- XP and leveling
    total_xp BIGINT NOT NULL DEFAULT 0,
    current_level INTEGER NOT NULL DEFAULT 1,
    xp_to_next_level INTEGER NOT NULL DEFAULT 100,

    -- Total skill stars (aggregate)
    total_skill_stars INTEGER NOT NULL DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index (user_id is unique, so primary lookup is fast)
CREATE INDEX idx_user_progress_level ON user_progress(current_level);

-- Auto-update updated_at
CREATE TRIGGER update_user_progress_updated_at
    BEFORE UPDATE ON user_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SECTION 6: USER WALLET (Coins Balance)
-- ============================================================================

-- User wallet - coins balance
-- Maps from D1 user_wallet (separated from user_progress for clarity)
CREATE TABLE user_wallet (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,

    -- Coins balance
    coins BIGINT NOT NULL DEFAULT 0,

    -- Lifetime totals (for stats)
    total_earned BIGINT NOT NULL DEFAULT 0,
    total_spent BIGINT NOT NULL DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at
CREATE TRIGGER update_user_wallet_updated_at
    BEFORE UPDATE ON user_wallet
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SECTION 7: POINTS LEDGER (Transaction History)
-- ============================================================================

-- Points ledger - all XP/coin transactions for auditing
-- Maps 1:1 from D1 points_ledger with enhancements
CREATE TABLE points_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Event source
    event_type TEXT NOT NULL,  -- e.g., 'focus_complete', 'purchase', 'achievement'
    event_id UUID,             -- Optional reference to source event

    -- Transaction amounts
    coins INTEGER NOT NULL DEFAULT 0,
    xp INTEGER NOT NULL DEFAULT 0,
    skill_stars INTEGER NOT NULL DEFAULT 0,
    skill_key TEXT REFERENCES skill_definitions(key) ON DELETE SET NULL,

    -- Description
    reason TEXT,

    -- Idempotency for safe retries
    idempotency_key TEXT UNIQUE,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for ledger queries
CREATE INDEX idx_points_ledger_user ON points_ledger(user_id);
CREATE INDEX idx_points_ledger_type ON points_ledger(event_type);
CREATE INDEX idx_points_ledger_created ON points_ledger(created_at);
CREATE INDEX idx_points_ledger_user_time ON points_ledger(user_id, created_at DESC);

-- ============================================================================
-- SECTION 8: USER STREAKS
-- ============================================================================

-- User streaks by type
-- Maps 1:1 from D1 user_streaks
CREATE TABLE user_streaks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Streak type (e.g., 'daily_login', 'focus', 'habit')
    streak_type TEXT NOT NULL,

    -- Streak counts
    current_streak INTEGER NOT NULL DEFAULT 0,
    longest_streak INTEGER NOT NULL DEFAULT 0,

    -- Last activity for streak calculation
    last_activity_date DATE,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- One streak per type per user
    UNIQUE(user_id, streak_type)
);

-- Indexes
CREATE INDEX idx_user_streaks_user ON user_streaks(user_id);
CREATE INDEX idx_user_streaks_type ON user_streaks(streak_type);

-- Auto-update updated_at
CREATE TRIGGER update_user_streaks_updated_at
    BEFORE UPDATE ON user_streaks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SECTION 9: HELPER FUNCTIONS
-- ============================================================================

-- Function to award XP and handle level-up
CREATE OR REPLACE FUNCTION award_xp(
    p_user_id UUID,
    p_xp INTEGER,
    p_event_type TEXT DEFAULT 'manual',
    p_reason TEXT DEFAULT NULL
)
RETURNS TABLE(new_xp BIGINT, new_level INTEGER, leveled_up BOOLEAN) AS $$
DECLARE
    v_progress user_progress%ROWTYPE;
    v_new_xp BIGINT;
    v_new_level INTEGER;
    v_leveled_up BOOLEAN := false;
    v_xp_for_level INTEGER;
BEGIN
    -- Ensure user_progress exists
    INSERT INTO user_progress (user_id)
    VALUES (p_user_id)
    ON CONFLICT (user_id) DO NOTHING;

    -- Get current progress
    SELECT * INTO v_progress FROM user_progress WHERE user_id = p_user_id FOR UPDATE;

    -- Calculate new XP
    v_new_xp := v_progress.total_xp + p_xp;
    v_new_level := v_progress.current_level;

    -- Check for level-up (simple formula: 100 * level^1.5)
    LOOP
        v_xp_for_level := FLOOR(100 * POWER(v_new_level, 1.5))::INTEGER;
        EXIT WHEN v_new_xp < v_xp_for_level;
        v_new_xp := v_new_xp - v_xp_for_level;
        v_new_level := v_new_level + 1;
        v_leveled_up := true;
    END LOOP;

    -- Update progress
    UPDATE user_progress
    SET total_xp = v_new_xp + v_xp_for_level - v_progress.xp_to_next_level,
        current_level = v_new_level,
        xp_to_next_level = FLOOR(100 * POWER(v_new_level, 1.5))::INTEGER
    WHERE user_id = p_user_id;

    -- Record in ledger
    INSERT INTO points_ledger (user_id, event_type, xp, reason)
    VALUES (p_user_id, p_event_type, p_xp, p_reason);

    RETURN QUERY SELECT v_new_xp, v_new_level, v_leveled_up;
END;
$$ LANGUAGE plpgsql;

-- Function to award coins
CREATE OR REPLACE FUNCTION award_coins(
    p_user_id UUID,
    p_coins INTEGER,
    p_event_type TEXT DEFAULT 'manual',
    p_reason TEXT DEFAULT NULL
)
RETURNS BIGINT AS $$
DECLARE
    v_new_balance BIGINT;
BEGIN
    -- Ensure user_wallet exists
    INSERT INTO user_wallet (user_id)
    VALUES (p_user_id)
    ON CONFLICT (user_id) DO NOTHING;

    -- Update wallet
    UPDATE user_wallet
    SET coins = coins + p_coins,
        total_earned = CASE WHEN p_coins > 0 THEN total_earned + p_coins ELSE total_earned END
    WHERE user_id = p_user_id
    RETURNING coins INTO v_new_balance;

    -- Record in ledger
    INSERT INTO points_ledger (user_id, event_type, coins, reason)
    VALUES (p_user_id, p_event_type, p_coins, p_reason);

    RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql;

-- Function to spend coins (with balance check)
CREATE OR REPLACE FUNCTION spend_coins(
    p_user_id UUID,
    p_amount INTEGER,
    p_reason TEXT DEFAULT 'purchase'
)
RETURNS BOOLEAN AS $$
DECLARE
    v_current_balance BIGINT;
BEGIN
    -- Get current balance with lock
    SELECT coins INTO v_current_balance
    FROM user_wallet
    WHERE user_id = p_user_id
    FOR UPDATE;

    -- Check sufficient balance
    IF v_current_balance IS NULL OR v_current_balance < p_amount THEN
        RETURN false;
    END IF;

    -- Deduct coins
    UPDATE user_wallet
    SET coins = coins - p_amount,
        total_spent = total_spent + p_amount
    WHERE user_id = p_user_id;

    -- Record in ledger (negative amount)
    INSERT INTO points_ledger (user_id, event_type, coins, reason)
    VALUES (p_user_id, 'spend', -p_amount, p_reason);

    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Function to update streak
CREATE OR REPLACE FUNCTION update_streak(
    p_user_id UUID,
    p_streak_type TEXT,
    p_activity_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(current_streak INTEGER, is_new_day BOOLEAN) AS $$
DECLARE
    v_streak user_streaks%ROWTYPE;
    v_new_streak INTEGER;
    v_is_new_day BOOLEAN := false;
BEGIN
    -- Ensure streak record exists
    INSERT INTO user_streaks (user_id, streak_type)
    VALUES (p_user_id, p_streak_type)
    ON CONFLICT (user_id, streak_type) DO NOTHING;

    -- Get current streak with lock
    SELECT * INTO v_streak
    FROM user_streaks
    WHERE user_id = p_user_id AND streak_type = p_streak_type
    FOR UPDATE;

    -- Calculate new streak
    IF v_streak.last_activity_date IS NULL THEN
        -- First activity
        v_new_streak := 1;
        v_is_new_day := true;
    ELSIF v_streak.last_activity_date = p_activity_date THEN
        -- Same day, no change
        v_new_streak := v_streak.current_streak;
    ELSIF v_streak.last_activity_date = p_activity_date - 1 THEN
        -- Consecutive day, increment
        v_new_streak := v_streak.current_streak + 1;
        v_is_new_day := true;
    ELSE
        -- Streak broken, reset
        v_new_streak := 1;
        v_is_new_day := true;
    END IF;

    -- Update streak
    UPDATE user_streaks
    SET current_streak = v_new_streak,
        longest_streak = GREATEST(longest_streak, v_new_streak),
        last_activity_date = p_activity_date
    WHERE user_id = p_user_id AND streak_type = p_streak_type;

    RETURN QUERY SELECT v_new_streak, v_is_new_day;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SECTION 10: VIEWS
-- ============================================================================

-- View: User gamification summary
CREATE VIEW user_gamification_summary AS
SELECT
    u.id as user_id,
    u.name,
    COALESCE(p.total_xp, 0) as total_xp,
    COALESCE(p.current_level, 1) as current_level,
    COALESCE(p.xp_to_next_level, 100) as xp_to_next_level,
    COALESCE(w.coins, 0) as coins,
    COALESCE(p.total_skill_stars, 0) as total_skill_stars,
    (SELECT COUNT(*) FROM user_achievements ua WHERE ua.user_id = u.id) as achievement_count,
    (SELECT COALESCE(MAX(current_streak), 0) FROM user_streaks us WHERE us.user_id = u.id) as max_current_streak
FROM users u
LEFT JOIN user_progress p ON u.id = p.user_id
LEFT JOIN user_wallet w ON u.id = w.user_id;

