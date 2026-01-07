-- ============================================================================
-- Migration: 0005_quests_substrate
-- Created: January 7, 2026
-- Purpose: Quests system tables (user quests + universal quests)
--
-- This migration implements:
--   - quests: User-specific quest instances
--   - universal_quests: System-wide quest definitions
--   - user_quest_progress: User progress on universal quests
--
-- D1 → Postgres Changes:
--   - TEXT PRIMARY KEY → UUID with gen_random_uuid()
--   - INTEGER (boolean) → BOOLEAN
--   - TEXT timestamps → TIMESTAMPTZ
--   - Added proper indexes and constraints
--
-- Note: Both quests and universal_quests are ACTIVE (per d1_usage_inventory.md)
--
-- References:
--   - d1_usage_inventory.md: D1 quest tables
--   - feature_porting_playbook.md: Wave 2.1
-- ============================================================================

-- ============================================================================
-- SECTION 1: UNIVERSAL QUESTS (System-defined)
-- ============================================================================

-- Universal quest definitions (admin-managed)
-- Maps 1:1 from D1 universal_quests
CREATE TABLE universal_quests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Quest info
    title TEXT NOT NULL,
    description TEXT,

    -- Type and timing
    type TEXT NOT NULL DEFAULT 'daily' CHECK (type IN ('daily', 'weekly', 'monthly', 'one_time', 'repeatable')),

    -- Rewards
    xp_reward INTEGER NOT NULL DEFAULT 10,
    coin_reward INTEGER NOT NULL DEFAULT 5,

    -- Target/completion criteria
    target INTEGER NOT NULL DEFAULT 1,  -- Target count for completion
    target_type TEXT,                   -- e.g., 'focus_sessions', 'habits_completed'
    target_config JSONB,                -- Flexible target criteria

    -- Skill association (optional)
    skill_key TEXT REFERENCES skill_definitions(key) ON DELETE SET NULL,

    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,

    -- Admin tracking
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Ordering
    sort_order INTEGER NOT NULL DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_universal_quests_type ON universal_quests(type);
CREATE INDEX idx_universal_quests_active ON universal_quests(is_active) WHERE is_active = true;
CREATE INDEX idx_universal_quests_skill ON universal_quests(skill_key) WHERE skill_key IS NOT NULL;

-- Auto-update updated_at
CREATE TRIGGER update_universal_quests_updated_at
    BEFORE UPDATE ON universal_quests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SECTION 2: USER QUEST PROGRESS
-- ============================================================================

-- User progress on universal quests
-- Maps 1:1 from D1 user_quest_progress
CREATE TABLE user_quest_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    quest_id UUID NOT NULL REFERENCES universal_quests(id) ON DELETE CASCADE,

    -- Status
    status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'in_progress', 'completed', 'claimed')),

    -- Progress
    progress INTEGER NOT NULL DEFAULT 0,

    -- Timing
    accepted_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    claimed_at TIMESTAMPTZ,

    -- For repeatable quests
    last_reset_at TIMESTAMPTZ,
    times_completed INTEGER NOT NULL DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- One progress record per user per quest
    UNIQUE(user_id, quest_id)
);

-- Indexes
CREATE INDEX idx_user_quest_progress_user ON user_quest_progress(user_id);
CREATE INDEX idx_user_quest_progress_quest ON user_quest_progress(quest_id);
CREATE INDEX idx_user_quest_progress_status ON user_quest_progress(status);
CREATE INDEX idx_user_quest_progress_user_status ON user_quest_progress(user_id, status);

-- Auto-update updated_at
CREATE TRIGGER update_user_quest_progress_updated_at
    BEFORE UPDATE ON user_quest_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SECTION 3: USER QUESTS (Personal quests)
-- ============================================================================

-- User-specific quest instances (personal goals as quests)
-- Maps 1:1 from D1 quests
CREATE TABLE quests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    -- Quest info
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,

    -- Difficulty affects rewards
    difficulty TEXT NOT NULL DEFAULT 'starter' CHECK (difficulty IN ('starter', 'easy', 'medium', 'hard', 'epic')),

    -- Rewards
    xp_reward INTEGER NOT NULL DEFAULT 10,
    coin_reward INTEGER NOT NULL DEFAULT 5,

    -- Status
    status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'accepted', 'completed', 'abandoned', 'expired')),
    is_active BOOLEAN NOT NULL DEFAULT true,

    -- For universal quests that spawn user instances
    is_universal BOOLEAN NOT NULL DEFAULT false,
    source_quest_id UUID REFERENCES universal_quests(id) ON DELETE SET NULL,

    -- Timing
    accepted_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,

    -- Repeatable quest config
    is_repeatable BOOLEAN NOT NULL DEFAULT false,
    repeat_frequency TEXT CHECK (repeat_frequency IN ('daily', 'weekly', 'monthly')),
    last_completed_date DATE,
    streak_count INTEGER NOT NULL DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_quests_user ON quests(user_id);
CREATE INDEX idx_quests_status ON quests(status);
CREATE INDEX idx_quests_user_status ON quests(user_id, status);
CREATE INDEX idx_quests_universal ON quests(is_universal) WHERE is_universal = true;
CREATE INDEX idx_quests_expires ON quests(expires_at) WHERE expires_at IS NOT NULL;

-- Auto-update updated_at
CREATE TRIGGER update_quests_updated_at
    BEFORE UPDATE ON quests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SECTION 4: HELPER FUNCTIONS
-- ============================================================================

-- Function to accept a universal quest
CREATE OR REPLACE FUNCTION accept_universal_quest(
    p_user_id UUID,
    p_quest_id UUID
)
RETURNS UUID AS $$
DECLARE
    v_progress_id UUID;
BEGIN
    -- Upsert progress record
    INSERT INTO user_quest_progress (user_id, quest_id, status, accepted_at)
    VALUES (p_user_id, p_quest_id, 'in_progress', NOW())
    ON CONFLICT (user_id, quest_id) DO UPDATE
    SET status = 'in_progress',
        accepted_at = COALESCE(user_quest_progress.accepted_at, NOW())
    RETURNING id INTO v_progress_id;

    RETURN v_progress_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update quest progress
CREATE OR REPLACE FUNCTION update_quest_progress(
    p_user_id UUID,
    p_quest_id UUID,
    p_increment INTEGER DEFAULT 1
)
RETURNS TABLE(new_progress INTEGER, is_complete BOOLEAN) AS $$
DECLARE
    v_progress user_quest_progress%ROWTYPE;
    v_quest universal_quests%ROWTYPE;
    v_new_progress INTEGER;
    v_is_complete BOOLEAN := false;
BEGIN
    -- Get quest definition
    SELECT * INTO v_quest FROM universal_quests WHERE id = p_quest_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Quest not found';
    END IF;

    -- Get or create progress
    INSERT INTO user_quest_progress (user_id, quest_id, status)
    VALUES (p_user_id, p_quest_id, 'in_progress')
    ON CONFLICT (user_id, quest_id) DO NOTHING;

    SELECT * INTO v_progress
    FROM user_quest_progress
    WHERE user_id = p_user_id AND quest_id = p_quest_id
    FOR UPDATE;

    -- Skip if already completed
    IF v_progress.status IN ('completed', 'claimed') THEN
        RETURN QUERY SELECT v_progress.progress, true;
        RETURN;
    END IF;

    -- Update progress
    v_new_progress := LEAST(v_progress.progress + p_increment, v_quest.target);

    -- Check completion
    IF v_new_progress >= v_quest.target THEN
        v_is_complete := true;

        UPDATE user_quest_progress
        SET progress = v_new_progress,
            status = 'completed',
            completed_at = NOW()
        WHERE id = v_progress.id;
    ELSE
        UPDATE user_quest_progress
        SET progress = v_new_progress
        WHERE id = v_progress.id;
    END IF;

    RETURN QUERY SELECT v_new_progress, v_is_complete;
END;
$$ LANGUAGE plpgsql;

-- Function to claim quest rewards
CREATE OR REPLACE FUNCTION claim_quest_rewards(
    p_user_id UUID,
    p_quest_id UUID
)
RETURNS TABLE(xp_earned INTEGER, coins_earned INTEGER) AS $$
DECLARE
    v_progress user_quest_progress%ROWTYPE;
    v_quest universal_quests%ROWTYPE;
BEGIN
    -- Get progress with lock
    SELECT * INTO v_progress
    FROM user_quest_progress
    WHERE user_id = p_user_id AND quest_id = p_quest_id
    FOR UPDATE;

    IF NOT FOUND OR v_progress.status != 'completed' THEN
        RAISE EXCEPTION 'Quest not completed or not found';
    END IF;

    -- Get quest
    SELECT * INTO v_quest FROM universal_quests WHERE id = p_quest_id;

    -- Mark as claimed
    UPDATE user_quest_progress
    SET status = 'claimed',
        claimed_at = NOW(),
        times_completed = times_completed + 1
    WHERE id = v_progress.id;

    -- Award rewards
    PERFORM award_xp(p_user_id, v_quest.xp_reward, 'quest_complete', 'Completed quest: ' || v_quest.title);
    PERFORM award_coins(p_user_id, v_quest.coin_reward, 'quest_complete', 'Completed quest: ' || v_quest.title);

    -- Award skill stars if applicable
    IF v_quest.skill_key IS NOT NULL THEN
        UPDATE user_skills
        SET current_stars = current_stars + 1
        WHERE user_id = p_user_id AND skill_key = v_quest.skill_key;
    END IF;

    RETURN QUERY SELECT v_quest.xp_reward, v_quest.coin_reward;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SECTION 5: VIEWS
-- ============================================================================

-- View: Available quests for user
CREATE VIEW user_available_quests AS
SELECT
    uq.*,
    COALESCE(uqp.status, 'available') as user_status,
    COALESCE(uqp.progress, 0) as user_progress,
    uqp.accepted_at,
    uqp.completed_at
FROM universal_quests uq
LEFT JOIN user_quest_progress uqp ON uq.id = uqp.quest_id
WHERE uq.is_active = true;

-- View: Quest completion stats
CREATE VIEW quest_completion_stats AS
SELECT
    uq.id as quest_id,
    uq.title,
    uq.type,
    COUNT(uqp.id) FILTER (WHERE uqp.status = 'completed') as completions,
    COUNT(uqp.id) FILTER (WHERE uqp.status = 'claimed') as claims,
    COUNT(DISTINCT uqp.user_id) as unique_users
FROM universal_quests uq
LEFT JOIN user_quest_progress uqp ON uq.id = uqp.quest_id
GROUP BY uq.id, uq.title, uq.type;

