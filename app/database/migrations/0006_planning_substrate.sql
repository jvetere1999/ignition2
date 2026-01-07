-- ============================================================================
-- Migration: 0006_planning_substrate
-- Created: January 7, 2026
-- Purpose: Planning tables (Calendar, Daily Plans)
--
-- This migration implements:
--   - calendar_events: Calendar event records
--   - daily_plans: Daily planning data
--   - plan_templates: Reusable plan templates
--
-- D1 → Postgres Changes:
--   - TEXT PRIMARY KEY → UUID with gen_random_uuid()
--   - TEXT timestamps → TIMESTAMPTZ
--   - JSON columns → JSONB for better indexing
--   - Added proper indexes and constraints
--
-- References:
--   - d1_usage_inventory.md: D1 planning tables
--   - feature_porting_playbook.md: Wave 2.2, 2.3
-- ============================================================================

-- ============================================================================
-- SECTION 1: CALENDAR EVENTS
-- ============================================================================

-- Calendar event records
-- Maps 1:1 from D1 calendar_events
CREATE TABLE calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Event info
    title TEXT NOT NULL,
    description TEXT,

    -- Event type
    event_type TEXT NOT NULL DEFAULT 'general' CHECK (event_type IN (
        'general', 'focus', 'workout', 'habit', 'goal', 'reminder', 'meeting'
    )),

    -- Timing
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    all_day BOOLEAN NOT NULL DEFAULT false,
    timezone TEXT,

    -- Location
    location TEXT,

    -- Related entities
    workout_id UUID,  -- Will be FK when workout tables are created
    habit_id UUID,
    goal_id UUID,

    -- Recurrence (iCal RRULE format)
    recurrence_rule TEXT,
    recurrence_end TIMESTAMPTZ,
    parent_event_id UUID REFERENCES calendar_events(id) ON DELETE CASCADE,

    -- Display
    color TEXT,

    -- Reminders (minutes before)
    reminder_minutes INTEGER,

    -- Metadata
    metadata JSONB,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_calendar_events_user ON calendar_events(user_id);
CREATE INDEX idx_calendar_events_start ON calendar_events(start_time);
CREATE INDEX idx_calendar_events_user_range ON calendar_events(user_id, start_time, end_time);
CREATE INDEX idx_calendar_events_type ON calendar_events(event_type);
CREATE INDEX idx_calendar_events_parent ON calendar_events(parent_event_id) WHERE parent_event_id IS NOT NULL;

-- Auto-update updated_at
CREATE TRIGGER update_calendar_events_updated_at
    BEFORE UPDATE ON calendar_events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SECTION 2: DAILY PLANS
-- ============================================================================

-- Daily planning records
-- Maps 1:1 from D1 daily_plans
CREATE TABLE daily_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Date (one plan per day per user)
    date DATE NOT NULL,

    -- Plan items (structured as JSON array)
    items JSONB NOT NULL DEFAULT '[]'::JSONB,

    -- Notes
    notes TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- One plan per user per day
    UNIQUE(user_id, date)
);

-- Indexes
CREATE INDEX idx_daily_plans_user ON daily_plans(user_id);
CREATE INDEX idx_daily_plans_date ON daily_plans(date);
CREATE INDEX idx_daily_plans_user_date ON daily_plans(user_id, date);

-- Auto-update updated_at
CREATE TRIGGER update_daily_plans_updated_at
    BEFORE UPDATE ON daily_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SECTION 3: PLAN TEMPLATES
-- ============================================================================

-- Reusable plan templates
-- Maps 1:1 from D1 plan_templates
CREATE TABLE plan_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    -- Template info
    name TEXT NOT NULL,
    description TEXT,

    -- Template items
    items JSONB NOT NULL DEFAULT '[]'::JSONB,

    -- Sharing
    is_public BOOLEAN NOT NULL DEFAULT false,

    -- Categorization
    category TEXT,

    -- Usage tracking
    use_count INTEGER NOT NULL DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_plan_templates_user ON plan_templates(user_id);
CREATE INDEX idx_plan_templates_public ON plan_templates(is_public) WHERE is_public = true;
CREATE INDEX idx_plan_templates_category ON plan_templates(category) WHERE category IS NOT NULL;

-- Auto-update updated_at
CREATE TRIGGER update_plan_templates_updated_at
    BEFORE UPDATE ON plan_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SECTION 4: VIEWS
-- ============================================================================

-- View: Events for today
CREATE VIEW todays_events AS
SELECT *
FROM calendar_events
WHERE DATE(start_time) = CURRENT_DATE
ORDER BY start_time;

-- View: This week's events
CREATE VIEW this_weeks_events AS
SELECT *
FROM calendar_events
WHERE start_time >= DATE_TRUNC('week', CURRENT_DATE)
  AND start_time < DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '7 days'
ORDER BY start_time;

