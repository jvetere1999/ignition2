-- ============================================================================
-- Migration: 0006_planning_substrate (DOWN)
-- Created: January 7, 2026
-- Purpose: Rollback planning substrate tables
-- ============================================================================

-- Drop views
DROP VIEW IF EXISTS this_weeks_events;
DROP VIEW IF EXISTS todays_events;

-- Drop triggers
DROP TRIGGER IF EXISTS update_plan_templates_updated_at ON plan_templates;
DROP TRIGGER IF EXISTS update_daily_plans_updated_at ON daily_plans;
DROP TRIGGER IF EXISTS update_calendar_events_updated_at ON calendar_events;

-- Drop tables
DROP TABLE IF EXISTS plan_templates;
DROP TABLE IF EXISTS daily_plans;
DROP TABLE IF EXISTS calendar_events;

